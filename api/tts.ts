import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Форсируем Node.js runtime для совместимости с WebSocket в msedge-tts
export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const text = req.query.text as string;
    const voice = req.query.voice as string;
    const lang = req.query.lang as string;

    console.log('[TTS] Request received:', { text: text?.substring(0, 30) + '...', voice, lang });

    if (!text) {
        return res.status(400).json({ error: 'Text parameter is required' });
    }

    try {
        const tts = new MsEdgeTTS();

        // Голоса согласно ТЗ:
        // RU: ru-RU-SvetlanaNeural (Female) или ru-RU-DmitryNeural (Male)
        // ES: es-ES-ElviraNeural (Female) или es-ES-AlvaroNeural (Male)
        let selectedVoice = voice;

        if (!selectedVoice) {
            if (lang === 'ru') {
                selectedVoice = 'ru-RU-SvetlanaNeural';
            } else if (lang === 'es') {
                selectedVoice = 'es-ES-ElviraNeural';
            } else if (lang === 'en') {
                selectedVoice = 'en-US-AriaNeural';
            } else {
                selectedVoice = 'ru-RU-SvetlanaNeural';
            }
        }

        console.log('[TTS] Using voice:', selectedVoice);

        await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // Получаем стрим
        const readable = tts.toStream(text);

        // Заголовки: audio/mpeg и агрессивное кэширование
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Пайпим поток в ответ
        readable.pipe(res);

        // Обработка событий стрима
        readable.on('end', () => {
            console.log('[TTS] Streaming finished successfully');
        });

        readable.on('error', (err) => {
            console.error('[TTS API] Stream Error:', err);
            if (!res.writableEnded) {
                res.status(500).end();
            }
        });

    } catch (error: any) {
        console.error('[TTS API] CRITICAL ERROR:', error);
        if (!res.writableEnded) {
            res.status(500).json({
                error: 'Internal Server Error',
                details: error?.message || 'Unknown error',
                stack: error?.stack,
                env: process.env.NODE_ENV
            });
        }
    }
}
