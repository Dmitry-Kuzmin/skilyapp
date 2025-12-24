import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

// Форсируем Node.js runtime
export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const text = req.query.text as string;
    const lang = (req.query.lang as string) || 'ru';
    let voice = req.query.voice as string;

    if (!text) return res.status(400).json({ error: 'Missing text' });

    // Default voices if not provided
    if (!voice) {
        if (lang === 'ru') voice = 'ru-RU-SvetlanaNeural';
        else if (lang === 'es') voice = 'es-ES-ElviraNeural';
        else if (lang === 'en') voice = 'en-US-AriaNeural';
        else voice = 'ru-RU-SvetlanaNeural';
    }

    console.log('[TTS] Direct WS Request:', { text: text.substring(0, 30) + '...', voice, lang });

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
        const ws = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4-EA85-453F-A512-E2DD024928A6');

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
                // Skip the header to get pure audio
                // The header ends with "Path:audio\r\n"
                const separator = "Path:audio\r\n";
                const index = buffer.indexOf(separator);
                if (index >= 0) {
                    const audioPart = buffer.subarray(index + separator.length);
                    chunks.push(audioPart);
                }
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
