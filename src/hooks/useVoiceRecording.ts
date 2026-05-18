import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { triggerHapticFeedback } from '@/lib/telegram';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { supabase } from '@/integrations/supabase/client';

type UseVoiceRecordingOptions = {
    lang: 'ru' | 'es' | 'en';
    onTranscript: (text: string) => void;
    onLiveTranscript?: (text: string) => void;
    inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

const pickRecorderMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    const MR = typeof window !== 'undefined' && (window as any).MediaRecorder;
    if (MR?.isTypeSupported) {
        for (const m of candidates) if (MR.isTypeSupported(m)) return m;
    }
    return '';
};

export const useVoiceRecording = ({ lang, onTranscript, onLiveTranscript, inputRef }: UseVoiceRecordingOptions) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Stable refs for props to avoid stale closures in async callbacks
    const langRef = useRef(lang);
    langRef.current = lang;
    const onTranscriptRef = useRef(onTranscript);
    onTranscriptRef.current = onTranscript;
    const onLiveTranscriptRef = useRef(onLiveTranscript);
    onLiveTranscriptRef.current = onLiveTranscript;
    const inputRefRef = useRef(inputRef);
    inputRefRef.current = inputRef;

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
    const voiceBaselineRef = useRef('');
    const voiceFinalRef = useRef('');
    const srEnabledRef = useRef(false);
    const srFailedRef = useRef(false);

    const { refreshPermission, isDenied, isUnsupported } = useMicrophonePermission();

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop?.();
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const clearDraft = useCallback(() => {
        voiceBaselineRef.current = '';
        voiceFinalRef.current = '';
        srEnabledRef.current = false;
        srFailedRef.current = false;
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            triggerHapticFeedback('medium');
        }
    }, []);

    const startRecording = useCallback(async (baselineInput = '') => {
        const lang = langRef.current;
        const permission = await refreshPermission();

        if (permission === 'unsupported' || !navigator.mediaDevices?.getUserMedia) {
            toast.error(lang === 'ru' ? 'Браузер не поддерживает запись голоса' : lang === 'en' ? 'Browser does not support voice recording' : 'El navegador no soporta grabación de voz');
            return;
        }
        if (permission === 'denied') {
            toast.error(lang === 'ru'
                ? 'Доступ к микрофону отключён. Разреши в настройках сайта.'
                : lang === 'en'
                    ? 'Microphone access blocked. Allow it in site settings.'
                    : 'El acceso al micrófono está bloqueado. Permítelo en los ajustes del sitio.');
            return;
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;
        } catch (err: any) {
            const msg = err?.name === 'NotAllowedError'
                ? (lang === 'ru' ? 'Доступ к микрофону запрещён. Разрешите в настройках браузера.' : 'Microphone access denied. Allow it in browser settings.')
                : (lang === 'ru' ? 'Нет доступа к микрофону' : 'No microphone access');
            toast.error(msg);
            return;
        }

        const mimeType = pickRecorderMime();
        const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        audioChunksRef.current = [];
        voiceBaselineRef.current = baselineInput.trim();
        voiceFinalRef.current = '';
        srFailedRef.current = false;
        srEnabledRef.current = false;

        const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionCtor) {
            try {
                const recognition = new SpeechRecognitionCtor();
                recognition.lang = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'es-ES';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onresult = (event: any) => {
                    let interimTranscript = '';
                    let finalDelta = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const t = (event.results[i][0]?.transcript || '').trim();
                        if (!t) continue;
                        if (event.results[i].isFinal) finalDelta = finalDelta ? `${finalDelta} ${t}` : t;
                        else interimTranscript = interimTranscript ? `${interimTranscript} ${t}` : t;
                    }
                    if (finalDelta) {
                        voiceFinalRef.current = voiceFinalRef.current
                            ? `${voiceFinalRef.current} ${finalDelta}` : finalDelta;
                    }
                    const live = [voiceFinalRef.current, interimTranscript].filter(Boolean).join(' ').trim();
                    const combined = [voiceBaselineRef.current, live].filter(Boolean).join(' ').trim();
                    onLiveTranscriptRef.current?.(combined);
                };
                recognition.onerror = () => { srFailedRef.current = true; };
                recognition.onend = () => { recognitionRef.current = null; };
                recognitionRef.current = recognition;
                srEnabledRef.current = true;
                recognition.start();
            } catch {
                srEnabledRef.current = false;
            }
        }

        mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.onstop = async () => {
            const usedMime = mr.mimeType || mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: usedMime });
            stream.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            recognitionRef.current?.stop?.();
            recognitionRef.current = null;
            setIsRecording(false);

            const currentLang = langRef.current;

            if (audioBlob.size < 2048) {
                toast.message(currentLang === 'ru' ? 'Запись слишком короткая' : 'Grabación demasiado corta');
                return;
            }

            const liveTranscript = [voiceBaselineRef.current, voiceFinalRef.current].filter(Boolean).join(' ').trim();
            const useLive = srEnabledRef.current && !srFailedRef.current && liveTranscript;

            if (useLive) {
                onTranscriptRef.current(liveTranscript);
                triggerHapticFeedback('success');
                return;
            }

            setIsProcessingVoice(true);
            try {
                const ext = usedMime.includes('mp4') ? 'mp4' : usedMime.includes('ogg') ? 'ogg' : 'webm';
                const formData = new FormData();
                formData.append('file', audioBlob, `voice.${ext}`);
                const { data, error } = await supabase.functions.invoke('speech-to-text', { body: formData });
                if (error) throw error;
                const recognised = (data?.text || '').trim();
                if (recognised) {
                    const full = [voiceBaselineRef.current, recognised].filter(Boolean).join(' ').trim();
                    onTranscriptRef.current(full);
                    triggerHapticFeedback('success');
                    setTimeout(() => inputRefRef.current?.current?.focus(), 150);
                } else {
                    toast.message(currentLang === 'ru' ? 'Ничего не услышал — попробуйте ещё раз' : 'No te he entendido, inténtalo de nuevo');
                }
            } catch {
                toast.error(currentLang === 'ru' ? 'Не удалось распознать речь' : 'No se pudo reconocer la voz');
            } finally {
                setIsProcessingVoice(false);
            }
        };

        mr.start();
        setIsRecording(true);
        triggerHapticFeedback('light');
    }, [refreshPermission]);

    const toggleVoiceInput = useCallback((baselineInput = '') => {
        if (isRecording) stopRecording();
        else startRecording(baselineInput);
    }, [isRecording, startRecording, stopRecording]);

    return { isRecording, isProcessingVoice, startRecording, stopRecording, toggleVoiceInput, clearDraft, isDenied, isUnsupported };
};
