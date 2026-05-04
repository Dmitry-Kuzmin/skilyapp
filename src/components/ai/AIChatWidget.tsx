import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { 
    Send, 
    X, 
    Bot, 
    Crown, 
    Zap, 
    Mic, 
    MicOff, 
    Loader2, 
    ThumbsUp, 
    ThumbsDown,
    Languages,
    Sparkles
} from 'lucide-react';
import { useAIChatStore, selectIsOpen, selectMessages, selectIsLoading, selectQuestionContext } from '@/stores/useAIChatStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfileData } from '@/hooks/useProfileData';
import { usePDDContext } from '@/contexts/PDDContext';
import { usePremium } from '@/hooks/usePremium';
import { useUserContext } from '@/contexts/UserContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { isTelegramMiniApp, triggerHapticFeedback } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Dialog, 
    DialogContent 
} from '@/components/ui/dialog';
import { 
    Drawer, 
    DrawerContent 
} from '@/components/ui/drawer';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AILimitReachedModal } from '@/components/ai/AILimitReachedModal';
import { generateAIChatPrompt } from '@/lib/ai-prompts';
import ReactMarkdown from 'react-markdown';
import { useModalStore } from '@/store/modalStore';

// Реактивный хук для стабильной высоты viewport
function useStableViewportHeight(isOpen: boolean) {
    const [height, setHeight] = useState(() => window.visualViewport?.height ?? window.innerHeight);
    const isTelegram = isTelegramMiniApp();

    useEffect(() => {
        if (!isOpen) return;

        const update = () => {
            if (isTelegram && window.Telegram?.WebApp?.viewportHeight) {
                setHeight(window.Telegram.WebApp.viewportHeight);
            } else {
                setHeight(window.visualViewport?.height ?? window.innerHeight);
            }
        };

        update();

        const tg = isTelegram ? window.Telegram?.WebApp : null;
        if (tg) {
            tg.onEvent('viewportChanged', update);
            return () => tg.offEvent('viewportChanged', update);
        }

        const vv = window.visualViewport;
        if (vv) {
            vv.addEventListener('resize', update);
            return () => vv.removeEventListener('resize', update);
        }

        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [isOpen, isTelegram]);

    return height;
}

export function AIChatWidget() {
    const isMobile = useIsMobile();
    const isTelegram = isTelegramMiniApp();
    const { t } = useLanguage();
    const { profileData } = useProfileData();
    const { selectedCountry } = usePDDContext();
    const { isPremium } = usePremium();
    const { profileId } = useUserContext();
    const openModal = useModalStore((s) => s.openModal);

    // Zustand Store
    const isOpen = useAIChatStore(selectIsOpen);
    const messages = useAIChatStore(selectMessages);
    const isLoading = useAIChatStore(selectIsLoading);
    const questionContext = useAIChatStore(selectQuestionContext);
    const showTranslation = useAIChatStore((s) => s.showTranslation);
    
    const [limitModalOpen, setLimitModal] = useState(false);
    const [limitData, setLimitData] = useState({ currentCount: 0, limit: 5, message: '' });

    // Счётчик оставшихся AI-сообщений
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
    } = useAIChatStore();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Стабильная высота viewport
    const viewportHeight = useStableViewportHeight(isOpen);

    // Voice Input State
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
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const mimeType = mediaRecorder.mimeType;
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
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
                        setInput(prev => prev ? `${prev} ${data.text.trim()}` : data.text.trim());
                        triggerHapticFeedback('success');
                    }
                } catch (err) {
                    toast.error('Не удалось распознать речь');
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

    // Фокус на input
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    // Автоскролл
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
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: aiPrompt },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMessage }
                    ],
                    conversationId,
                    profileId,
                }),
            });

            if (response.status === 429) {
                const errorData = await response.json();
                setLimitData({
                    currentCount: errorData.current_count || 5,
                    limit: errorData.limit || 5,
                    message: errorData.message || ''
                });
                setLimitModal(true);
                setLoading(false);
                return;
            }

            if (!response.ok || !response.body) throw new Error('Failed to fetch');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

            addMessage({ role: 'assistant', content: '' });

            while (true) {
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
                            if (content) {
                                assistantMessage += content;
                                updateLastMessage(assistantMessage);
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (err) {
            toast.error('Ошибка при обращении к ИИ');
        } finally {
            setLoading(false);
            if (!isPremium) refetchUsage();
        }
    }, [messages, conversationId, profileId, questionContext, selectedCountry, profileData, interfaceLanguage, isLoading, addMessage, setLoading, updateLastMessage, isPremium, refetchUsage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const msg = input.trim();
        setInput('');
        askAI(msg);
    };

    const chatContent = (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950 relative overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/10 flex items-center justify-between shrink-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold leading-none tracking-tight flex items-center gap-2">
                            Skily AI
                        </h2>
                        {isPremium ? (
                            <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-1">
                                <Crown className="w-2.5 h-2.5 fill-current" />
                                <span>Premium Ilimitado</span>
                            </div>
                        ) : aiUsage !== null ? (
                            <span className={cn(
                                "text-[10px] font-bold mt-1 transition-colors",
                                aiRemaining <= 1 ? "text-red-500 animate-pulse" : "text-slate-500 dark:text-slate-400"
                            )}>
                                {aiRemaining} / {aiLimit} {interfaceLanguage === 'ru' ? 'сообщений' : 'mensajes'}
                            </span>
                        ) : (
                            <p className="text-[10px] text-muted-foreground mt-1">AI Instructor</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={toggleTranslation}
                    >
                        <Languages className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500"
                        onClick={closeChat}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 py-4 z-10">
                <div className="max-w-2xl mx-auto space-y-6 pb-20">
                    {messages.length === 0 && !questionContext && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <SkilyAICharacter size="lg" mood="happy" />
                            <p className="text-muted-foreground mt-4 font-medium italic">
                                {interfaceLanguage === 'ru' ? 'Задай мне любой вопрос по ПДД!' : '¡Pregúntame cualquier cosa sobre el reglamento!'}
                            </p>
                        </div>
                    )}
                    
                    {messages.map((message, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex w-full",
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            <Card className={cn(
                                "max-w-[85%] p-4 shadow-sm",
                                message.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none border-none'
                                    : 'bg-slate-100 dark:bg-slate-900 border-none rounded-2xl rounded-tl-none'
                            )}>
                                <MarkdownContent className={cn(
                                    "text-sm leading-relaxed",
                                    message.role === 'user' ? "text-white" : "text-slate-800 dark:text-slate-200"
                                )}>
                                    {message.content}
                                </MarkdownContent>
                                {message.role === 'assistant' && message.content && (
                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10"
                                            onClick={() => setMessageRating(idx, 1)}
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10"
                                            onClick={() => setMessageRating(idx, -1)}
                                        >
                                            <ThumbsDown className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none flex gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-4 pb-8 pt-4 border-t border-border/10 shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-20">
                <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-2xl mx-auto w-full">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={interfaceLanguage === 'ru' ? 'Спроси Skily...' : 'Pregunta a Skily...'}
                            className="w-full h-12 py-3 rounded-2xl px-5 border border-border bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all pr-12"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute right-1 top-1 h-10 w-10 rounded-xl transition-colors",
                                isRecording ? "text-red-500 bg-red-50 dark:bg-red-950/30" : "text-slate-400 hover:text-blue-500"
                            )}
                            onClick={toggleVoiceInput}
                        >
                            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                    </div>
                    <Button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className="h-12 w-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-transform active:scale-95"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );

    const drawerHeight = viewportHeight > 0 ? viewportHeight : undefined;

    return (
        <>
            {isMobile ? (
                <Drawer
                    open={isOpen}
                    onOpenChange={(open) => !open && closeChat()}
                    shouldScaleBackground={false}
                >
                    <DrawerContent
                        className="overflow-hidden flex flex-col focus:outline-none"
                        style={{
                            height: drawerHeight ? `${drawerHeight}px` : '92dvh',
                            maxHeight: drawerHeight ? `${drawerHeight}px` : '92dvh',
                            transition: 'height 0.2s ease',
                        }}
                    >
                        {chatContent}
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isOpen} onOpenChange={(open) => !open && closeChat()}>
                    <DialogContent
                        hideCloseButton
                        className="w-screen h-screen max-w-none max-h-none m-0 p-0 flex flex-col rounded-none border-none bg-white/95 dark:bg-zinc-950/98 backdrop-blur-2xl"
                    >
                        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full shadow-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden my-0 sm:my-8 sm:rounded-2xl sm:border sm:border-border/10">
                            {chatContent}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <AILimitReachedModal
                isOpen={limitModalOpen}
                onClose={() => setLimitModal(false)}
                currentCount={limitData.currentCount}
                limit={limitData.limit}
                message={limitData.message}
            />
        </>
    );
}

export default AIChatWidget;
