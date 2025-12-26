import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';
import crypto from 'crypto';

// Форсируем Node.js runtime
export const config = {
    runtime: 'nodejs',
};

// Константы для авторизации Edge TTS (Актуально на декабрь 2025)
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

/**
 * Генерирует Sec-MS-GEC токен для обхода 401/403 ошибки (актуально для новых версий API)
 */
function generateSecMsGecToken(): string {
    // Windows File Time: количество 100-наносекундных интервалов с 1 января 1601 года
    const ticks = (BigInt(Date.now()) + BigInt(11644473600000)) * BigInt(10000);
    // Округляем до ближайших 5 минут (300 млрд тиков)
    const roundedTicks = ticks - (ticks % BigInt(3000000000));

    const strToHash = roundedTicks.toString() + TRUSTED_CLIENT_TOKEN;
    const hash = crypto.createHash('sha256').update(strToHash).digest('hex').toUpperCase();

    return hash;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const text = req.query.text as string;
    const lang = (req.query.lang as string) || 'ru';
    let voice = req.query.voice as string;

    if (!text) return res.status(400).json({ error: 'Missing text' });

    // Голоса по умолчанию
    if (!voice) {
        if (lang === 'ru') voice = 'ru-RU-SvetlanaNeural';
        else if (lang === 'es') voice = 'es-ES-ElviraNeural';
        else if (lang === 'en') voice = 'en-US-AriaNeural';
        else voice = 'ru-RU-SvetlanaNeural';
    }

    console.log('[TTS] Direct WS Request with Auth:', { text: text.substring(0, 30) + '...', voice, lang });

    try {
        const audioData = await generateAudio(text, voice, lang);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.status(200).send(audioData);
    } catch (error: any) {
        console.error('[TTS] Generation Error:', error);
        res.status(500).json({
            error: 'TTS Generation Failed',
            details: error.message,
            stack: error.stack
        });
    }
}

function generateAudio(text: string, voice: string, lang: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const requestId = uuidv4().replace(/-/g, '');
        const secMsGec = generateSecMsGecToken();

        // Формируем URL с новыми токенами безопасности
        const url = `${WSS_URL}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${requestId}`;

        const ws = new WebSocket(url, {
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
                'Origin': 'chrome-extension://jdjcneidgjecnbljhdnlejajmmonpeqb',
            }
        });

        const chunks: Buffer[] = [];
        const ssmlLang = lang === 'ru' ? 'ru-RU' : (lang === 'es' ? 'es-ES' : 'en-US');

        const timeout = setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else {
                ws.terminate();
            }
            reject(new Error('Timeout waiting for Edge TTS (15s)'));
        }, 15000);

        ws.on('open', () => {
            // 1. Send Config
            const configData = JSON.stringify({
                context: {
                    synthesis: {
                        audio: {
                            metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                        }
                    }
                }
            });
            ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${configData}`);

            // 2. Send Text (SSML)
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${ssmlLang}'><voice name='${voice}'><prosody rate='0%' pitch='0%'>${text}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`);
        });

        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                const buffer = data as Buffer;

                // CRITICAL FIX: Find the start of audio data
                // The header always ends with "Path:audio\r\n" followed by binary data
                const separator = "Path:audio\r\n";
                const headerIndex = buffer.indexOf(separator);

                if (headerIndex >= 0) {
                    let audioStart = headerIndex + separator.length;

                    // Additional safety: Find MP3 frame sync (0xFF followed by 0xFx)
                    // This ensures we skip any remaining metadata bytes
                    for (let i = audioStart; i < buffer.length - 1; i++) {
                        if (buffer[i] === 0xFF && (buffer[i + 1] & 0xE0) === 0xE0) {
                            // Found MPEG frame sync bytes (0xFF 0xE0-0xFF range)
                            audioStart = i;
                            break;
                        }
                    }

                    const audioPart = buffer.subarray(audioStart);
                    if (audioPart.length > 0) {
                        chunks.push(audioPart);
                    }
                }
                // NOTE: Chunks without "Path:audio" header are metadata frames - ignore them
            } else {
                const message = data.toString();
                if (message.includes('Path:turn.end')) {
                    ws.close();
                }
            }
        });

        ws.on('close', () => {
            clearTimeout(timeout);
            if (chunks.length > 0) {
                resolve(Buffer.concat(chunks));
            } else {
                reject(new Error('No audio received from Edge TTS'));
            }
        });

        ws.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}
