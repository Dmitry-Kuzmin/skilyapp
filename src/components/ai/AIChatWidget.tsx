
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
import { Bot, Loader2, Sparkles, Send, ThumbsUp, ThumbsDown, Languages, X, Mic, MicOff, Zap, Crown, Volume2, VolumeX, ImagePlus, XCircle } from 'lucide-react';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';
// TON_DISABLED: import { TonPaymentWidget } from '@/components/monetization/LazyTonPaymentWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { isTelegramMiniApp, triggerHapticFeedback } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';
import { AILimitReachedModal } from '@/components/ai/AILimitReachedModal';
import { useAIChatStore, selectIsOpen, selectMessages, selectIsLoading, selectSmartSuggestions, selectQuestionContext } from '@/stores/useAIChatStore';
import { useModalStore } from '@/store/modalStore';
import { useAIRequest, uploadChatImage } from '@/hooks/useAIRequest';
import { useAIChatHistory } from '@/hooks/useAIChatHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';
import { generateAIChatPrompt } from '@/lib/aiPrompts';
import { useProfileData } from '@/hooks/useProfileData';
import { usePDDContext } from '@/contexts/PDDContext';
import { usePremium } from '@/hooks/usePremium';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/contexts/UserContext';
import { SignWidget } from '@/components/chat/SignWidget';
import { useTTS } from '@/hooks/useTTS';
import { useTypewriter } from '@/hooks/useTypewriter';
import { cleanForSpeech } from '@/lib/speechUtils';
import type { TTSLang } from '@/lib/ttsEngine';

type MarkdownProps = {
    children: string;
    className?: string;
    onOpenShop?: () => void;
};

// Shared ReactMarkdown components — includes full table support
const mdComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    strong: ({ children }: any) => (
        <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1 rounded">{children}</span>
    ),
    em: ({ children }: any) => (
        <span className="font-semibold text-gray-900 dark:text-white not-italic">{children}</span>
    ),
    code: ({ children }: any) => <code className="bg-muted px-1 rounded text-xs">{children}</code>,
    table: ({ children }: any) => (
        <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <table className="w-full text-xs border-collapse">{children}</table>
        </div>
    ),
    thead: ({ children }: any) => <thead className="bg-indigo-50 dark:bg-indigo-500/10">{children}</thead>,
    tbody: ({ children }: any) => <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>,
    tr: ({ children }: any) => <tr className="even:bg-slate-50/30 dark:even:bg-slate-800/20">{children}</tr>,
    th: ({ children }: any) => <th className="px-3 py-2 text-left font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{children}</th>,
    td: ({ children }: any) => <td className="px-3 py-2 text-slate-700 dark:text-slate-300 align-top">{children}</td>,
};

const MarkdownContent: React.FC<MarkdownProps> = ({ children, className, onOpenShop }) => {
    // Regex catches all widget variants the AI might write:
    //   [WIDGET:SIGN:R-2]  [W:SIGN:R-2]  [WIDGET : CTA : PREMIUM:text]
    const WIDGET_REGEX = /\[\s*(?:WIDGET|W)\s*:\s*(SIGN|CTA|TON|MEME|WTON)\s*:\s*([^\]]+?)\s*\]/gi;

    const lc = children.toLowerCase();
    const hasWidget = lc.includes('[widget:') || lc.includes('[w:') || lc.includes('wton:');
    if (!children || !hasWidget) {
        return (
            <div className={cn("text-sm leading-relaxed", className)}>
                <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
            </div>
        );
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    WIDGET_REGEX.lastIndex = 0;

    while ((match = WIDGET_REGEX.exec(children)) !== null) {
        // Text before the widget
        const textBefore = children.substring(lastIndex, match.index);
        if (textBefore.trim()) {
            elements.push(
                <div key={`text-${lastIndex}`} className={cn("text-sm leading-relaxed", className)}>
                    <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>{textBefore}</ReactMarkdown>
                </div>
            );
        }

        const [fullMatch, type, param] = match;
        const key = `widget-${match.index}`;
        const upperType = type.toUpperCase();

        try {
            if (upperType === 'SIGN') {
                elements.push(<SignWidget key={key} code={param.trim()} />);
            } else if (upperType === 'MEME' && param.toUpperCase().startsWith('BADGE:')) {
                const badgeName = param.split(':')[1] || 'Новичок';
                elements.push(
                    <div key={key} className="my-4 p-4 rounded-2xl bg-gradient-to-br from-yellow-400/20 via-orange-500/10 to-pink-500/20 border border-orange-200/50 shadow-inner overflow-hidden relative group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
                        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                            <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-400/30 mb-1 ring-4 ring-orange-400/10">
                                <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-orange-600 dark:text-orange-400 tracking-tighter uppercase">Достижение разблокировано!</h4>
                                <p className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">{badgeName}</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px]">Это достижение подтверждено в блокчейне Memelandia!</p>
                            <Button size="sm" className="bg-slate-900 text-white rounded-full px-6 font-bold text-xs h-8 hover:scale-105 transition-transform active:scale-95" onClick={() => toast.success('Скопировано в буфер для Share!')}>
                                <Languages className="w-3 h-3 mr-2" />
                                Поделиться в Story
                            </Button>
                        </div>
                    </div>
                );
            } else if (upperType === 'CTA' && param.toUpperCase().startsWith('PREMIUM')) {
                const ctaText = param.split(':').slice(1).join(':').trim() || 'Активировать Premium';
                elements.push(
                    <div key={key} className="mt-3">
                        <Button
                            className="w-full h-auto py-3 px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl shadow-lg border-none whitespace-normal text-center leading-snug"
                            onClick={onOpenShop}
                        >
                            <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                            {ctaText}
                        </Button>
                    </div>
                );
            }
            // Unknown widget type — silently skip (no UI pollution)
        } catch (err) {
            console.error('Error rendering widget:', err);
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Remaining text after the last widget
    const remainingText = children.substring(lastIndex);
    if (remainingText.trim()) {
        elements.push(
            <div key="text-end" className={cn("text-sm leading-relaxed", className)}>
                <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>{remainingText}</ReactMarkdown>
            </div>
        );
    }

    return <div className="space-y-2">{elements}</div>;
};

/**
 * Хук для стабильного отслеживания высоты viewport + клавиатуры на iOS/Telegram.
 *
 * Возвращает:
 *   layoutHeight   — полная высота окна (без учёта клавиатуры). Для расчёта высоты drawer.
 *   keyboardOffset — высота открытой клавиатуры в px. Drawer.bottom = этот offset, чтобы
 *                    drawer всегда «плавал» над клавиатурой и не оставлял чёрный провал.
 *
 * iOS WebKit: position:fixed bottom:0 анкорится к layout viewport (= экран), а не к
 * visual viewport (= видимая область). Поэтому при открытии клавиатуры drawer уезжает
 * вниз ПОД клавиатуру. Решение — динамически считать keyboardOffset и применять как bottom.
 */
function useStableViewportHeight(isOpen: boolean) {
    const [state, setState] = useState({ layoutHeight: 0, keyboardOffset: 0 });
    const isTelegram = isTelegramMiniApp();

    useEffect(() => {
        if (!isOpen) return;

        const update = () => {
            const tg = isTelegram ? window.Telegram?.WebApp : null;

            if (tg && tg.viewportHeight) {
                // Telegram: viewportStableHeight — без клавиатуры, viewportHeight — с учётом
                const stable = (tg.viewportStableHeight as number | undefined) ?? tg.viewportHeight;
                const visible = tg.viewportHeight;
                setState({
                    layoutHeight: stable,
                    keyboardOffset: Math.max(0, stable - visible),
                });
                return;
            }

            const vv = window.visualViewport;
            const layoutHeight = window.innerHeight;
            if (vv) {
                // Клавиатура = layout - visible - сколько проскроллено внутри layout
                const kbOffset = Math.max(0, layoutHeight - vv.height - vv.offsetTop);
                setState({ layoutHeight, keyboardOffset: kbOffset });
            } else {
                setState({ layoutHeight, keyboardOffset: 0 });
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
            vv.addEventListener('scroll', update);
            return () => {
                vv.removeEventListener('resize', update);
                vv.removeEventListener('scroll', update);
            };
        }

        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [isOpen, isTelegram]);

    return state;
}

export function AIChatWidget() {
    const isMobile = useIsMobile();
    const isTelegram = isTelegramMiniApp();
    const { t, language: uiLanguage } = useLanguage();
    const { profileData } = useProfileData();
    const { selectedCountry } = usePDDContext();
    const { isPremium, loading: premiumLoading } = usePremium();
    const { profileId } = useUserContext();

    // Zustand Store
    const isOpen = useAIChatStore(selectIsOpen);
    const messages = useAIChatStore(selectMessages);
    const isLoading = useAIChatStore(selectIsLoading);
    const smartSuggestions = useAIChatStore(selectSmartSuggestions);
    const questionContext = useAIChatStore(selectQuestionContext);
    const showTranslation = useAIChatStore((s) => s.showTranslation);
    const limitModalOpen = useAIChatStore((s) => s.limitModalOpen);
    const limitData = useAIChatStore((s) => s.limitData);
    const openModal = useModalStore(s => s.openModal);
    const { sendRequest } = useAIRequest();

    // Счётчик оставшихся AI-сообщений — только для free пользователей.
    // ВАЖНО: p_user_id = auth.users.id (не profiles.id!), т.к. daily_ai_usage.user_id → auth.users
    // enabled: не запускаем для premium (экономим запрос) и пока isPremium loading.
    const { data: aiUsage, refetch: refetchUsage } = useQuery({
        queryKey: ['ai-usage-limit', profileId],
        queryFn: async () => {
            if (!profileId) return null;
            const { data: { session } } = await supabase.auth.getSession();
            const authUserId = session?.user?.id;
            if (!authUserId) return null;
            const { data } = await supabase.rpc('check_ai_usage_limit', { p_user_id: authUserId });
            return data?.[0] ?? null;
        },
        enabled: !!profileId && isOpen && !isPremium && !premiumLoading,
        staleTime: 0,
    });

    const FREE_DAILY_LIMIT = 5;
    // aiUsage?.remaining — прямо из RPC (GREATEST(limit - count, 0))
    // aiUsage == null (double-equals: ловит undefined ДО загрузки И null)
    const aiRemaining = aiUsage?.remaining ?? FREE_DAILY_LIMIT;
    const aiLimitReached = aiUsage?.limit_reached ?? false;
    const aiUsed = aiUsage?.current_count ?? 0;
    const usageLoaded = aiUsage != null; // != ловит и undefined и null

    const {
        closeChat,
        toggleTranslation,
        addMessage,
        updateLastMessage,
        setMessageRating,
        setMessageDbId,
        setLoading,
        setSmartSuggestions,
        setGeneratingSuggestions,
        setLimitModal,
        conversationId,
    } = useAIChatStore();

    const { saveMessage, loadHistory, updateRating } = useAIChatHistory();
    const typewriter = useTypewriter({ charsPerSecond: 60 });

    const [input, setInput] = useState('');
    const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Load history from DB when chat opens (only if store is empty for this conversation)
    useEffect(() => {
        if (!isOpen || !profileId || !conversationId || messages.length > 0) return;
        loadHistory(profileId, conversationId).then((dbMessages) => {
            if (dbMessages.length > 0) {
                useAIChatStore.setState({ messages: dbMessages });
            }
        });
    }, [isOpen, profileId, conversationId]);

    // Стабильная высота viewport + offset клавиатуры (решает iOS + Telegram + keyboard)
    const { layoutHeight, keyboardOffset } = useStableViewportHeight(isOpen);

    // Voice Input State (Whisper API)
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Подберём лучший mime, который поддерживает текущий браузер (Safari ≠ Chrome)
    const pickRecorderMime = (): string => {
        const candidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/mp4;codecs=mp4a.40.2',
        ];
        const MR: any = (typeof window !== 'undefined' && (window as any).MediaRecorder) || null;
        if (MR && typeof MR.isTypeSupported === 'function') {
            for (const m of candidates) if (MR.isTypeSupported(m)) return m;
        }
        return '';
    };

    const startRecording = async () => {
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            toast.error('Браузер не поддерживает запись голоса');
            return;
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
        } catch (err: any) {
            const msg = err?.name === 'NotAllowedError'
                ? 'Доступ к микрофону запрещён. Разрешите в настройках браузера.'
                : 'Нет доступа к микрофону';
            toast.error(msg);
            return;
        }

        const mimeType = pickRecorderMime();
        const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const usedMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: usedMime });
            stream.getTracks().forEach(track => track.stop());

            setIsRecording(false);

            // Слишком короткая запись — не дёргаем сеть
            if (audioBlob.size < 2048) {
                toast.message(interfaceLanguage === 'ru' ? 'Запись слишком короткая' : 'Grabación demasiado corta');
                return;
            }

            setIsProcessingVoice(true);
            try {
                const ext = usedMime.includes('mp4') ? 'mp4' : usedMime.includes('ogg') ? 'ogg' : 'webm';
                const formData = new FormData();
                formData.append('file', audioBlob, `voice.${ext}`);
                // Не передаём language — Whisper auto-detect работает лучше
                // на смешанной речи (рус + es), чем фиксированный bias на UI-язык

                const { data, error } = await supabase.functions.invoke('speech-to-text', {
                    body: formData,
                });

                if (error) throw error;

                const recognised = (data?.text || '').trim();
                if (recognised) {
                    setInput(prev => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed} ${recognised}` : recognised;
                    });
                    triggerHapticFeedback('success');
                    setTimeout(() => inputRef.current?.focus(), 150);
                } else {
                    toast.message(interfaceLanguage === 'ru' ? 'Ничего не услышал — попробуйте ещё раз' : 'No te he entendido, inténtalo de nuevo');
                }
            } catch (err: any) {
                console.error('[STT] error', err);
                toast.error(interfaceLanguage === 'ru' ? 'Не удалось распознать речь' : 'No se pudo reconocer la voz');
                triggerHapticFeedback('error');
            } finally {
                setIsProcessingVoice(false);
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
        triggerHapticFeedback('light');

        // Web Speech API live preview отключён: он привязан к одному языку и
        // выдаёт мусор на смешанной речи (рус+es). Whisper после стопа справляется
        // лучше — просто показываем "Слушаю..." во время записи.
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            triggerHapticFeedback('medium');
        }
    };

    const toggleVoiceInput = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    // Фокус на input при открытии (с задержкой для анимации)
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    // Автоскролл к последнему сообщению
    useEffect(() => {
        if (!messagesEndRef.current) return;
        // requestAnimationFrame гарантирует скролл после рендера
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }, [messages, isLoading]);

    /**
     * Язык интерфейса/ответов AI:
     *   1. Пользователь явно переключил перевод RU ↔ ES — уважаем showTranslation
     *   2. UI приложения на русском/английском — отвечаем на нём же
     *   3. Иначе берём язык вопроса теста, если открыт через explanation
     *   4. Иначе по стране профиля
     */
    const currentProfileCountry = useProfileData().profileData?.preferred_country || 'russia';
    const interfaceLanguage: 'ru' | 'es' | 'en' = (() => {
        if (showTranslation) return 'ru';
        const ui = (uiLanguage || '').toLowerCase();
        if (ui === 'ru') return 'ru';
        if (ui === 'en') return 'en';
        if (ui === 'es') return 'es';
        if (questionContext?.testLanguage) return questionContext.testLanguage;
        return currentProfileCountry === 'russia' ? 'ru' : 'es';
    })();

    /**
     * Per-turn override: если пользователь пишет кириллицей — отвечаем на русском,
     * даже если в профиле выбрана Испания. Это решает кейс "пишу по-русски,
     * получаю ответ на испанском".
     */
    const detectReplyLang = useCallback((userMessage: string): 'ru' | 'es' | 'en' => {
        const text = userMessage || '';
        const cyrillic = (text.match(/[Ѐ-ӿ]/g) || []).length;
        const latin = (text.match(/[A-Za-z]/g) || []).length;
        if (cyrillic > 0 && cyrillic >= latin) return 'ru';
        // Латиница: если UI русский, но человек написал по-испански — пусть будет испанский
        if (latin > 0 && interfaceLanguage === 'ru') return 'es';
        return interfaceLanguage;
    }, [interfaceLanguage]);

    // TTS — должен быть после interfaceLanguage, иначе IIFE получает TDZ-ошибку
    const ttsLang: TTSLang = ((): TTSLang => {
        const l = (interfaceLanguage || 'es') as string;
        return l === 'ru' || l === 'en' ? l : 'es';
    })();
    const { speak: speakAi, stop: stopAi, isActive: isSpeakingMessage } = useTTS(ttsLang);
    const handleSpeakMessage = useCallback((id: string, content: string) => {
        // Toggle: повторный клик по играющему сообщению — стоп
        if (isSpeakingMessage(id)) {
            stopAi();
            return;
        }
        const cleaned = cleanForSpeech(content);
        if (!cleaned) return;
        speakAi(cleaned, ttsLang, id);
    }, [speakAi, stopAi, isSpeakingMessage, ttsLang]);

    const askAI = useCallback(async (userMessage: string, imageFile?: File) => {
        if (!userMessage.trim() && !imageFile || isLoading) return;

        // Клиентская пре-проверка: не тратить запрос если лимит уже исчерпан
        // Сначала закрываем чат-Dialog (иначе его focus-trap блокирует клики по модалу)
        if (!isPremium && aiLimitReached) {
            closeChat();
            setLimitModal(true, { currentCount: aiUsed, limit: FREE_DAILY_LIMIT, message: '' });
            return;
        }

        setLoading(true);

        // Upload image if attached
        let imageUrl: string | undefined;
        if (imageFile && profileId) {
            const uploaded = await uploadChatImage(imageFile, profileId);
            if (uploaded) imageUrl = uploaded;
        }
        setPendingImage(null);

        const userMsg = { role: 'user' as const, content: userMessage || '📷', imageUrl };
        addMessage(userMsg);

        // Save user message to DB (fire-and-forget)
        if (profileId && conversationId) {
            const storeMessages = useAIChatStore.getState().messages;
            const savedUserMsg = storeMessages[storeMessages.length - 1];
            saveMessage(profileId, conversationId, { ...savedUserMsg, ...userMsg }).then((dbId) => {
                if (dbId && savedUserMsg) setMessageDbId(savedUserMsg.id, dbId);
            });
        }

        const context = questionContext;
        const replyLang = detectReplyLang(userMessage);

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
            replyLang
        );

        const allMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // Есть ли уже реальные сообщения пользователя в истории?
        // (первое сообщение может быть assistant = pre-loaded explanation из store)
        const hasUserHistory = allMessages.some(m => m.role === 'user');

        allMessages.push({
            role: 'user' as const,
            // Системный промпт добавляем только если нет предыдущих реплик пользователя
            content: !hasUserHistory ? aiPrompt + '\n\n' + userMessage : userMessage,
        });

        addMessage({ role: 'assistant', content: '' });

        // Gemini требует первым сообщением быть 'user'.
        // Если store начинается с assistant (pre-loaded explanation) — срезаем их.
        // Это безопасно: контекст вопроса уже встроен в system_instruction Edge Function.
        const apiMessages = allMessages[0]?.role === 'assistant'
            ? allMessages.slice(1)
            : allMessages;

        // Typewriter: чанки от Gemini могут прилетать пачкой за 0.5с — буферизируем
        // и выпускаем в UI со скоростью ~60 chars/sec, чтобы текст красиво «печатался».
        // onComplete срабатывает когда хвост допечатан → тогда сохраняем в БД.
        typewriter.start(
            (slice) => updateLastMessage(slice),
            () => {
                if (!profileId || !conversationId) return;
                const finalMessages = useAIChatStore.getState().messages;
                const assistantMsg = finalMessages[finalMessages.length - 1];
                if (assistantMsg?.role === 'assistant' && assistantMsg.content) {
                    saveMessage(profileId, conversationId, assistantMsg).then((dbId) => {
                        if (dbId) setMessageDbId(assistantMsg.id, dbId);
                    });
                }
            },
        );

        await sendRequest(
            { messages: apiMessages, country: selectedCountry, language: replyLang, mode: 'chat', showComparison: false, imageUrl: imageUrl ?? null },
            {
                onChunk: (text) => typewriter.push(text),
                onDone: () => {
                    typewriter.finish();
                    if (isTelegram) triggerHapticFeedback('success');
                },
                onLimitReached: (data) => {
                    // Закрываем чат-Dialog перед показом модала, иначе focus-trap блокирует клики
                    closeChat();
                    setLimitModal(true, { currentCount: data.currentCount, limit: data.limit, message: data.message || '' });
                },
                onError: () => {
                    typewriter.cancel();
                    toast.error('Ошибка при получении ответа');
                },
            },
        );

        setLoading(false);
        if (!isPremium) refetchUsage();
    }, [messages, questionContext, interfaceLanguage, detectReplyLang, isLoading, isTelegram, isPremium, aiLimitReached, aiUsed, refetchUsage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !pendingImage) || isLoading) return;
        const userMessage = input.trim();
        const imageFile = pendingImage?.file;
        setInput('');
        askAI(userMessage, imageFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
        e.target.value = '';
    };

    const removePendingImage = () => {
        if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
    };

    const chatContent = (
        <div className="flex flex-col" style={{ height: '100%' }}>
            {/* Header — Claude-style: круглая X слева, заголовок по центру, бейдж справа.
                Без своего фона/border — сливается с drawer'ом, как в Claude app */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2.5 shrink-0 z-10">
                {/* Left: круглая X */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeChat}
                    aria-label={interfaceLanguage === 'ru' ? 'Закрыть' : 'Cerrar'}
                    className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 active:scale-95 transition-transform"
                >
                    <X className="w-4 h-4" />
                </Button>

                {/* Center: аватар + заголовок */}
                <div className="flex items-center justify-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Bot className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="font-bold text-[14px] tracking-tight leading-tight truncate">Skily AI</span>
                        <p className="text-[10px] text-muted-foreground leading-tight truncate">AI Instructor</p>
                    </div>
                </div>

                {/* Right: бейдж лимита + перевод */}
                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    {/* Для premium — Crown, для free — счётчик (только после загрузки данных).
                    premiumLoading: скрываем всё пока не знаем статус, чтобы не мелькать.
                    isPremium проверяем явно в обоих ветках, иначе stale cache даст 999/5 */}
                {!premiumLoading && isPremium ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <Crown className="w-3 h-3 fill-current" />
                        </div>
                    ) : !premiumLoading && !isPremium && usageLoaded ? (
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full border transition-all shadow-sm",
                            aiRemaining <= 1
                                ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse"
                                : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                        )}>
                            <Zap className={cn("w-2.5 h-2.5", aiRemaining <= 1 ? "fill-current" : "")} />
                            <span className="text-[10px] font-bold">
                                {aiRemaining}/{FREE_DAILY_LIMIT}
                            </span>
                        </div>
                    ) : null}
                    {questionContext?.explanationRu && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTranslation}
                            aria-label={showTranslation ? 'ES' : 'RU'}
                            className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                        >
                            <Languages className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Messages — flex-1 + overflow-y-auto. Без своего фона — наследует от drawer */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
                    style={{
                        backgroundImage:
                            "radial-gradient(rgba(15,23,42,0.8) 0.8px, transparent 0.8px)",
                        backgroundSize: "10px 10px",
                    }}
                />

                {messages.length === 0 && questionContext && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center text-center py-8 px-4"
                    >
                        <SkilyAICharacter size="lg" />
                        <h3 className="text-xl font-bold mt-4 mb-2">
                            {interfaceLanguage === 'ru' ? 'Привет! Я Skily 💡' : '¡Hola! Soy Skily 💡'}
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-[85%] mb-6 px-2">
                            {interfaceLanguage === 'ru'
                                ? 'Нужна подсказка или объяснение? Просто нажми кнопку или задай свой вопрос!'
                                : '¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, ¡y te ayudaré al momento!'}
                        </p>
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
                                "max-w-[85%] p-4 shadow-md transition-all overflow-hidden",
                                message.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none border-transparent'
                                    : 'bg-white/95 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl rounded-tl-none border-indigo-100/50 dark:border-white/5 text-slate-800 dark:text-slate-200'
                            )}>
                                {message.role === 'assistant' ? (
                                    <MarkdownContent onOpenShop={() => { closeChat(); openModal('PAYWALL'); }}>{message.content}</MarkdownContent>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {message.imageUrl && (
                                            <img
                                                src={message.imageUrl}
                                                alt=""
                                                className="rounded-xl max-h-48 max-w-full object-cover"
                                            />
                                        )}
                                        {message.content && message.content !== '📷' && (
                                            <p className="text-sm font-medium tracking-tight leading-relaxed">{message.content}</p>
                                        )}
                                    </div>
                                )}

                                {message.role === 'assistant' && message.content && (
                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10",
                                                isSpeakingMessage(message.id) && "text-indigo-500",
                                            )}
                                            onClick={() => handleSpeakMessage(message.id, message.content)}
                                            aria-label={isSpeakingMessage(message.id)
                                                ? (interfaceLanguage === 'ru' ? 'Остановить' : 'Detener')
                                                : (interfaceLanguage === 'ru' ? 'Озвучить ответ' : 'Escuchar respuesta')}
                                            title={isSpeakingMessage(message.id)
                                                ? (interfaceLanguage === 'ru' ? 'Остановить' : 'Detener')
                                                : (interfaceLanguage === 'ru' ? 'Озвучить ответ' : 'Escuchar respuesta')}
                                        >
                                            {isSpeakingMessage(message.id)
                                                ? <VolumeX className="w-3.5 h-3.5" />
                                                : <Volume2 className="w-3.5 h-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10", message.rating === 1 && "text-green-500")}
                                            onClick={() => {
                                                setMessageRating(message.id, 1);
                                                if (message.dbId) updateRating(message.dbId, 1);
                                            }}
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10", message.rating === -1 && "text-red-500")}
                                            onClick={() => {
                                                setMessageRating(message.id, -1);
                                                if (message.dbId) updateRating(message.dbId, -1);
                                            }}
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
                <div className="px-4 pb-2 shrink-0">
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

            {/* Input — без своего фона/border, сливается с drawer.
                Drawer уже plавает над клавиатурой (bottom = keyboardOffset),
                поэтому safe-area-inset-bottom применяем только когда клавиатура закрыта */}
            <div
                className="px-3 pt-3 shrink-0 z-20"
                style={{
                    paddingBottom: keyboardOffset > 0 ? '12px' : 'max(env(safe-area-inset-bottom, 8px), 12px)',
                }}
            >
                {/* Image preview above input */}
                {pendingImage && (
                    <div className="flex items-center gap-2 mb-2 max-w-2xl mx-auto">
                        <div className="relative inline-block">
                            <img
                                src={pendingImage.previewUrl}
                                alt=""
                                className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <button
                                type="button"
                                onClick={removePendingImage}
                                className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-2xl mx-auto w-full">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => { if (!isRecording) setInput(e.target.value); }}
                            placeholder={
                                isRecording
                                    ? (interfaceLanguage === 'ru' ? '🎙 Слушаю...' : '🎙 Escuchando...')
                                    : isProcessingVoice
                                        ? (interfaceLanguage === 'ru' ? 'Распознаю...' : 'Reconociendo...')
                                        : (interfaceLanguage === 'ru' ? 'Напиши свой вопрос...' : 'Escribe tu pregunta...')
                            }
                            readOnly={isRecording || isProcessingVoice}
                            disabled={isLoading}
                            className={cn(
                                "w-full min-h-[48px] py-3 rounded-[24px] px-5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all shadow-sm text-base",
                                isRecording
                                    ? "border-red-400 dark:border-red-500 ring-2 ring-red-400/20"
                                    : "border-slate-200 dark:border-slate-700"
                            )}
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        size="icon"
                        variant="ghost"
                        className={cn(
                            "h-12 w-12 shrink-0 rounded-full transition-all active:scale-90",
                            pendingImage
                                ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                        )}
                        title={interfaceLanguage === 'ru' ? 'Прикрепить фото' : 'Adjuntar foto'}
                    >
                        <ImagePlus className="w-5 h-5" />
                    </Button>

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
                                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 cursor-wait"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                        )}
                        title="Голосовой ввод"
                    >
                        {isProcessingVoice ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isRecording ? (
                            <>
                                <span className="absolute inset-0 rounded-full animate-ping bg-white/30 duration-1000" />
                                <MicOff className="w-5 h-5 relative z-10" />
                            </>
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </Button>

                    <Button
                        type="submit"
                        disabled={(!input.trim() && !pendingImage) || isLoading}
                        size="icon"
                        className={cn(
                            "h-12 w-12 shrink-0 rounded-full shadow-lg transition-all active:scale-90",
                            (!input.trim() && !pendingImage)
                                ? "bg-blue-500/50 text-white shadow-none"
                                : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30"
                        )}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );

    // Mobile: Vaul Drawer
    if (isMobile) {
        // Высота drawer = полный layout − notch − 16px воздуха − клавиатура
        // bottom = keyboardOffset → drawer всегда «плавает» над клавиатурой без чёрного провала
        const baseHeight = layoutHeight > 0 ? `${layoutHeight}px` : '100dvh';
        const heightExpr = `calc(${baseHeight} - env(safe-area-inset-top, 0px) - 16px - ${keyboardOffset}px)`;

        return (
            <>
                <Drawer
                    open={isOpen}
                    onOpenChange={(open) => !open && closeChat()}
                    shouldScaleBackground={false}
                >
                    <DrawerContent
                        className="overflow-hidden flex flex-col focus:outline-none"
                        style={{
                            height: heightExpr,
                            maxHeight: heightExpr,
                            bottom: `${keyboardOffset}px`,
                            transition: 'height 0.25s cubic-bezier(0.32, 0.72, 0, 1), bottom 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
                        }}
                    >
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

    // Desktop: компактный центрированный попап (не full-screen)
    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && closeChat()}>
                <DialogContent
                    hideCloseButton
                    className="w-full max-w-xl p-0 flex flex-col rounded-2xl border border-border/10 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
                    style={{ height: '80vh', maxHeight: '700px' }}
                >
                    {chatContent}
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
