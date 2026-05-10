import { useEffect, useRef } from 'react';
import { onSpeakingChange, speakTTS, stopTTS, unlockAudioContext } from '@/lib/ttsEngine';
import { useTTSStore } from '@/store/useTTSStore';

/**
 * Hook for voice-over in tests.
 *
 * Делегирует всё воспроизведение в shared `ttsEngine`, который используется и в AI-чате,
 * чтобы любые улучшения качества озвучки автоматически применялись во всём приложении.
 */
export const useTestAudio = (
    voiceOver: boolean,
    currentQuestionText: string | undefined,
    language: 'ru' | 'es' | 'en' = 'es',
) => {
    const hasSpokenRef = useRef<string>('');
    const setSpeaking = useTTSStore((s) => s.setSpeaking);

    // Подписка на глобальное состояние "сейчас говорю" для индикаторов в UI.
    useEffect(() => onSpeakingChange(setSpeaking), [setSpeaking]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!voiceOver || !currentQuestionText) {
            stopTTS();
            return;
        }

        // Не повторять одну и ту же фразу
        if (hasSpokenRef.current === currentQuestionText) return;
        hasSpokenRef.current = currentQuestionText;

        speakTTS(currentQuestionText, language);

        return () => stopTTS();
    }, [voiceOver, currentQuestionText, language]);

    useEffect(() => () => stopTTS(), []);

    return { unlockAudio: unlockAudioContext };
};
