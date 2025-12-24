import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { text, voice, lang } = req.query;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text parameter is required' });
    }

    try {
        const tts = new MsEdgeTTS();

        // Определяем голос на основе языка или переданного параметра
        // RU: ru-RU-SvetlanaNeural (Preferred)
        // ES: es-ES-AlvaroNeural or es-ES-ElviraNeural
        let selectedVoice = (voice as string) || '';

        if (!selectedVoice) {
            if (lang === 'ru') {
                selectedVoice = 'ru-RU-SvetlanaNeural';
            } else if (lang === 'es') {
                selectedVoice = 'es-ES-ElviraNeural';
            } else if (lang === 'en') {
                selectedVoice = 'en-US-AriaNeural';
            } else {
                // Default fallback
                selectedVoice = 'ru-RU-SvetlanaNeural';
            }
        }

        await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const readable = tts.toStream(text);

        // Установка заголовков для стриминга и кэширования
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Можно добавить Content-Length если бы мы знали размер, но мы стримим

        // Пайпим стрим в ответ
        readable.pipe(res);

        // Обработка ошибок в стриме
        readable.on('error', (err) => {
            console.error('TTS Stream Error:', err);
            if (!res.writableEnded) {
                res.status(500).end();
            }
        });

    } catch (error) {
        console.error('Edge TTS Error:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
}
