import { useEffect, useRef } from 'react';

export const useTestAudio = (
    voiceOver: boolean,
    currentQuestionText: string | undefined,
    language: 'ru' | 'es' | 'en' = 'es'
) => {
    const hasSpokenRef = useRef<string>('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fallbackTimeoutRef = useRef<any>(null);

    const getRussianVoice = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();

        const googleVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('ru'));
        if (googleVoice) return googleVoice;

        const exactRu = voices.find(v => v.lang === 'ru-RU' || v.lang === 'ru_RU');
        if (exactRu) return exactRu;

        return voices.find(v => v.lang.includes('ru'));
    };

    const playFallback = (text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        if (language === 'ru') {
            const ruVoice = getRussianVoice();
            if (ruVoice) {
                utterance.voice = ruVoice;
                utterance.lang = ruVoice.lang;
            } else {
                utterance.lang = 'ru-RU';
            }
            utterance.rate = 0.95;
        } else if (language === 'en') {
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
        } else {
            utterance.lang = 'es-ES';
            utterance.rate = 1.0;
        }

        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    };

    const stopAll = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };

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

        if (hasSpokenRef.current === currentQuestionText) return;

        stopAll();

        // Neural TTS Logic
        const playNeural = async () => {
            try {
                const url = `/api/tts?text=${encodeURIComponent(currentQuestionText)}&lang=${language}`;
                const audio = new Audio(url);
                audioRef.current = audio;

                // Устанавливаем предохранитель: если через 2.5 сек звук не начал играть, включаем робота
                fallbackTimeoutRef.current = setTimeout(() => {
                    if (audio.paused || audio.readyState < 3) {
                        console.warn('Neural TTS timeout, switching to fallback');
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
                    console.warn('Neural TTS error, switching to fallback');
                    stopAll();
                    playFallback(currentQuestionText);
                };

                await audio.play();
                hasSpokenRef.current = currentQuestionText;
            } catch (err) {
                console.warn('Neural TTS play failed:', err);
                stopAll();
                playFallback(currentQuestionText);
                hasSpokenRef.current = currentQuestionText;
            }
        };

        playNeural();

        return () => stopAll();
    }, [voiceOver, currentQuestionText, language]);

    useEffect(() => {
        return () => stopAll();
    }, []);
};
