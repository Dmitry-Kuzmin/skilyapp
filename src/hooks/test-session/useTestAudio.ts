import { useEffect, useRef } from 'react';

// Кэш в памяти: текст -> data uri (Base64)
const audioCache = new Map<string, string>();

/**
 * Вспомогательная функция для конвертации ArrayBuffer в Base64.
 * Необходима для работы аудио в Telegram iOS (WKWebView).
 */
function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

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
    const abortControllerRef = useRef<AbortController | null>(null);

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
        for (const target of voices) {
            const isTarget = targets.some(t => target.lang.includes(t) || target.name.includes(target));
            if (isTarget) return target;
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
        // Отмена активного запроса
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
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
            const cacheKey = `${language}:${currentQuestionText}`;

            try {
                let audioDataUri = audioCache.get(cacheKey);

                if (!audioDataUri) {
                    abortControllerRef.current = new AbortController();
                    const response = await fetch(
                        `/api/tts?text=${encodeURIComponent(currentQuestionText)}&lang=${language}`,
                        { signal: abortControllerRef.current.signal }
                    );

                    if (!response.ok) throw new Error(`TTS API error: ${response.status}`);

                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = arrayBufferToBase64(arrayBuffer);
                    audioDataUri = `data:audio/mpeg;base64,${base64}`;
                    audioCache.set(cacheKey, audioDataUri);
                }

                const audio = new Audio(audioDataUri);
                audioRef.current = audio;

                // Предохранитель (Fallback Timeout):
                // Увеличиваем до 8 секунд, чтобы дождаться качественного голоса
                fallbackTimeoutRef.current = setTimeout(() => {
                    if (audio.paused || audio.readyState < 3) {
                        console.warn('[TTS] Neural timeout (8s), falling back to system voice');
                        stopAll();
                        playFallback(currentQuestionText);
                    }
                }, 8000);

                audio.onplay = () => {
                    if (fallbackTimeoutRef.current) {
                        clearTimeout(fallbackTimeoutRef.current);
                        fallbackTimeoutRef.current = null;
                    }
                };

                audio.onerror = () => {
                    console.error('[TTS] Audio element error, falling back...');
                    stopAll();
                    playFallback(currentQuestionText);
                };

                await audio.play();
                hasSpokenRef.current = currentQuestionText;
            } catch (err: any) {
                if (err.name === 'AbortError') return;

                console.warn('[TTS] Neural failed to play:', err);
                stopAll();
                playFallback(currentQuestionText);
                hasSpokenRef.current = currentQuestionText;
            } finally {
                abortControllerRef.current = null;
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
