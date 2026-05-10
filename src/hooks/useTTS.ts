import { useCallback, useEffect, useRef, useState } from 'react';
import { onSpeakingChange, speakTTS, stopTTS, unlockAudioContext, type TTSLang } from '@/lib/ttsEngine';

/**
 * Универсальный TTS hook. Используется в AI-чате и любых других местах
 * для озвучки текста. Внутри — тот же `ttsEngine`, что и `useTestAudio`,
 * поэтому улучшения движка автоматически подхватятся во всём приложении.
 *
 * Возвращает:
 *   speak(text, lang?)   — озвучить (прерывает предыдущую)
 *   stop()               — остановить
 *   isSpeaking           — играет ли сейчас озвучка
 *   activeId             — id текущего "источника" (для подсветки кнопки в UI)
 *   isActive(id)         — удобный селектор: этот ли id сейчас играет
 */
export const useTTS = (defaultLang: TTSLang = 'ru') => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeIdRef = useRef<string | null>(null);

    useEffect(() => {
        return onSpeakingChange((speaking) => {
            setIsSpeaking(speaking);
            if (!speaking) {
                activeIdRef.current = null;
                setActiveId(null);
            }
        });
    }, []);

    const stop = useCallback(() => {
        stopTTS();
        activeIdRef.current = null;
        setActiveId(null);
    }, []);

    const speak = useCallback(
        async (text: string, lang: TTSLang = defaultLang, id?: string) => {
            const trimmed = (text || '').trim();
            if (!trimmed) return;

            // Toggle: тот же id — стоп
            if (id && activeIdRef.current === id) {
                stop();
                return;
            }

            await unlockAudioContext();
            const nextId = id ?? `speech-${Date.now()}`;
            activeIdRef.current = nextId;
            setActiveId(nextId);
            await speakTTS(trimmed, lang);
        },
        [defaultLang, stop],
    );

    const isActive = useCallback((id: string) => activeId === id && isSpeaking, [activeId, isSpeaking]);

    useEffect(() => () => stopTTS(), []);

    return { speak, stop, isSpeaking, activeId, isActive };
};
