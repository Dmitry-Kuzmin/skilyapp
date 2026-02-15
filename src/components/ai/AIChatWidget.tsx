/**
 * AIChatWidget — Глобальный AI чат виджет с Zustand + Vaul
 * 
 * Использует:
 * - Zustand store для глобального состояния
 * - Vaul Drawer для мобильных (нативная физика свайпа)
 * - Dialog для десктопа
 * - Unified AI Prompts System для консистентности
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Loader2, Sparkles, Send, ThumbsUp, ThumbsDown, Languages, X, ChevronDown, Mic, MicOff } from 'lucide-react';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { isTelegramMiniApp, triggerHapticFeedback } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';
import { AILimitReachedModal } from '@/components/ai/AILimitReachedModal';
import { useAIChatStore, selectIsOpen, selectMessages, selectIsLoading, selectSmartSuggestions, selectQuestionContext } from '@/stores/useAIChatStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';
import { generateAIChatPrompt } from '@/lib/aiPrompts';
import { useProfileData } from '@/hooks/useProfileData';
import { usePDDContext } from '@/contexts/PDDContext';

// Типизация для markdown рендеринга
type MarkdownProps = {
    children: string;
    className?: string;
};

// ВАЖНО: react-markdown без remarkGfm (как в SmartDebriefCard где работает!)
const MarkdownContent: React.FC<MarkdownProps> = ({ children, className }) => (
    <div className={cn("text-sm leading-relaxed", className)}>
        <ReactMarkdown
            components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1 rounded">{children}</span>
                ),
                em: ({ children }) => (
                    <span className="font-semibold text-gray-900 dark:text-white not-italic">{children}</span>
                ),
                code: ({ children }) => <code className="bg-muted px-1 rounded text-xs">{children}</code>,
            }}
        >
            {children}
        </ReactMarkdown>
    </div>
);

export function AIChatWidget() {
    const isMobile = useIsMobile();
    const isTelegram = isTelegramMiniApp();
    const { t } = useLanguage();
    const { profileData } = useProfileData();
    const { selectedCountry } = usePDDContext();

    // Zustand Store
    const isOpen = useAIChatStore(selectIsOpen);
    const messages = useAIChatStore(selectMessages);
    const isLoading = useAIChatStore(selectIsLoading);
    const smartSuggestions = useAIChatStore(selectSmartSuggestions);
    const questionContext = useAIChatStore(selectQuestionContext);
    const showTranslation = useAIChatStore((s) => s.showTranslation);
    const limitModalOpen = useAIChatStore((s) => s.limitModalOpen);
    const limitData = useAIChatStore((s) => s.limitData);

    const {
        closeChat,
        toggleTranslation,
        addMessage,
        updateLastMessage,
        setMessageRating,
        setLoading,
        setSmartSuggestions,
        setGeneratingSuggestions,
        setLimitModal,
        conversationId,
    } = useAIChatStore();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Voice Input State (Whisper API)
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

                setIsRecording(false); // UI update immediate
                setIsProcessingVoice(true); // Show loader

                try {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voice.webm'); // Name doesn't matter much for Whisper, but ext might
                    formData.append('language', selectedCountry === 'russia' ? 'ru' : 'es');

                    const { data, error } = await supabase.functions.invoke('speech-to-text', {
                        body: formData,
                    });

                    if (error) throw error;

                    if (data?.text) {
                        const newText = data.text.trim();
                        // Умное добавление пробела
                        setInput(prev => {
                            const trimmed = prev.trim();
                            if (!trimmed) return newText;
                            // Если заканчивается на знак препинания, пробел нужен
                            return `${trimmed} ${newText}`;
                        });
                        triggerHapticFeedback('success');
                    }
                } catch (err) {
                    console.error('Voice processing error:', err);
                    toast.error('Не удалось распознать речь');
                    triggerHapticFeedback('error');
                } finally {
                    setIsProcessingVoice(false);
                    // Stop all tracks to release mic
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            triggerHapticFeedback('light');
        } catch (err) {
            console.error('Microphone access denied:', err);
            toast.error('Нет доступа к микрофону');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            triggerHapticFeedback('medium');
        }
    };

    const toggleVoiceInput = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };


    // Фокус на input при открытии
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Определяем язык интерфейса
    const interfaceLanguage = showTranslation ? 'ru' : (questionContext?.testLanguage || 'es');

    // Отправка сообщения в AI
    const askAI = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return;

        setLoading(true);

        // Добавляем user message
        addMessage({ role: 'user', content: userMessage });

        const context = questionContext;

        // 🧠 UNIFIED AI PROMPT SYSTEM
        // Используем тот же мощный промпт что и в SmartDebriefCard
        const aiPrompt = generateAIChatPrompt(
            context ? {
                questionText: context.question || '',
                correctAnswer: context.correctAnswer || '',
                userAnswer: context.userAnswer,
                topic: context.topic,
                explanation: context.explanation,
                isCorrect: context.isCorrect,
                imageUrl: context.imageUrl,
            } : undefined,
            selectedCountry,
            profileData ? {
                name: profileData.full_name || 'Студент',
                xp: profileData.xp || 0,
                streak: profileData.streak || 0,
                prevWeakness: null, // TODO: добавить tracking слабых тем
            } : undefined,
            interfaceLanguage
        );

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            const allMessages = messages.map(m => ({ role: m.role, content: m.content }));

            // В первом сообщении добавляем AI промпт как system context
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
                    imageUrl: context?.imageUrl || '',
                    country: selectedCountry,
                    language: interfaceLanguage,
                    mode: 'debrief', // 🔥 КРИТИЧНО: отключаем старый system prompt, используем наш unified prompt
                }),
            });

            // Handle AI Limit
            if (response.status === 429) {
                const errorData = await response.json();
                if (errorData.error === 'daily_limit_reached') {
                    setLimitModal(true, {
                        currentCount: errorData.current_count || 10,
                        limit: errorData.limit || 10,
                        message: errorData.message || '',
                    });
                    setLoading(false);
                    return;
                }
            }

            if (!response.ok || !response.body) {
                throw new Error('Failed to get response');
            }

            // Streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

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
                                updateLastMessage(content);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            // Хаптик при успешном ответе
            if (isTelegram) {
                triggerHapticFeedback('success');
            }

        } catch (error) {
            console.error('AI Chat error:', error);
            toast.error('Ошибка при получении ответа');
        } finally {
            setLoading(false);
        }
    }, [messages, questionContext, interfaceLanguage, isLoading, isTelegram]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMessage = input.trim();
        setInput('');
        askAI(userMessage);
    };

    // Общий контент чата
    const chatContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-3 border-b border-border/10 shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-10"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">AI Помощник</span>
                </div>
                <div className="flex items-center gap-2">
                    {questionContext?.explanationRu && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleTranslation}
                            className="h-9 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        >
                            <Languages className="w-4 h-4 mr-2" />
                            <span className="text-xs font-bold">{showTranslation ? 'ES' : 'RU'}</span>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeChat}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className={cn(
                "flex-1 overflow-y-auto px-4 py-4 space-y-4 relative transition-colors duration-500",
                "bg-[#F5F8FF]/80 dark:bg-slate-900/40"
            )}>
                {/* Noise texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.png')] mix-blend-overlay"></div>

                {/* Welcome Screen - если нет сообщений и есть контекст вопроса */}
                {messages.length === 0 && questionContext && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center text-center py-8 px-4"
                    >
                        {/* Lumi Character */}
                        <SkilyAICharacter size="lg" />

                        {/* Greeting */}
                        <h3 className="text-xl font-bold mt-4 mb-2">
                            {interfaceLanguage === 'ru' ? 'Привет! Я Skily 💡' : '¡Hola! Soy Skily 💡'}
                        </h3>

                        <p className="text-muted-foreground text-sm max-w-[85%] mb-6 px-2">
                            {interfaceLanguage === 'ru'
                                ? 'Нужна подсказка или объяснение? Просто нажми кнопку или задай свой вопрос!'
                                : '¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, y te ayudaré en el acto. ¡Listo cuando tú lo estés!'}
                        </p>

                        {/* Action Buttons - Stack vertically on mobile to fit long text */}
                        <div className="flex flex-col w-full max-w-sm gap-3 px-2">
                            <Button
                                variant="outline"
                                className="w-full h-auto py-3 text-primary border-primary/20 hover:bg-primary/5 text-sm font-medium whitespace-normal"
                                onClick={() => askAI(interfaceLanguage === 'ru' ? 'Дай подсказку' : 'Dame una pista')}
                            >
                                {interfaceLanguage === 'ru' ? 'Дай подсказку' : 'Dame una pista'}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-auto py-3 text-primary border-primary/20 hover:bg-primary/5 text-sm font-medium whitespace-normal"
                                onClick={() => askAI(interfaceLanguage === 'ru' ? 'Объясни это' : 'Ayúdame a entender esto')}
                            >
                                {interfaceLanguage === 'ru' ? 'Объясни это' : 'Ayúdame a entender esto'}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Empty state - если нет контекста вопроса */}
                {messages.length === 0 && !questionContext && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <SkilyAICharacter size="lg" />
                        <p className="text-muted-foreground mt-4 max-w-[80%]">
                            {interfaceLanguage === 'ru' ? 'Задай мне вопрос!' : '¡Pregúntame algo!'}
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "flex w-full relative z-10",
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            <Card className={cn(
                                "max-w-[85%] p-4 shadow-md transition-all",
                                message.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none border-transparent'
                                    : 'bg-white/95 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl rounded-tl-none border-indigo-100/50 dark:border-white/5 text-slate-800 dark:text-slate-200'
                            )}>
                                {message.role === 'assistant' ? (
                                    <MarkdownContent>{message.content}</MarkdownContent>
                                ) : (
                                    <p className="text-sm font-medium tracking-tight leading-relaxed">{message.content}</p>
                                )}

                                {/* Feedback buttons for assistant */}
                                {message.role === 'assistant' && message.content && (
                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10", message.rating === 1 && "text-green-500")}
                                            onClick={() => setMessageRating(message.id, 1)}
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10", message.rating === -1 && "text-red-500")}
                                            onClick={() => setMessageRating(message.id, -1)}
                                        >
                                            <ThumbsDown className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start w-full"
                    >
                        <Card className="p-3 bg-muted/80 backdrop-blur-sm rounded-2xl rounded-tl-sm">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">
                                    {interfaceLanguage === 'ru' ? 'Печатаю...' : 'Escribiendo...'}
                                </span>
                            </div>
                        </Card>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && !isLoading && (
                <div className="px-4 pb-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {smartSuggestions.map((suggestion, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => askAI(suggestion)}
                                className="text-xs whitespace-nowrap shrink-0 rounded-full bg-background/50 backdrop-blur-sm"
                            >
                                {suggestion}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div
                className="px-3 py-3 border-t border-border/10 shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl z-20"
                style={{
                    paddingBottom: isTelegram ? 'calc(var(--tg-content-safe-area-inset-bottom, 20px) + 10px)' : '20px',
                    paddingTop: '12px'
                }}
            >
                <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-2xl mx-auto w-full">
                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={interfaceLanguage === 'ru' ? 'Спроси что-нибудь...' : 'Pregunta algo...'}
                            disabled={isLoading}
                            className="w-full min-h-[48px] max-h-[120px] py-3 rounded-[24px] px-5 border-border/50 focus:ring-blue-500/20 bg-muted/50 focus:bg-background transition-all resize-none shadow-sm text-base"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={toggleVoiceInput}
                        disabled={isLoading || isProcessingVoice}
                        size="icon"
                        variant="ghost"
                        className={cn(
                            "h-12 w-12 shrink-0 rounded-full transition-all active:scale-90 relative overflow-hidden",
                            isRecording
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 ring-4 ring-red-500/20"
                                : isProcessingVoice
                                    ? "bg-blue-500/10 text-blue-600 cursor-wait"
                                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        title="Голосовой ввод"
                    >
                        {isProcessingVoice ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isRecording ? (
                            <>
                                <span className="absolute inset-0 rounded-full animate-ping bg-white/30 duration-1000"></span>
                                <MicOff className="w-5 h-5 relative z-10" />
                            </>
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </Button>

                    <Button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className={cn(
                            "h-12 w-12 shrink-0 rounded-full shadow-lg transition-all active:scale-90",
                            !input.trim()
                                ? "bg-muted text-muted-foreground shadow-none opacity-50"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        )}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </Button>
                </form>
            </div>
        </div>
    );

    // Mobile: Vaul Drawer
    if (isMobile) {
        return (
            <>
                <Drawer
                    open={isOpen}
                    onOpenChange={(open) => !open && closeChat()}
                    shouldScaleBackground={false}
                >
                    <DrawerContent className="h-[96dvh] max-h-[96dvh]">
                        {chatContent}
                    </DrawerContent>
                </Drawer>

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

    // Desktop: Dialog
    return (
        <>
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
