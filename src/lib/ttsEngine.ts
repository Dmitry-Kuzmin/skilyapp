/**
 * TTS Engine — единый shared модуль озвучки текста для всего приложения.
 *
 * Используется:
 *  - useTestAudio (тестовая сессия, авто-озвучка вопросов/объяснений)
 *  - useTTS (универсальный hook для AI-чата и любых других мест)
 *
 * Архитектура:
 *  - Один глобальный AudioContext (Safari/iOS лимит)
 *  - Кеш AudioBuffer'ов по ключу `${lang}:${text}`
 *  - Сетевой запрос к Edge Function `tts` (Microsoft Edge Neural TTS)
 *  - Fallback на browser SpeechSynthesis при сетевой ошибке
 *  - Только один источник звука одновременно — новый speak() прерывает предыдущий
 */
export type TTSLang = 'ru' | 'es' | 'en';

let globalAudioCtx: AudioContext | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();
const inFlight = new Map<string, Promise<AudioBuffer>>();

let activeSource: AudioBufferSourceNode | null = null;
let activeAbort: AbortController | null = null;
const listeners = new Set<(speaking: boolean) => void>();

const emit = (speaking: boolean) => listeners.forEach((l) => l(speaking));

export const onSpeakingChange = (cb: (speaking: boolean) => void): (() => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

const getAudioContext = (): AudioContext => {
    if (!globalAudioCtx) {
        const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        globalAudioCtx = new Ctor();
    }
    return globalAudioCtx;
};

export const unlockAudioContext = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { /* ignore */ }
    }
};

const getSystemVoice = (language: TTSLang): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const targets: Record<TTSLang, string[]> = {
        ru: ['ru-RU', 'ru_RU', 'Google русский'],
        es: ['es-ES', 'es-SP', 'Google español'],
        en: ['en-US', 'en-GB', 'Google US English'],
    };
    for (const t of targets[language] || []) {
        const found = voices.find((v) => v.lang.includes(t) || v.name.includes(t));
        if (found) return found;
    }
    return voices.find((v) => v.lang.startsWith(language)) || null;
};

const playFallback = (text: string, language: TTSLang) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getSystemVoice(language);
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
    } else {
        utterance.lang = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'es-ES';
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => emit(true);
    utterance.onend = () => emit(false);
    utterance.onerror = () => emit(false);
    window.speechSynthesis.speak(utterance);
};

let apiFailed = false;

const fetchAudioBuffer = async (
    text: string,
    language: TTSLang,
    signal: AbortSignal,
): Promise<AudioBuffer> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = new URL(`${supabaseUrl}/functions/v1/tts`);
    url.searchParams.append('text', text);
    url.searchParams.append('lang', language);

    const response = await fetch(url.toString(), {
        headers: { apikey: anonKey },
        signal,
    });
    if (!response.ok) throw new Error(`TTS API ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    return await getAudioContext().decodeAudioData(arrayBuffer);
};

/**
 * Stop any currently-playing TTS (network or fallback).
 */
export const stopTTS = (): void => {
    if (activeAbort) {
        activeAbort.abort();
        activeAbort = null;
    }
    if (activeSource) {
        try { activeSource.stop(); } catch { /* already stopped */ }
        activeSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    emit(false);
};

/**
 * Озвучить текст. Прерывает любую текущую озвучку.
 * Возвращает promise, который резолвится когда воспроизведение завершилось
 * (или сразу после старта fallback'а, т.к. SpeechSynthesis асинхронен).
 */
export const speakTTS = async (rawText: string, language: TTSLang): Promise<void> => {
    const text = (rawText || '').trim();
    if (!text) return;

    stopTTS();

    if (apiFailed) {
        playFallback(text, language);
        return;
    }

    await unlockAudioContext();
    const ctx = getAudioContext();
    const cacheKey = `${language}:${text}`;

    try {
        let buffer = audioBufferCache.get(cacheKey);

        if (!buffer) {
            // Дедуплицируем параллельные запросы за тем же текстом
            let pending = inFlight.get(cacheKey);
            if (!pending) {
                activeAbort = new AbortController();
                const signal = activeAbort.signal;
                const timeoutId = setTimeout(() => activeAbort?.abort(), 15000);
                pending = fetchAudioBuffer(text, language, signal)
                    .finally(() => clearTimeout(timeoutId));
                inFlight.set(cacheKey, pending);
            }
            try {
                buffer = await pending;
                audioBufferCache.set(cacheKey, buffer);
            } finally {
                inFlight.delete(cacheKey);
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        activeSource = source;
        emit(true);

        await new Promise<void>((resolve) => {
            source.onended = () => {
                if (activeSource === source) activeSource = null;
                emit(false);
                resolve();
            };
            try {
                source.start(0);
            } catch {
                emit(false);
                resolve();
            }
        });
    } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('[TTS] network failed, using fallback:', err?.message);
        apiFailed = true;
        stopTTS();
        playFallback(text, language);
    } finally {
        activeAbort = null;
    }
};
