import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import {
    Bot,
    Send,
    X,
    MessageSquare,
    Sparkles,
    Loader2,
    Mic,
    MicOff,
    Languages,
    ThumbsUp,
    ThumbsDown,
    Zap,
    Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAIChatStore } from '@/stores/useAIChatStore';
import { useProfileData } from '@/hooks/useProfileData';
import { useUserContext } from '@/contexts/UserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { triggerHapticFeedback } from '@/lib/telegram';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStableViewportHeight } from '@/hooks/useStableViewportHeight';
import { cn } from '@/lib/utils';
import { generateAIChatPrompt } from '@/lib/ai-prompts';
import {
    Drawer,
    DrawerContent,
} from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useModalStore } from '@/store/modalStore';
import SkilyAICharacter from './SkilyAICharacter';
import AIChatMessage from './AIChatMessage';

export function AIChatWidget() {
    const isMobile = useIsMobile();
    const isOpen = useAIChatStore((state) => state.isOpen);
    const messages = useAIChatStore((state) => state.messages);
    const isLoading = useAIChatStore((state) => state.isLoading);
    const selectedCountry = useAIChatStore((state) => state.selectedCountry);
    const profileData = useProfileData().profileData;
    const { profileId } = useUserContext();
    const isPremium = profileData?.is_premium;
    const openModal = useModalStore((s) => s.openModal);

    const [limitReached, setLimitReached] = useState(false);

    const { data: aiUsage, refetch: refetchUsage } = useQuery({
        queryKey: ['ai-usage-limit', profileId],
        queryFn: async () => {
            if (!profileId) return null;
            const { data } = await supabase.rpc('check_ai_usage_limit', { p_user_id: profileId });
            return data?.[0] ?? null;
        },
        enabled: !!profileId && isOpen,
        staleTime: 0,
    });

    const aiLimit = aiUsage?.limit || 5;
    const aiUsed = aiUsage?.current_count ?? 0;
    const aiRemaining = Math.max(aiLimit - aiUsed, 0);

    const {
        closeChat,
        toggleTranslation,
        addMessage,
        updateLastMessage,
        setMessageRating,
        setLoading,
        conversationId,
        showTranslation,
        smartSuggestions,
        questionContext
    } = useAIChatStore();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const viewportHeight = useStableViewportHeight(isOpen);

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
                setIsRecording(false);
                setIsProcessingVoice(true);

                try {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voice.webm');
                    formData.append('language', selectedCountry === 'russia' ? 'ru' : 'es');

                    const { data, error } = await supabase.functions.invoke('speech-to-text', {
                        body: formData,
                    });

                    if (error) throw error;
                    if (data?.text) {
                        setInput(prev => (prev.trim() ? `${prev.trim()} ${data.text.trim()}` : data.text.trim()));
                        triggerHapticFeedback('success');
                        setTimeout(() => inputRef.current?.focus(), 150);
                    }
                } catch (err) {
                    toast.error('Не удалось распознать речь');
                    triggerHapticFeedback('error');
                } finally {
                    setIsProcessingVoice(false);
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            triggerHapticFeedback('light');
        } catch (err) {
            toast.error('Нет доступа к микрофону');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            triggerHapticFeedback('medium');
        }
    };

    const toggleVoiceInput = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!messagesEndRef.current) return;
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }, [messages, isLoading]);

    const currentProfileCountry = useProfileData().profileData?.preferred_country || 'russia';
    const baseInterfaceLanguage = showTranslation ? 'ru' : (questionContext?.testLanguage || 'es');
    const interfaceLanguage = currentProfileCountry === 'russia' ? 'ru' : baseInterfaceLanguage;

    const askAI = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return;

        setLoading(true);
        addMessage({ role: 'user', content: userMessage });

        const context = questionContext;
        const aiPrompt = generateAIChatPrompt(
            context ? {
                questionText: context.question || '',
                correctAnswer: context.correctAnswer || '',
                userAnswer: context.userAnswer,
                topic: context.topic,
                explanation: context.explanation ?? undefined,
                isCorrect: context.isCorrect,
                imageUrl: context.imageUrl,
            } : undefined,
            selectedCountry,
            profileData ? {
                name: profileData.first_name || profileData.username || 'Студент',
                xp: profileData.xp || 0,
                streak: profileData.streak_days || 0,
                prevWeakness: null,
            } : undefined,
            interfaceLanguage
        );

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            const allMessages = messages.map(m => ({ role: m.role, content: m.content }));
            allMessages.push({
                role: 'user' as const,
                content: messages.length === 0 ? aiPrompt + '\n\n' + userMessage : userMessage
            });

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    messages: allMessages,
                    country: selectedCountry,
                    mode: 'chat',
                    language: interfaceLanguage,
                }),
            });

            if (response.status === 429) {
                const errorData = await response.json();
                if (errorData.error === 'daily_limit_reached') {
                    triggerHapticFeedback('warning');
                    setLimitReached(true);
                    return;
                }
            }

            if (!response.ok) throw new Error('API Error');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            addMessage({ role: 'assistant', content: '' });

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) updateLastMessage(content);
                        } catch {}
                    }
                }
            }
            triggerHapticFeedback('success');
        } catch (error) {
            toast.error('Ошибка при получении ответа');
        } finally {
            setLoading(false);
            if (!isPremium) refetchUsage();
        }
    }, [messages, questionContext, interfaceLanguage, isLoading, isPremium, refetchUsage, addMessage, updateLastMessage, setLoading, selectedCountry, profileData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMessage = input.trim();
        setInput('');
        askAI(userMessage);
    };

    const chatContent = (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/10 shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <Bot className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="font-bold text-[15px] tracking-tight leading-tight">AI Помощник</span>
                        {isPremium ? (
                            <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.05em] mt-0.5">
                                <Crown className="w-2.5 h-2.5 fill-current" />
                                <span>Premium Ilimitado</span>
                            </div>
                        ) : aiUsage !== null ? (
                            <span className={cn(
                                "text-[10px] font-bold mt-0.5 transition-colors",
                                aiRemaining <= 1 ? "text-red-500 animate-pulse" : "text-slate-500 dark:text-slate-400"
                            )}>
                                {aiRemaining} / {aiLimit} {interfaceLanguage === 'ru' ? 'запросов' : 'mensajes'}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {questionContext?.explanationRu && (
                        <Button variant="ghost" size="sm" onClick={toggleTranslation} className="h-9 px-3 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400">
                            <Languages className="w-4 h-4 mr-2" />
                            <span className="text-xs font-bold">{showTranslation ? 'ES' : 'RU'}</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={closeChat} className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative bg-[#F5F8FF]/80 dark:bg-slate-900/40" style={{ WebkitOverflowScrolling: 'touch' }}>
                {messages.length === 0 && questionContext && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center py-8 px-4">
                        <SkilyAICharacter size="lg" />
                        <h3 className="text-xl font-bold mt-4 mb-2">{interfaceLanguage === 'ru' ? 'Привет! Я Skily' : '¡Hola! Soy Skily'}</h3>
                        <p className="text-muted-foreground text-sm max-w-[85%] mb-6 px-2">
                            {interfaceLanguage === 'ru' ? 'Нужна подсказка или объяснение?' : '¿Necesitas una pista o una explicación rápida?'}
                        </p>
                        <div className="flex flex-col w-full max-w-sm gap-3 px-2">
                            <Button variant="outline" className="w-full h-auto py-3 text-primary border-primary/20 hover:bg-primary/5 text-sm font-medium" onClick={() => askAI(interfaceLanguage === 'ru' ? 'Дай подсказку' : 'Dame una pista')}>
                                {interfaceLanguage === 'ru' ? 'Дай подсказку' : 'Dame una pista'}
                            </Button>
                            <Button variant="outline" className="w-full h-auto py-3 text-primary border-primary/20 hover:bg-primary/5 text-sm font-medium" onClick={() => askAI(interfaceLanguage === 'ru' ? 'Объясни это' : 'Ayúdame a entender esto')}>
                                {interfaceLanguage === 'ru' ? 'Объясни это' : 'Ayúdame a entender esto'}
                            </Button>
                        </div>
                    </motion.div>
                )}
                {messages.map((message, index) => (
                    <AIChatMessage key={index} message={message} isLast={index === messages.length - 1} onRating={(rating) => setMessageRating(index, rating)} />
                ))}
                {isLoading && <AIChatMessage message={{ role: 'assistant', content: '...' }} isLoading />}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {!limitReached && !isLoading && smartSuggestions.length > 0 && (
                <div className="px-4 py-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-t border-border/5">
                    <div className="flex flex-wrap gap-2 max-w-2xl mx-auto">
                        {smartSuggestions.map((suggestion, i) => (
                            <Button key={i} variant="outline" size="sm" onClick={() => askAI(suggestion)} className="rounded-full text-[13px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all h-9">
                                {suggestion}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            <div className="px-3 pt-3 pb-6 border-t border-border/10 shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl z-20" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 16px)' }}>
                <AnimatePresence mode="wait">
                    {limitReached && !isPremium ? (
                        <motion.div key="limit-cta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 dark:bg-slate-800/40 rounded-[24px] p-5 border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto w-full mb-2">
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="flex items-center gap-2 text-red-500 dark:text-red-400 font-bold">
                                    <Zap className="w-5 h-5 fill-current animate-pulse" />
                                    <span>{interfaceLanguage === 'ru' ? 'Лимит сообщений исчерпан' : 'Límite agotado'}</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {interfaceLanguage === 'ru' ? 'Для безлимитного общения со Skily перейди на Premium!' : '¡Para hablar con Skily sin límites, pásate a Premium!'}
                                </p>
                                <Button onClick={() => openModal('PAYWALL', { trigger: 'ai_chat_limit_inline' })} className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 text-white font-black h-12 rounded-xl shadow-lg shadow-orange-500/20 border-0">
                                    <Crown className="w-5 h-5 mr-2" />
                                    {interfaceLanguage === 'ru' ? 'РАЗБЛОКИРОВАТЬ PREMIUM' : 'DESBLOQUEAR PREMIUM'}
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.form key="chat-form" onSubmit={handleSubmit} className="flex gap-2 items-end max-w-2xl mx-auto w-full">
                            <div className="flex-1 relative">
                                <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={interfaceLanguage === 'ru' ? 'Напиши свой вопрос...' : 'Escribe tu pregunta...'} disabled={isLoading} className="w-full min-h-[48px] py-3 rounded-[24px] px-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all text-base" style={{ fontSize: '16px' }} />
                            </div>
                            <Button type="button" onClick={toggleVoiceInput} disabled={isLoading || isProcessingVoice} size="icon" variant="ghost" className={cn("h-12 w-12 shrink-0 rounded-full transition-all active:scale-90 relative overflow-hidden", isRecording ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                                {isProcessingVoice ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </Button>
                            <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className={cn("h-12 w-12 shrink-0 rounded-full shadow-lg transition-all active:scale-90", !input.trim() ? "bg-blue-500/50 text-white shadow-none" : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30")}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </Button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={(open) => !open && closeChat()} shouldScaleBackground={false}>
                <DrawerContent className="overflow-hidden flex flex-col focus:outline-none" style={{ height: viewportHeight > 0 ? `${viewportHeight}px` : '92dvh' }}>
                    {chatContent}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeChat()}>
            <DialogContent hideCloseButton className="w-screen h-screen max-w-none max-h-none m-0 p-0 flex flex-col bg-white/95 dark:bg-zinc-950/98 backdrop-blur-2xl border-none rounded-none">
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full shadow-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden my-0 sm:my-8 sm:rounded-2xl sm:border border-border/10">
                    {chatContent}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AIChatWidget;
