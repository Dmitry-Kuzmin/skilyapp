
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Константы для авторизации Edge TTS
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

/**
 * Генерирует Sec-MS-GEC токен
 */
async function generateSecMsGecToken(): Promise<string> {
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

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        // Parse query params or body. Let's support both.
        let text = url.searchParams.get('text');
        let lang = url.searchParams.get('lang') || 'ru';
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

        // Default voices
        if (!voice) {
            if (lang === 'ru') voice = 'ru-RU-SvetlanaNeural';
            else if (lang === 'es') voice = 'es-ES-ElviraNeural';
            else if (lang === 'en') voice = 'en-US-AriaNeural';
            else voice = 'ru-RU-SvetlanaNeural';
        }

        console.log(`[TTS] Request: "${text.substring(0, 20)}..." (${lang}, ${voice})`);

        const audioData = await generateAudio(text, voice, lang);

        return new Response(audioData, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });

    } catch (error) {
        console.error('[TTS] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

function generateAudio(text: string, voice: string, lang: string): Promise<Uint8Array> {
    return new Promise(async (resolve, reject) => {
        const requestId = uuidv4().replace(/-/g, '');
        const secMsGec = await generateSecMsGecToken();

        const url = `${WSS_URL}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${requestId}`;

        const ws = new WebSocket(url);
        const chunks: Uint8Array[] = [];
        const ssmlLang = lang === 'ru' ? 'ru-RU' : (lang === 'es' ? 'es-ES' : 'en-US');

        // Timeout 15s
        const timeout = setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) ws.close();
            reject(new Error('Timeout waiting for Edge TTS'));
        }, 15000);

        ws.onopen = () => {
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
            ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);

            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${ssmlLang}'><voice name='${voice}'><prosody rate='0%' pitch='0%'>${text}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`);
        };

        ws.onmessage = (event) => {
            const data = event.data;
            if (data instanceof ArrayBuffer || data instanceof Blob) {
                // Handle binary data
                // Deno WebSocket might return Blob or ArrayBuffer depending on config, but standard is Blob? 
                // Actually in Deno standard WebSocket, binaryType defaults to "blob". 
                // But we can set it to "arraybuffer".
                // Let's handle both or explicitly set binaryType.
                // Wait, `WebSocket` in Deno Deploy typically returns Blob.

                // Let's assume Blob and convert.
                // Wait, Deno's WebSocket implementation aligns with web.
                // We need to read it.
                handleBinary(data);
            } else if (typeof data === 'string') {
                if (data.includes('Path:turn.end')) {
                    ws.close();
                }
            }
        };

        // Helper to process binary data
        const handleBinary = async (data: any) => {
            let buffer: Uint8Array;
            if (data instanceof Blob) {
                buffer = new Uint8Array(await data.arrayBuffer());
            } else {
                buffer = new Uint8Array(data);
            }

            // Search for Path:audio\r\n
            // "Path:audio\r\n" in bytes: 50 61 74 68 3a 61 75 64 69 6f 0d 0a
            const separator = new TextEncoder().encode("Path:audio\r\n");

            // Simple naive search
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

        ws.onclose = () => {
            clearTimeout(timeout);
            if (chunks.length > 0) {
                // Concat all chunks
                const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                resolve(result);
            } else {
                reject(new Error('No audio received'));
            }
        };

        ws.onerror = (e) => {
            clearTimeout(timeout);
            console.error('WebSocket Error:', e);
            // ws.onerror event usually doesn't contain error details in standard WebSocket
            reject(new Error('WebSocket connection error'));
        };
    });
}
