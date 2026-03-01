
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Константы для авторизации Edge TTS
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = `wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=${TRUSTED_CLIENT_TOKEN}`;
const EDGE_VERSION = '143.0.3650.75'; // На базе Chromium 143 (март 2026)

/**
 * Генерирует Sec-MS-GEC токен
 */
async function generateSecMsGecToken(): Promise<string> {
    // Windows file time: ticks since 1601-01-01
    const ticks = (BigInt(Date.now()) + BigInt(11644473600000)) * BigInt(10000);
    // Округляем до ближайших 5 минут (300 млрд тиков)
    const roundedTicks = ticks - (ticks % BigInt(3000000000));
    const strToHash = roundedTicks.toString() + TRUSTED_CLIENT_TOKEN;

    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string uppercase
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    return hashHex;
}

// Generate UUID v4
function uuidv4() {
    return crypto.randomUUID();
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        // Parse query params or body
        let text = url.searchParams.get('text');
        let lang = url.searchParams.get('lang') || 'es'; // Default to Spanish as requested
        let voice = url.searchParams.get('voice');

        if (!text) {
            try {
                const body = await req.json();
                text = body.text;
                lang = body.lang || lang;
                voice = body.voice || voice;
            } catch (e) {
                // ignore
            }
        }

        if (!text) {
            return new Response(JSON.stringify({ error: 'Missing text' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ПДД термины обычно на испанском или русском
        if (!voice) {
            if (lang === 'ru') voice = 'ru-RU-SvetlanaNeural';
            else if (lang === 'es') voice = 'es-ES-ElviraNeural';
            else if (lang === 'en') voice = 'en-US-AriaNeural';
            else voice = 'es-ES-ElviraNeural';
        }

        console.log(`[TTS] Request: "${text.substring(0, 30)}..." (${lang}, ${voice})`);

        const audioData = await generateAudio(text, voice, lang);

        return new Response(audioData, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff'
            }
        });

    } catch (error: any) {
        console.error('[TTS] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

function generateAudio(text: string, voice: string, lang: string): Promise<Uint8Array> {
    return new Promise(async (resolve, reject) => {
        try {
            const requestId = uuidv4().replace(/-/g, '');
            const secMsGec = await generateSecMsGecToken();

            const url = `${WSS_URL}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-${EDGE_VERSION}&ConnectionId=${requestId}`;

            // Используем Node-совместимый WebSocket через npm:ws для передачи заголовков Origin и User-Agent,
            // что критически важно для обхода новых проверок Microsoft.
            // @ts-ignore
            const { default: WebSocket } = await import("npm:ws");

            const ws = new WebSocket(url, {
                headers: {
                    'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${EDGE_VERSION.split('.')[0]}.0.0.0 Safari/537.36 Edg/${EDGE_VERSION}`
                }
            });
            const chunks: Uint8Array[] = [];
            const ssmlLang = lang === 'ru' ? 'ru-RU' : (lang === 'es' ? 'es-ES' : 'en-US');

            // Timeout 15s
            const timeout = setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.close();
                reject(new Error('Timeout waiting for Edge TTS (15s)'));
            }, 15000);

            ws.onopen = () => {
                const timestamp = new Date().toUTCString();
                const config = JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                                outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                            }
                        }
                    }
                });
                ws.send(`X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);

                const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${ssmlLang}'><voice name='${voice}'><prosody rate='0%' pitch='0%'>${text}</prosody></voice></speak>`;
                ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n${ssml}`);
            };

            ws.onmessage = async (event) => {
                const data = event.data;
                if (data instanceof Blob) {
                    const buffer = new Uint8Array(await data.arrayBuffer());
                    handleBinary(buffer);
                } else if (data instanceof ArrayBuffer) {
                    const buffer = new Uint8Array(data);
                    handleBinary(buffer);
                } else if (Buffer && Buffer.isBuffer(data)) {
                    // Обработка npm:ws Buffer формата
                    handleBinary(new Uint8Array(data));
                } else if (typeof data === 'string') {
                    if (data.includes('Path:turn.end')) {
                        ws.close();
                    } else if (data.includes('Path:turn.start')) {
                        // Just started
                    }
                }
            };

            // Helper to process binary data
            const handleBinary = (buffer: Uint8Array) => {
                const separator = new TextEncoder().encode("Path:audio\r\n");
                let headerIndex = -1;
                for (let i = 0; i < buffer.length - separator.length; i++) {
                    let match = true;
                    for (let j = 0; j < separator.length; j++) {
                        if (buffer[i + j] !== separator[j]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) {
                        headerIndex = i;
                        break;
                    }
                }

                if (headerIndex >= 0) {
                    const audioStart = headerIndex + separator.length;
                    const audioPart = buffer.slice(audioStart);
                    if (audioPart.length > 0) {
                        chunks.push(audioPart);
                    }
                }
            };

            ws.onclose = (event) => {
                clearTimeout(timeout);
                if (chunks.length > 0) {
                    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
                    const result = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of chunks) {
                        result.set(chunk, offset);
                        offset += chunk.length;
                    }
                    resolve(result);
                } else {
                    console.error('[TTS] WebSocket closed without audio. Code:', event.code, 'Reason:', event.reason);
                    reject(new Error(`No audio received from Edge (Code: ${event.code})`));
                }
            };

            ws.onerror = (e) => {
                clearTimeout(timeout);
                console.error('[TTS] WebSocket Error:', e);
                reject(new Error('WebSocket connection failed'));
            };
        } catch (e) {
            reject(e);
        }
    });
}
