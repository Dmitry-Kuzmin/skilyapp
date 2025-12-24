import { useEffect, useRef } from 'react';

/**
 * Хук для озвучки вопросов в тестах.
 * Приоритет: Neural TTS (Microsoft Edge API) -> Система (SpeechSynthesis)
 */
export const useTestAudio = (
    voiceOver: boolean,
    currentQuestionText: string | undefined,
    language: 'ru' | 'es' | 'en' = 'es'
) => {
    const hasSpokenRef = useRef<string>('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fallbackTimeoutRef = useRef<any>(null);

    // Вспомогательная функция для выбора системного голоса (fallback)
    const getSystemVoice = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();

        const langMap: Record<string, string[]> = {
            'ru': ['ru-RU', 'ru_RU', 'Google русский'],
            'es': ['es-ES', 'es-SP', 'Google español'],
            'en': ['en-US', 'en-GB', 'Google US English']
        };

        const targets = langMap[language] || [];
        for (const target of targets) {
            const voice = voices.find(v => v.lang.includes(target) || v.name.includes(target));
            if (voice) return voice;
        }

        return voices.find(v => v.lang.startsWith(language));
    };

    const playFallback = (text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getSystemVoice();

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else {
            utterance.lang = language === 'ru' ? 'ru-RU' : (language === 'en' ? 'en-US' : 'es-ES');
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    const stopAll = () => {
        // Остановка HTML5 Audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        // Очистка таймаута
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }
        // Остановка SpeechSynthesis
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };

    // Предзагрузка голосов
    useEffect(() => {
        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.getVoices();
            }
        };
        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!voiceOver || !currentQuestionText) {
            stopAll();
            return;
        }

        // Не озвучиваем тот же текст повторно
        if (hasSpokenRef.current === currentQuestionText) return;

        stopAll();

        const playNeuralTTS = async () => {
            try {
                const url = `/api/tts?text=${encodeURIComponent(currentQuestionText)}&lang=${language}`;
                const audio = new Audio(url);
                audioRef.current = audio;

                // Предохранитель (Fallback Timeout):
                // Если через 2.5 сек аудио не начало играть, включаем робота
                fallbackTimeoutRef.current = setTimeout(() => {
                    if (audio.paused || audio.readyState < 3) {
                        console.warn('[TTS] Neural timeout, falling back...');
                        stopAll();
                        playFallback(currentQuestionText);
                    }
                }, 2500);

                audio.onplay = () => {
                    if (fallbackTimeoutRef.current) {
                        clearTimeout(fallbackTimeoutRef.current);
                        fallbackTimeoutRef.current = null;
                    }
                };

                audio.onerror = () => {
                    console.error('[TTS] Neural error, falling back...');
                    stopAll();
                    playFallback(currentQuestionText);
                };

                await audio.play();
                hasSpokenRef.current = currentQuestionText;
            } catch (err) {
                console.warn('[TTS] Neural failed to play:', err);
                stopAll();
                playFallback(currentQuestionText);
                hasSpokenRef.current = currentQuestionText;
            }
        };

        playNeuralTTS();

        return () => stopAll();
    }, [voiceOver, currentQuestionText, language]);

    // Чистим при размонтировании
    useEffect(() => {
        return () => stopAll();
    }, []);
};
