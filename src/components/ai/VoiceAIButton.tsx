import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';
import { supabase } from '@/integrations/supabase/client';
import { useAIRequest } from '@/hooks/useAIRequest';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useAIChatStore } from '@/stores/useAIChatStore';
import { useTTS } from '@/hooks/useTTS';
import { cleanForSpeech } from '@/lib/speechUtils';
import type { TTSLang } from '@/lib/ttsEngine';
import { triggerHapticFeedback } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { Sparkles, X, ExternalLink, Mic, Volume2, VolumeX } from 'lucide-react';
import { AIMessageContent } from '@/components/ai/AIMessageContent';
import { useModalStore } from '@/store/modalStore';
import { toast } from 'sonner';

type VoiceState = 'idle' | 'recording' | 'processing' | 'responding' | 'response';

export interface AIVoiceContext {
    question: string;
    correctAnswer: string;
    userAnswer?: string;
    isCorrect: boolean;
    explanation?: string | null;
    explanationRu?: string | null;
    explanationEs?: string | null;
    explanationEn?: string | null;
    topic?: string;
    imageUrl?: string | null;
    country: 'spain' | 'russia';
}

interface VoiceAIButtonProps {
    context: AIVoiceContext;
    testLanguage: 'es' | 'en' | 'ru';
    onTap: () => void;
    showHintPulse?: boolean;
    className?: string;
}

const LONG_PRESS_MS = 500;

const pickMime = (): string => {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];
    const MR = (window as any).MediaRecorder;
    if (MR?.isTypeSupported) {
        for (const m of candidates) if (MR.isTypeSupported(m)) return m;
    }
    return '';
};

export const VoiceAIButton: React.FC<VoiceAIButtonProps> = ({
    context,
    testLanguage,
    onTap,
    showHintPulse = false,
    className,
}) => {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [responseText, setResponseText] = useState('');
    const [recordingSecs, setRecordingSecs] = useState(0);
    const [bubbleCoords, setBubbleCoords] = useState<{ top: number; left: number; arrowLeft: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, arrowLeft: 50, placement: 'top' });
    const [isMuted, setIsMuted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isPressing, setIsPressing] = useState(false);
    const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);

    const openModal = useModalStore((s) => s.openModal);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const didLongPressRef = useRef(false);
    const responseTextRef = useRef('');
    // Separate ref that accumulates RAW network chunks (not throttled typewriter output)
    // so addMessage always saves the complete response, even if typewriter hasn't finished yet
    const fullResponseRef = useRef('');

    const { sendRequest } = useAIRequest();
    const typewriter = useTypewriter({ charsPerSecond: 80 });
    const { refreshPermission: refreshMicrophonePermission, isDenied: isMicrophoneDenied, isUnsupported: isMicrophoneUnsupported } = useMicrophonePermission();

    const ttsLang: TTSLang = testLanguage === 'ru' ? 'ru' : (testLanguage === 'en' ? 'en' : 'es');
    const { speak, stop: stopTTS, isActive: isSpeaking } = useTTS(ttsLang);

    const lang = testLanguage;

    const cleanup = useCallback(() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (recordingInterval.current) { clearInterval(recordingInterval.current); recordingInterval.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        setRecordingSecs(0);
        stopTTS();
    }, [stopTTS]);

    useEffect(() => () => { cleanup(); typewriter.cancel(); }, [cleanup]);

    useEffect(() => {
        const seen = localStorage.getItem('skily-voice-hint-seen');
        if (!seen) {
            hintTimerRef.current = setTimeout(() => {
                setShowFirstTimeHint(true);
                hintTimerRef.current = setTimeout(() => {
                    setShowFirstTimeHint(false);
                    localStorage.setItem('skily-voice-hint-seen', '1');
                }, 3500);
            }, 800);
        }
        return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
    }, []);

    const updateBubbleCoords = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const bubbleWidth = 288;
        const margin = 12;
        const screenPadding = 16;

        let placement: 'top' | 'bottom' = 'top';
        if (rect.top < 250) placement = 'bottom';

        let left = rect.left + rect.width / 2 - bubbleWidth / 2;
        const minLeft = screenPadding;
        const maxLeft = window.innerWidth - bubbleWidth - screenPadding;
        const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

        const buttonCenterGlobal = rect.left + rect.width / 2;
        const arrowLeft = buttonCenterGlobal - clampedLeft;

        let top = placement === 'top' ? rect.top - margin : rect.bottom + margin;

        setBubbleCoords({ top, left: clampedLeft, arrowLeft, placement });
    }, []);

    useEffect(() => {
        if (voiceState === 'responding' || voiceState === 'response') {
            updateBubbleCoords();
            window.addEventListener('scroll', updateBubbleCoords, true);
            window.addEventListener('resize', updateBubbleCoords);
            return () => {
                window.removeEventListener('scroll', updateBubbleCoords, true);
                window.removeEventListener('resize', updateBubbleCoords);
            };
        }
    }, [voiceState, updateBubbleCoords]);

    const buildSystemPrompt = (): string => {
        const { country, question, correctAnswer, explanation, explanationRu } = context;
        const exp = lang === 'ru' ? (explanationRu || explanation) : explanation;
        if (country === 'russia') {
            return `Ты Skily — эксперт по ПДД РФ. Отвечай кратко (2-3 предложения максимум), понятным языком. Вопрос: "${question}". Правильный ответ: "${correctAnswer}".${exp ? ` Пояснение: ${exp}` : ''}`;
        }
        return `Eres Skily, experto en normas DGT. Responde brevemente (2-3 frases). Pregunta: "${question}". Respuesta correcta: "${correctAnswer}".${exp ? ` Explicación: ${exp}` : ''}`;
    };

    const handleRecordingStop = useCallback(async () => {
        const usedMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: usedMime });

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        if (blob.size < 2048) {
            toast.message(lang === 'ru' ? 'Слишком короткая запись' : 'Grabación muy corta');
            setVoiceState('idle');
            return;
        }

        setVoiceState('processing');

        let transcript = '';
        try {
            const ext = usedMime.includes('mp4') ? 'mp4' : usedMime.includes('ogg') ? 'ogg' : 'webm';
            const fd = new FormData();
            fd.append('file', blob, `voice.${ext}`);
            const { data, error } = await supabase.functions.invoke('speech-to-text', { body: fd });
            if (error) throw error;
            transcript = (data?.text || '').trim();
        } catch {
            toast.error(lang === 'ru' ? 'Не удалось распознать речь' : 'No se pudo reconocer la voz');
            setVoiceState('idle');
            return;
        }

        if (!transcript) {
            toast.message(lang === 'ru' ? 'Ничего не услышал — попробуй ещё раз' : 'No te escuché — inténtalo de nuevo');
            setVoiceState('idle');
            return;
        }

        setVoiceState('responding');
        setResponseText('');
        responseTextRef.current = '';
        fullResponseRef.current = '';
        triggerHapticFeedback('success');

        typewriter.start((slice) => {
            responseTextRef.current += slice;
            setResponseText(responseTextRef.current);
        });

        await sendRequest(
            {
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: transcript },
                ],
                country: context.country,
                language: lang,
                imageUrl: context.imageUrl || null,
            },
            {
                // Accumulate raw chunks — independent of typewriter throttle
                onChunk: (text) => { fullResponseRef.current += text; typewriter.push(text); },
                onDone: () => {
                    typewriter.finish();
                    setVoiceState('response');

                    // Sync to global chat store so AIChatWidget shows this conversation
                    const store = useAIChatStore.getState();
                    store.setQuestionContext(context);
                    store.addMessage({ role: 'user', content: transcript });
                    // Use fullResponseRef (complete network text) not responseTextRef (typewriter partial)
                    store.addMessage({ role: 'assistant', content: fullResponseRef.current || responseTextRef.current });

                    if (!isMuted) {
                        // fullResponseRef has complete network text; responseTextRef may be typewriter-partial
                        const cleaned = cleanForSpeech(fullResponseRef.current || responseTextRef.current);
                        if (cleaned) speak(cleaned, ttsLang);
                    }
                },
                onError: () => {
                    typewriter.cancel();
                    toast.error(lang === 'ru' ? 'Ошибка AI' : 'Error de AI');
                    setVoiceState('idle');
                },
                onLimitReached: () => { typewriter.cancel(); setVoiceState('idle'); },
            }
        );
    }, [lang, context, sendRequest, typewriter, isMuted, speak, ttsLang]);

    const startRecording = useCallback(async () => {
        didLongPressRef.current = true;
        triggerHapticFeedback('medium');
        stopTTS();

        const permission = await refreshMicrophonePermission();
        if (permission === 'unsupported') {
            toast.error(lang === 'ru' ? 'Этот браузер не поддерживает запись голоса' : 'Este navegador no admite grabación de voz');
            setVoiceState('idle');
            return;
        }
        if (permission === 'denied') {
            toast.error(lang === 'ru'
                ? 'Доступ к микрофону отключён в Safari. Разреши его в настройках сайта.'
                : 'El acceso al micrófono está bloqueado en Safari. Permítelo en los ajustes del sitio.');
            setVoiceState('idle');
            return;
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;
        } catch {
            toast.error(lang === 'ru' ? 'Нет доступа к микрофону' : 'No hay acceso al micrófono');
            setVoiceState('idle');
            return;
        }

        const mimeType = pickMime();
        const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        audioChunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.onstop = handleRecordingStop;
        mr.start();

        setVoiceState('recording');
        setRecordingSecs(0);
        recordingInterval.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
        triggerHapticFeedback('light');
    }, [lang, handleRecordingStop, stopTTS, refreshMicrophonePermission]);

    const stopRecording = useCallback(() => {
        if (recordingInterval.current) { clearInterval(recordingInterval.current); recordingInterval.current = null; }
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        if (voiceState !== 'idle') return;
        didLongPressRef.current = false;
        setIsPressing(true);
        if (showFirstTimeHint) {
            setShowFirstTimeHint(false);
            localStorage.setItem('skily-voice-hint-seen', '1');
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        }
        longPressTimer.current = setTimeout(() => startRecording(), LONG_PRESS_MS);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsPressing(false);
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (voiceState === 'recording') {
            stopRecording();
        } else if (!didLongPressRef.current) {
            onTap();
        }
    };

    const handlePointerCancel = () => {
        setIsPressing(false);
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (voiceState === 'recording') stopRecording();
    };

    const dismissResponse = useCallback(() => {
        typewriter.cancel();
        setVoiceState('idle');
        setResponseText('');
        responseTextRef.current = '';
        stopTTS();
    }, [typewriter, stopTTS]);

    const openFullChat = useCallback(() => {
        dismissResponse();
        // Open the chat as-is — voice messages were already added to the store in onDone.
        // Don't call openWithQuestion: that would append a divider + explanation after the
        // voice messages and auto-scroll to the explanation, making the voice conversation
        // look "not there". Instead just open the drawer at its current state.
        useAIChatStore.getState().openChat();
    }, [dismissResponse]);

    const isRecording = voiceState === 'recording';
    const isProcessing = voiceState === 'processing';
    const showResponse = voiceState === 'responding' || voiceState === 'response';
    const microphoneHint = isMicrophoneDenied
        ? (lang === 'ru'
            ? 'Микрофон выключен в Safari. Открой настройки сайта и включи доступ.'
            : 'El micrófono está bloqueado en Safari. Abre los ajustes del sitio y permite el acceso.')
        : isMicrophoneUnsupported
            ? (lang === 'ru'
                ? 'Этот браузер не поддерживает запись голоса.'
                : 'Este navegador no admite grabación de voz.')
            : '';

    const responseBubble = showResponse && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: bubbleCoords.placement === 'top' ? 10 : -10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.85, y: bubbleCoords.placement === 'top' ? 10 : -10, filter: 'blur(8px)', transition: { duration: 0.2 } }}
                style={{ 
                    position: 'fixed',
                    top: bubbleCoords.placement === 'top' ? 'auto' : bubbleCoords.top,
                    bottom: bubbleCoords.placement === 'top' ? (window.innerHeight - bubbleCoords.top) : 'auto',
                    left: bubbleCoords.left,
                    width: '288px',
                    zIndex: 9999
                }}
                className="pointer-events-auto origin-bottom"
            >
                <div className="relative p-[1.5px] bg-gradient-to-tr from-purple-500/60 via-blue-500/50 to-emerald-500/40 rounded-2xl shadow-2xl shadow-purple-500/25 drop-shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                    <div className="relative bg-zinc-950 dark:bg-[#0a0a0a] rounded-[15px] p-4 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />

                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-1.5">
                                <motion.div
                                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                </motion.div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                    Skily AI
                                </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button 
                                    onClick={() => setIsMuted(!isMuted)} 
                                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    {isMuted ? <VolumeX className="w-3 h-3 text-zinc-500" /> : <Volume2 className="w-3 h-3 text-purple-400" />}
                                </button>
                                <button onClick={openFullChat} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                    <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-zinc-200" />
                                </button>
                                <button onClick={dismissResponse} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-3 h-3 text-zinc-500 hover:text-zinc-200" />
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10 min-h-[2rem]">
                            {responseText ? (
                                <AIMessageContent
                                    content={responseText}
                                    className="text-xs text-zinc-200"
                                    onOpenPremium={() => openModal('PAYWALL', { trigger: 'ai_cta' })}
                                />
                            ) : (
                                <span className="text-xs text-zinc-500 italic">
                                    {lang === 'ru' ? 'Skily думает…' : 'Skily está pensando…'}
                                </span>
                            )}
                        </div>

                        {voiceState === 'response' && (
                            <motion.div
                                initial={{ scaleX: 1 }}
                                animate={{ scaleX: 0 }}
                                transition={{ duration: 9, ease: 'linear' }}
                                onAnimationComplete={dismissResponse}
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-blue-400 to-emerald-500 origin-left opacity-70"
                            />
                        )}
                    </div>
                    <div 
                        className={cn(
                            "absolute w-3 h-3 rotate-45 bg-zinc-950 border-r border-b border-white/10 shadow-lg z-0",
                            bubbleCoords.placement === 'top' ? "-bottom-1.5 border-r-purple-500/30 border-b-purple-500/30" : "-top-1.5 border-l border-t border-white/10 border-l-purple-500/30 border-t-purple-500/30"
                        )}
                        style={{ 
                            left: `${bubbleCoords.arrowLeft}px`,
                            transform: `translateX(-50%) rotate(45deg)`
                        }}
                    />
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );

    return (
        <div className={cn('relative group select-none', className)}>
            {responseBubble}

            <motion.button
                ref={buttonRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => { handlePointerCancel(); setIsHovered(false); }}
                onPointerLeave={() => { handlePointerCancel(); setIsHovered(false); }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                animate={isRecording ? { scale: 1.08 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={cn(
                    'relative h-12 w-auto px-3 rounded-xl flex items-center justify-center gap-2 shrink-0 overflow-visible touch-none',
                    'transition-colors duration-300',
                    isRecording
                        ? 'bg-red-500/15 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        : 'bg-transparent',
                    isProcessing && 'pointer-events-none opacity-75'
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <AnimatePresence>
                    {isRecording && (
                        <>
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="absolute inset-[-4px] rounded-xl border border-red-400/50"
                                    initial={{ scale: 1, opacity: 0.6 }}
                                    animate={{ scale: 1.6 + i * 0.25, opacity: 0 }}
                                    transition={{
                                        duration: 1.4,
                                        repeat: Infinity,
                                        delay: i * 0.38,
                                        ease: 'easeOut',
                                    }}
                                />
                            ))}
                        </>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {isRecording ? (
                        <motion.div
                            key="rec"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2"
                        >
                            <div className="relative shrink-0">
                                <Mic className="w-5 h-5 text-red-400" />
                                <motion.div
                                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"
                                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 0.7, repeat: Infinity }}
                                />
                            </div>
                            <div className="flex items-center gap-[2px]" style={{ height: 20 }}>
                                {[0.45, 0.75, 1, 0.65, 0.85, 0.5, 0.9, 0.6].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-[3px] rounded-full bg-red-400"
                                        animate={{ scaleY: [h, h * 0.25, h * 1.15, h * 0.4, h] }}
                                        transition={{
                                            duration: 0.75 + i * 0.07,
                                            repeat: Infinity,
                                            delay: i * 0.07,
                                            ease: 'easeInOut',
                                        }}
                                        style={{ height: 20, transformOrigin: 'center' }}
                                    />
                                ))}
                            </div>
                            <span className="text-red-400 text-[11px] font-mono font-bold tabular-nums">
                                {String(Math.floor(recordingSecs / 60)).padStart(2, '0')}:
                                {String(recordingSecs % 60).padStart(2, '0')}
                            </span>
                        </motion.div>
                    ) : isProcessing ? (
                        <motion.div
                            key="proc"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2"
                        >
                            <SkilyAICharacter size="sm" mood="happy" className="scale-75" />
                            <div className="flex items-center gap-[3px]">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-purple-400"
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.13 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center"
                        >
                            <SkilyAICharacter
                                size="sm"
                                mood={showHintPulse ? 'celebrating' : 'happy'}
                                className="scale-90 relative z-10"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {voiceState === 'idle' && (() => {
                    const r = 24;
                    const circ = 2 * Math.PI * r;
                    return (
                        <svg
                            className="absolute pointer-events-none"
                            style={{ width: 56, height: 56, top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', zIndex: 5 }}
                            viewBox="0 0 56 56"
                        >
                            <motion.circle
                                cx="28" cy="28" r={r}
                                fill="none"
                                stroke="rgb(99,102,241)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                initial={false}
                                animate={{
                                    strokeDashoffset: isPressing ? 0 : circ,
                                    opacity: isPressing ? 1 : 0,
                                }}
                                transition={
                                    isPressing
                                        ? { strokeDashoffset: { duration: LONG_PRESS_MS / 1000, ease: 'linear' }, opacity: { duration: 0.1 } }
                                        : { duration: 0.15 }
                                }
                                style={{ strokeDasharray: circ }}
                            />
                        </svg>
                    );
                })()}

            </motion.button>

            {showFirstTimeHint && voiceState === 'idle' && typeof document !== 'undefined' && createPortal(
                <motion.div
                    key="first-hint"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed pointer-events-none z-[10001]"
                    style={{
                        top: (buttonRef.current?.getBoundingClientRect().top ?? 0) - 52,
                        left: Math.max(16, Math.min(
                            (buttonRef.current?.getBoundingClientRect().left ?? 0) + (buttonRef.current?.getBoundingClientRect().width ?? 0) / 2,
                            (typeof window !== 'undefined' ? window.innerWidth : 400) - 180
                        )),
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="bg-indigo-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-indigo-400/40 shadow-xl shadow-indigo-500/40 whitespace-nowrap flex items-center gap-1.5">
                        <Mic className="w-3 h-3 shrink-0" />
                        <span>{lang === 'ru' ? 'Зажми — голосовой вопрос' : 'Mantén pulsado — pregunta por voz'}</span>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-b border-r border-indigo-400/40" />
                </motion.div>,
                document.body
            )}

            {voiceState === 'idle' && isHovered && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className={cn(
                            "fixed pointer-events-none whitespace-nowrap z-[10000] max-md:hidden",
                            "bg-zinc-950/90 backdrop-blur-xl text-white text-[10px] px-3 py-1.5 rounded-full border border-white/10 shadow-2xl"
                        )}
                        style={{
                            top: (buttonRef.current?.getBoundingClientRect().top || 0) - 40,
                            left: Math.max(16, Math.min(
                                (buttonRef.current?.getBoundingClientRect().left || 0) + (buttonRef.current?.getBoundingClientRect().width || 0) / 2,
                                window.innerWidth - 120
                            )),
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="opacity-70">{lang === 'ru' ? 'Клик — чат' : 'Click — chat'}</span>
                            <span className="w-1 h-1 rounded-full bg-indigo-500/40" />
                            <span className="font-medium text-indigo-300">{lang === 'ru' ? 'Удерживай — голос' : 'Mantén — voz'}</span>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {microphoneHint && (
                <div className="mt-2 max-md:text-[11px] text-[11px] leading-relaxed text-amber-300/90">
                    {microphoneHint}
                </div>
            )}
        </div>
    );
};
