import { useEffect, useRef, useCallback } from 'react';

// Global AudioContext to persist across re-renders and avoid multiple instances
let globalAudioCtx: AudioContext | null = null;

// Cache for decoded audio buffers (more efficient than base64 strings)
const audioBufferCache = new Map<string, AudioBuffer>();

/**
 * Helper to get or create the global AudioContext.
 * Uses webkit prefix for Safari compatibility.
 */
const getAudioContext = (): AudioContext => {
    if (!globalAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        globalAudioCtx = new AudioContextClass();
    }
    return globalAudioCtx;
};

/**
 * CRITICAL: Unlock/Resume AudioContext on user interaction.
 * Safari and Chrome suspend AudioContext until user interaction.
 * Must be called BEFORE any async operations (fetch, etc.)
 */
const unlockAudioContext = async (): Promise<void> => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
            console.log('[TTS] AudioContext resumed successfully');
        } catch (e) {
            console.warn('[TTS] Failed to resume AudioContext:', e);
        }
    }
};

/**
 * Hook for voice-over in tests.
 * Uses Web Audio API to solve Safari/Chrome autoplay policy issues.
 * Priority: Neural TTS (Edge API) -> System (SpeechSynthesis fallback)
 */
export const useTestAudio = (
    voiceOver: boolean,
    currentQuestionText: string | undefined,
    language: 'ru' | 'es' | 'en' = 'es'
) => {
    const hasSpokenRef = useRef<string>('');
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isPlayingRef = useRef(false);
    const lastRequestTimeRef = useRef<number>(0);

    // Get system voice for fallback
    const getSystemVoice = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();

        const langMap: Record<string, string[]> = {
            'ru': ['ru-RU', 'ru_RU', 'Google русский'],
            'es': ['es-ES', 'es-SP', 'Google español'],
            'en': ['en-US', 'en-GB', 'Google US English']
        };

        const targets = langMap[language] || [];
        for (const target of targets) {
            const found = voices.find(v => v.lang.includes(target) || v.name.includes(target));
            if (found) return found;
        }

        return voices.find(v => v.lang.startsWith(language));
    }, [language]);

    // Fallback to SpeechSynthesis (robot voice)
    const playFallback = useCallback((text: string) => {
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
    }, [getSystemVoice, language]);

    // Stop all audio playback
    const stopAll = useCallback(() => {
        // Abort pending fetch
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Stop Web Audio source
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch {
                // Ignore - might already be stopped
            }
            sourceNodeRef.current = null;
        }

        // Stop SpeechSynthesis
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        isPlayingRef.current = false;
    }, []);

    // Preload system voices
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

    const apiFailedRef = useRef(false);

    // Main effect for playing audio
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!voiceOver || !currentQuestionText) {
            stopAll();
            return;
        }

        // Don't repeat the same text
        if (hasSpokenRef.current === currentQuestionText) return;

        stopAll();

        const playWithWebAudio = async () => {
            // Circuit breaker: if API failed previously, use fallback immediately
            if (apiFailedRef.current) {
                console.log('[TTS] Circuit breaker active: using fallback immediately');
                playFallback(currentQuestionText);
                hasSpokenRef.current = currentQuestionText;
                return;
            }

            // Rate limiting: prevent rapid-fire requests (e.g., user skipping fast)
            const now = Date.now();
            if (lastRequestTimeRef.current && (now - lastRequestTimeRef.current < 1000)) {
                console.log('[TTS] Rate limited (skipping fetch)');
                return;
            }
            lastRequestTimeRef.current = now;

            const cacheKey = `${language}:${currentQuestionText}`;
            isPlayingRef.current = true;

            try {
                // 1. CRITICAL: Resume AudioContext IMMEDIATELY (sync with user interaction)
                // This preserves the "user gesture token" before any async operations
                await unlockAudioContext();

                const ctx = getAudioContext();
                let audioBuffer = audioBufferCache.get(cacheKey);

                // 2. Fetch audio if not cached
                if (!audioBuffer) {
                    abortControllerRef.current = new AbortController();

                    // Timeout for fetch to fallback quicker
                    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 5000);


                    try {
                        // Switch to Supabase Edge Function
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

                        const url = new URL(`${supabaseUrl}/functions/v1/tts`);
                        url.searchParams.append('text', currentQuestionText);
                        url.searchParams.append('lang', language);

                        const response = await fetch(url.toString(), {
                            headers: {
                                'apikey': anonKey
                            },
                            signal: abortControllerRef.current.signal
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            throw new Error(`TTS API error: ${response.status}`);
                        }

                        const arrayBuffer = await response.arrayBuffer();
                        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                        audioBufferCache.set(cacheKey, audioBuffer);
                    } catch (fetchError) {
                        clearTimeout(timeoutId);
                        throw fetchError;
                    }
                }

                // 4. Create and play source node
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                sourceNodeRef.current = source;
                source.start(0);

                hasSpokenRef.current = currentQuestionText;

                source.onended = () => {
                    isPlayingRef.current = false;
                    sourceNodeRef.current = null;
                };

            } catch (err: any) {
                if (err.name === 'AbortError') {
                    isPlayingRef.current = false;
                    return;
                }

                console.warn('[TTS] Web Audio failed, falling back to SpeechSynthesis:', err.message);

                // Mark API as failed so subsequent requests use fallback immediately
                apiFailedRef.current = true;

                stopAll();
                playFallback(currentQuestionText);
                hasSpokenRef.current = currentQuestionText;
            } finally {
                abortControllerRef.current = null;
            }
        };

        playWithWebAudio();

        return () => stopAll();
    }, [voiceOver, currentQuestionText, language, stopAll, playFallback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopAll();
    }, [stopAll]);

    // Expose unlock function for manual triggering on user interaction
    return { unlockAudio: unlockAudioContext };
};
