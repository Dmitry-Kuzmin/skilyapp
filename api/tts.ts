import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { text, voice, lang } = req.query;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text parameter is required' });
    }

    try {
        const tts = new MsEdgeTTS();

        // Голоса согласно ТЗ:
        // RU: ru-RU-SvetlanaNeural (Female) или ru-RU-DmitryNeural (Male)
        // ES: es-ES-ElviraNeural (Female) или es-ES-AlvaroNeural (Male)
        let selectedVoice = (voice as string);

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

        await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // Получаем стрим
        const readable = tts.toStream(text);

        // Заголовки: audio/mpeg и агрессивное кэширование (на 1 год) для экономии трафика
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Пайпим поток в ответ
        readable.pipe(res);

        // Обработка ошибок в потоке
        readable.on('error', (err) => {
            console.error('[TTS API] Stream Error:', err);
            if (!res.writableEnded) {
                res.status(500).end();
            }
        });

    } catch (error) {
        console.error('[TTS API] General Error:', error);
        if (!res.writableEnded) {
            res.status(500).json({ error: 'Failed to generate neural speech' });
        }
    }
}
