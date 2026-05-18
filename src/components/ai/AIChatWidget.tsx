
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
import { Bot, Loader2, Sparkles, Send, ThumbsUp, ThumbsDown, Languages, X, Mic, MicOff, Zap, Volume2, VolumeX, ImagePlus, XCircle, Trash2, Paperclip, Camera, FileText, Lightbulb, BookOpen } from 'lucide-react';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isTelegramMiniApp, triggerHapticFeedback } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';
import { AILimitReachedModal } from '@/components/ai/AILimitReachedModal';
import { useAIChatStore, selectIsOpen, selectMessages, selectIsLoading, selectSmartSuggestions, selectQuestionContext } from '@/stores/useAIChatStore';
import { useModalStore } from '@/store/modalStore';
import { useAIRequest, uploadChatAttachment } from '@/hooks/useAIRequest';
import { useAIChatHistory } from '@/hooks/useAIChatHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';
import { generateAIChatPrompt } from '@/lib/aiPrompts';
import { useTheme } from 'next-themes';
import { useProfileData } from '@/hooks/useProfileData';
import { usePDDContext } from '@/contexts/PDDContext';
import { usePremium } from '@/hooks/usePremium';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/contexts/UserContext';
import { AIMessageContent } from '@/components/ai/AIMessageContent';
import { useTTS } from '@/hooks/useTTS';
import { useTypewriter } from '@/hooks/useTypewriter';
import { cleanForSpeech } from '@/lib/speechUtils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import type { TTSLang } from '@/lib/ttsEngine';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PendingAttachment = {
    file: File;
    kind: 'image' | 'document';
    source: 'gallery' | 'camera' | 'document';
    previewUrl?: string;
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
    const { resolvedTheme } = useTheme();
    const { profileData } = useProfileData();
    const { selectedCountry } = usePDDContext();
    const { isPremium, hasUsedTrial, loading: premiumLoading } = usePremium();
    const { profileId } = useUserContext();
    const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

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
        // 5 минут — лимит дневной, нет смысла дёргать RPC на каждое открытие чата.
        // После отправки сообщения вручную делаем refetchUsage().
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
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
    const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
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

    // Фокус на input при открытии (с задержкой для анимации)
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    // Авто-высота textarea
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [input]);

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

    const { isRecording, isProcessingVoice, toggleVoiceInput, stopRecording, clearDraft, isDenied: isMicrophoneDenied, isUnsupported: isMicrophoneUnsupported } = useVoiceRecording({
        lang: interfaceLanguage,
        onTranscript: setInput,
        onLiveTranscript: setInput,
        inputRef,
    });

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
        let attachmentUrl: string | undefined;
        let outboundMessage = userMessage;
        if (imageFile && profileId) {
            const uploaded = await uploadChatAttachment(imageFile, profileId);
            if (uploaded) {
                if (pendingAttachment?.kind === 'image') {
                    imageUrl = uploaded;
                } else {
                    attachmentUrl = uploaded;
                    const note = interfaceLanguage === 'ru'
                        ? `\n\n[ПРИЛОЖЕН ДОКУМЕНТ: ${imageFile.name}${attachmentUrl ? ` | URL: ${attachmentUrl}` : ''}]`
                        : `\n\n[DOCUMENT ATTACHED: ${imageFile.name}${attachmentUrl ? ` | URL: ${attachmentUrl}` : ''}]`;
                    outboundMessage = `${userMessage}${note}`.trim();
                }
            }
        }
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
        setPendingAttachment(null);

        const fallbackContent = pendingAttachment?.kind === 'document'
            ? `📎 ${imageFile?.name ?? ''}`.trim()
            : '📷';
        const userMsg = { role: 'user' as const, content: userMessage || fallbackContent, imageUrl };
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
            replyLang,
            {
                isPremium,
                hasUsedTrial,
            }
        );

        const allMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // Есть ли уже реальные сообщения пользователя в истории?
        // (первое сообщение может быть assistant = pre-loaded explanation из store)
        const hasUserHistory = allMessages.some(m => m.role === 'user');

        allMessages.push({
            role: 'user' as const,
            // Системный промпт добавляем только если нет предыдущих реплик пользователя
            content: !hasUserHistory ? aiPrompt + '\n\n' + outboundMessage : outboundMessage,
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
        if (isLoading || isProcessingVoice) return;
        if (isRecording) {
            stopRecording();
            return;
        }
        if ((!input.trim() && !pendingAttachment) || isLoading) return;
        const userMessage = input.trim();
        const imageFile = pendingAttachment?.file;
        setInput('');
        clearDraft();
        askAI(userMessage, imageFile);
    };

    const handleFileSelect = (kind: PendingAttachment['kind'], source: PendingAttachment['source']) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
        const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined;
        setPendingAttachment({ file, kind, source, previewUrl });
        if (kind === 'document') {
            toast.message(
                interfaceLanguage === 'ru'
                    ? 'Документ прикреплен. AI увидит файл как вложение и его название.'
                    : 'Documento adjuntado. La IA verá el archivo adjunto y su nombre.'
            );
        }
        e.target.value = '';
    };

    const removePendingAttachment = () => {
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
        setPendingAttachment(null);
    };

    const hasComposerContent = Boolean(input.trim() || pendingAttachment);

    const attachmentButtonLabel = interfaceLanguage === 'ru' ? 'Открыть меню вложений' : 'Abrir menú de adjuntos';
    const attachPhotoLabel = interfaceLanguage === 'ru' ? 'Выбрать фото' : 'Elegir foto';
    const takePhotoLabel = interfaceLanguage === 'ru' ? 'Сделать фото' : 'Hacer foto';
    const attachDocumentLabel = interfaceLanguage === 'ru' ? 'Загрузить документ' : 'Subir documento';
    const removeAttachmentLabel = interfaceLanguage === 'ru' ? 'Убрать вложение' : 'Quitar adjunto';
    const voiceInputLabel = interfaceLanguage === 'ru' ? 'Голосовой ввод' : 'Entrada por voz';
    const sendLabel = interfaceLanguage === 'ru' ? 'Отправить' : 'Enviar';
    const attachmentMenuTitle = interfaceLanguage === 'ru' ? 'Вложения' : 'Adjuntos';
    const attachmentHint = interfaceLanguage === 'ru'
        ? 'Документы отправляются как вложения с названием файла.'
        : 'Los documentos se envían como adjuntos con el nombre del archivo.';
    const composerPlaceholder = interfaceLanguage === 'ru' ? 'Спроси что-нибудь...' : interfaceLanguage === 'en' ? 'Ask me anything...' : 'Pregúntame algo...';
    const microphoneHint = isMicrophoneDenied
        ? (interfaceLanguage === 'ru'
            ? 'Микрофон выключен в Safari. Открой настройки сайта и включи доступ.'
            : interfaceLanguage === 'en'
                ? 'Microphone is blocked in Safari. Open site settings and allow access.'
                : 'El micrófono está bloqueado en Safari. Abre los ajustes del sitio y permite el acceso.')
        : isMicrophoneUnsupported
            ? (interfaceLanguage === 'ru'
                ? 'Этот браузер не поддерживает запись голоса.'
                : interfaceLanguage === 'en'
                    ? 'This browser does not support voice recording.'
                    : 'Este navegador no admite grabación de voz.')
            : '';

    const chatContent = (
        <div
            className={cn(
                "flex flex-col h-full",
                isDarkTheme ? "bg-[#121a2a] text-slate-100" : "bg-[#f8fafc] text-slate-900"
            )}
        >
            {/* Header — компактный, нейтральный и без лишних акцентов */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 shrink-0 z-10">
                {/* Left: круглая X */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeChat}
                    aria-label={interfaceLanguage === 'ru' ? 'Закрыть' : 'Cerrar'}
                    className={cn(
                        "h-9 w-9 rounded-full shrink-0 active:scale-95 transition-all",
                        isDarkTheme
                            ? "bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                            : "bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                    )}
                >
                    <X className="w-4 h-4" />
                </Button>

                {/* Center: аватар + заголовок */}
                <div className="flex items-center justify-center gap-2.5 min-w-0">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                        isDarkTheme ? "bg-white/5 border-white/10" : "bg-indigo-50 border-indigo-100"
                    )}>
                        <Bot className={cn("w-4 h-4", isDarkTheme ? "text-slate-300" : "text-indigo-600")} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <span className={cn("font-semibold text-[14px] tracking-tight leading-tight truncate", isDarkTheme ? "text-slate-100" : "text-slate-900")}>Skily AI</span>
                        <p className={cn("text-[11px] leading-tight truncate", isDarkTheme ? "text-slate-400" : "text-slate-500")}>AI Instructor</p>
                    </div>
                </div>

                {/* Right: бейдж лимита + перевод */}
                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    {/* Кнопка очистки истории */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (window.confirm(interfaceLanguage === 'ru' ? 'Очистить историю чата?' : '¿Borrar el historial?')) {
                                useAIChatStore.getState().clearMessages();
                                triggerHapticFeedback('medium');
                            }
                        }}
                        className={cn(
                            "h-9 w-9 rounded-full border active:scale-95 transition-all",
                            isDarkTheme
                                ? "bg-white/5 border-white/5 hover:bg-red-500/10 hover:text-red-300 text-slate-400"
                                : "bg-slate-100 border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-500"
                        )}
                        title={interfaceLanguage === 'ru' ? 'Очистить чат' : 'Borrar chat'}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>

                    {/* Счётчик запросов — только для free-пользователей после загрузки. Premium — безлимит, не показываем ничего. */}
                {!premiumLoading && !isPremium && usageLoaded ? (
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full border transition-all shadow-sm",
                            aiRemaining <= 1
                                ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse"
                                : isDarkTheme
                                    ? "bg-white/5 border-white/10 text-slate-400"
                                    : "bg-slate-100 border-slate-200 text-slate-500"
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
                        className={cn(
                            "h-9 w-9 rounded-full border active:scale-95 transition-all",
                            isDarkTheme
                                ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Languages className="w-4 h-4" />
                    </Button>
                    )}
                </div>
            </div>

            {/* Messages — flex-1 + overflow-y-auto. Без своего фона — наследует от drawer */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 pb-10 space-y-4 relative"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    ...(messages.length > 0 ? {
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 110px), transparent 100%)',
                        maskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 110px), transparent 100%)',
                    } : {}),
                }}
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
                        <div className="flex flex-col w-full max-w-sm gap-2.5 px-2">
                            <Button
                                variant="ghost"
                                className="w-full h-auto py-3 text-sm font-semibold gap-2 justify-start
                                    bg-indigo-500/12 hover:bg-indigo-500/20 border border-indigo-400/25 hover:border-indigo-400/45
                                    text-indigo-100 hover:text-white
                                    dark:bg-indigo-400/10 dark:hover:bg-indigo-400/18 dark:border-indigo-500/22
                                    dark:text-indigo-200 dark:hover:text-white
                                    rounded-xl whitespace-normal transition-all duration-150 active:scale-[0.98]"
                                onClick={() => askAI(interfaceLanguage === 'ru' ? 'Дай подсказку' : 'Dame una pista')}
                            >
                                <Lightbulb className="w-4 h-4 shrink-0 text-yellow-300" />
                                {interfaceLanguage === 'ru' ? 'Дай подсказку' : 'Dame una pista'}
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-auto py-3 text-sm font-semibold gap-2 justify-start
                                    bg-sky-500/12 hover:bg-sky-500/20 border border-sky-400/25 hover:border-sky-400/45
                                    text-sky-100 hover:text-white
                                    dark:bg-sky-400/10 dark:hover:bg-sky-400/18 dark:border-sky-500/22
                                    dark:text-sky-200 dark:hover:text-white
                                    rounded-xl whitespace-normal transition-all duration-150 active:scale-[0.98]"
                                onClick={() => askAI(interfaceLanguage === 'ru' ? 'Объясни это' : 'Ayúdame a entender esto')}
                            >
                                <BookOpen className="w-4 h-4 shrink-0 text-sky-300" />
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
                    {messages.map((message, index) => {
                        if (message.content === '---') {
                            return (
                                <div key={message.id} className="flex items-center gap-3 py-4 opacity-50 px-2">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-400 dark:to-slate-600" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        {interfaceLanguage === 'ru' ? 'Новый вопрос' : 'Siguiente pregunta'}
                                    </span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-400 dark:to-slate-600" />
                                </div>
                            );
                        }

                        // Пустой assistant-placeholder нужен для typewriter,
                        // но визуально он не должен рисоваться как отдельный пузырь.
                        if (message.role === 'assistant' && !message.content) {
                            return null;
                        }

                        return (
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
                                    ? (isDarkTheme
                                        ? 'bg-slate-700 text-slate-50 rounded-2xl rounded-tr-none border border-white/5 shadow-[0_8px_24px_rgba(15,23,42,0.16)]'
                                        : 'bg-slate-200 text-slate-900 rounded-2xl rounded-tr-none border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)]')
                                    : (isDarkTheme
                                        ? 'bg-slate-800/90 backdrop-blur-md rounded-2xl rounded-tl-none border-white/5 text-slate-200'
                                        : 'bg-white/96 backdrop-blur-md rounded-2xl rounded-tl-none border-slate-200 text-slate-800')
                            )}>
                                {message.role === 'assistant' ? (
                                    <AIMessageContent
                                        content={message.content}
                                        onOpenPremium={() => {
                                            closeChat();
                                            openModal('PAYWALL');
                                        }}
                                    />
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
                                    <div className="flex items-center gap-0.5 mt-2">
                                        {/* Озвучить */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-6 w-6 rounded-lg transition-all duration-150",
                                                isSpeakingMessage(message.id)
                                                    ? "bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/20"
                                                    : "text-slate-400 dark:text-slate-500 hover:bg-black/6 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300",
                                            )}
                                            onClick={() => handleSpeakMessage(message.id, message.content)}
                                            aria-label={isSpeakingMessage(message.id)
                                                ? (interfaceLanguage === 'ru' ? 'Остановить' : 'Detener')
                                                : (interfaceLanguage === 'ru' ? 'Озвучить' : 'Escuchar')}
                                        >
                                            {isSpeakingMessage(message.id)
                                                ? <VolumeX className="w-3 h-3" />
                                                : <Volume2 className="w-3 h-3" />}
                                        </Button>
                                        {/* Лайк */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-6 w-6 rounded-lg transition-all duration-150",
                                                message.rating === 1
                                                    ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20"
                                                    : "text-slate-400 dark:text-slate-500 hover:bg-black/6 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300",
                                            )}
                                            onClick={() => {
                                                setMessageRating(message.id, 1);
                                                if (message.dbId) updateRating(message.dbId, 1);
                                            }}
                                            aria-label={interfaceLanguage === 'ru' ? 'Полезно' : 'Útil'}
                                        >
                                            <ThumbsUp className={cn("w-3 h-3 transition-all", message.rating === 1 && "fill-current")} />
                                        </Button>
                                        {/* Дизлайк */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-6 w-6 rounded-lg transition-all duration-150",
                                                message.rating === -1
                                                    ? "bg-red-500/15 text-red-500 hover:bg-red-500/20"
                                                    : "text-slate-400 dark:text-slate-500 hover:bg-black/6 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300",
                                            )}
                                            onClick={() => {
                                                setMessageRating(message.id, -1);
                                                if (message.dbId) updateRating(message.dbId, -1);
                                            }}
                                            aria-label={interfaceLanguage === 'ru' ? 'Не помогло' : 'No útil'}
                                        >
                                            <ThumbsDown className={cn("w-3 h-3 transition-all", message.rating === -1 && "fill-current")} />
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                        );
                    })}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start w-full"
                    >
                        <Card className={cn(
                            "p-3 backdrop-blur-sm rounded-2xl rounded-tl-sm",
                            isDarkTheme ? "bg-muted/80" : "bg-white border border-slate-200"
                        )}>
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
                            className={cn(
                                "text-xs whitespace-nowrap shrink-0 rounded-full backdrop-blur-sm",
                                isDarkTheme ? "bg-background/50" : "bg-slate-50 border border-slate-200"
                            )}
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
                className="px-4 pt-4 shrink-0 z-20"
                style={{
                    paddingBottom: keyboardOffset > 0 ? '18px' : 'max(env(safe-area-inset-bottom, 16px), 24px)',
                }}
            >
                {/* Image preview above input */}
                {pendingAttachment && (
                    <div className="mb-3 max-w-2xl mx-auto">
                        <div className="relative flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 backdrop-blur-sm">
                            {pendingAttachment.kind === 'image' && pendingAttachment.previewUrl ? (
                                <img
                                    src={pendingAttachment.previewUrl}
                                    alt=""
                                    className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/6 text-slate-200">
                                    <FileText className="h-5 w-5" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-100">{pendingAttachment.file.name}</p>
                                <p className="text-xs text-slate-400">
                                    {pendingAttachment.kind === 'image'
                                        ? (pendingAttachment.source === 'camera' ? takePhotoLabel : attachPhotoLabel)
                                        : attachDocumentLabel}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={removePendingAttachment}
                                className="rounded-full bg-slate-800 text-white p-1 transition-colors hover:bg-slate-700"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect('image', 'gallery')}
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect('image', 'camera')}
                />
                <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"
                    className="hidden"
                    onChange={handleFileSelect('document', 'document')}
                />

                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full">
                    {/* Внешний div — 1px градиентный кант (анимируется при фокусе).
                        Внутренний div — НЕПРОЗРАЧНЫЙ фон, перекрывает всё кроме 1px. */}
                    <div className="skily-glow-wrap rounded-[30px] shadow-[0_12px_30px_rgba(2,6,23,0.22)]">
                    <div className={cn(
                        "rounded-[29px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                        isDarkTheme ? "bg-[#121a2a]" : "bg-[#f0f4fa]"
                    )}>
                        <div className="flex min-h-[76px] items-center gap-2 px-3 py-3">
                            <DropdownMenu open={!isMobile && isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            if (isMobile) setIsAttachmentMenuOpen(true);
                                        }}
                                        className="shrink-0 h-10 w-10 rounded-full text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-slate-100 active:scale-95"
                                        aria-label={attachmentButtonLabel}
                                        title={attachmentButtonLabel}
                                    >
                                        <Paperclip className="w-[18px] h-[18px]" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    side="top"
                                    sideOffset={10}
                                    className="w-64 rounded-2xl border-white/10 bg-slate-900/96 p-2 text-slate-100 shadow-2xl backdrop-blur"
                                >
                                <DropdownMenuItem
                                    onClick={() => imageInputRef.current?.click()}
                                    className="rounded-xl px-3 py-3 text-sm focus:bg-white/6 focus:text-white"
                                >
                                    <ImagePlus className="mr-3 h-4 w-4 text-indigo-500" />
                                    {attachPhotoLabel}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="rounded-xl px-3 py-3 text-sm focus:bg-white/6 focus:text-white"
                                >
                                    <Camera className="mr-3 h-4 w-4 text-amber-400" />
                                    {takePhotoLabel}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => documentInputRef.current?.click()}
                                    className="rounded-xl px-3 py-3 text-sm focus:bg-white/6 focus:text-white"
                                >
                                    <FileText className="mr-3 h-4 w-4 text-slate-300" />
                                    {attachDocumentLabel}
                                </DropdownMenuItem>
                                <div className="px-3 pb-2 pt-1 text-[11px] leading-relaxed text-slate-400">
                                    {attachmentHint}
                                </div>
                                {pendingAttachment && (
                                    <DropdownMenuItem
                                        onClick={removePendingAttachment}
                                        className="rounded-xl px-3 py-3 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                    >
                                        <XCircle className="mr-3 h-4 w-4" />
                                        {removeAttachmentLabel}
                                    </DropdownMenuItem>
                                )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {isMobile && (
                                <Drawer open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                                    <DrawerContent className="px-3 pb-[max(env(safe-area-inset-bottom,12px),20px)]" hideHandle={false}>
                                        <div className="px-1 pt-2 pb-2">
                                            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                                {attachmentMenuTitle}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAttachmentMenuOpen(false);
                                                    imageInputRef.current?.click();
                                                }}
                                                className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                                            >
                                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                                                    <ImagePlus className="h-5 w-5" />
                                                </span>
                                                <span>{attachPhotoLabel}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAttachmentMenuOpen(false);
                                                    cameraInputRef.current?.click();
                                                }}
                                                className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                                            >
                                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                                                    <Camera className="h-5 w-5" />
                                                </span>
                                                <span>{takePhotoLabel}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAttachmentMenuOpen(false);
                                                    documentInputRef.current?.click();
                                                }}
                                                className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                                            >
                                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-slate-200">
                                                    <FileText className="h-5 w-5" />
                                                </span>
                                                <span>{attachDocumentLabel}</span>
                                            </button>
                                            <p className="px-4 pt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                                {attachmentHint}
                                            </p>
                                            {pendingAttachment && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        removePendingAttachment();
                                                        setIsAttachmentMenuOpen(false);
                                                    }}
                                                    className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                                >
                                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10">
                                                        <XCircle className="h-5 w-5" />
                                                    </span>
                                                    <span>{removeAttachmentLabel}</span>
                                                </button>
                                            )}
                                        </div>
                                    </DrawerContent>
                                </Drawer>
                            )}

                            <textarea
                                ref={inputRef}
                                value={input}
                                rows={1}
                                onChange={(e) => { if (!isRecording) setInput(e.target.value); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if ((input.trim() || pendingAttachment) && !isLoading) {
                                            (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                                        }
                                    }
                                }}
                                placeholder={
                                    isRecording
                                        ? (interfaceLanguage === 'ru' ? '🎙 Слушаю...' : '🎙 Escuchando...')
                                        : isProcessingVoice
                                            ? (interfaceLanguage === 'ru' ? 'Распознаю...' : 'Reconociendo...')
                                            : composerPlaceholder
                                }
                                readOnly={isRecording || isProcessingVoice}
                                disabled={isLoading}
                                className={cn(
                                    "min-w-0 flex-1 h-auto max-h-32 bg-transparent text-base resize-none overflow-y-auto leading-[1.4] py-2 px-0 focus:outline-none selection:text-white",
                                    isDarkTheme
                                        ? "text-slate-100 placeholder:text-slate-500 selection:bg-white/10"
                                        : "text-slate-900 placeholder:text-slate-400 selection:bg-slate-900/10",
                                    isRecording ? (isDarkTheme ? "text-slate-50" : "text-slate-950") : ""
                                )}
                                style={{ fontSize: '16px' }}
                            />
                            <Button
                                type={isRecording ? 'button' : hasComposerContent ? 'submit' : 'button'}
                                onClick={isRecording || isProcessingVoice ? () => toggleVoiceInput() : hasComposerContent ? undefined : () => toggleVoiceInput(input)}
                                disabled={isLoading || isProcessingVoice}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "relative shrink-0 h-12 w-12 rounded-full border transition-all duration-200 active:scale-[0.97] overflow-hidden backdrop-blur-md",
                                    isRecording
                                        ? isDarkTheme
                                            ? "border-white/10 bg-white/[0.06] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_22px_rgba(2,6,23,0.22)]"
                                            : "border-slate-900/10 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                                        : hasComposerContent
                                        ? isDarkTheme
                                            ? "border-white/10 bg-white/[0.05] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_22px_rgba(2,6,23,0.22)] hover:bg-white/[0.08]"
                                            : "border-slate-900/10 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800"
                                        : isProcessingVoice
                                            ? isDarkTheme
                                                ? "border-white/10 bg-white/[0.05] text-white/90 cursor-wait shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                                : "border-slate-900/10 bg-slate-900/80 text-white cursor-wait shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                                            : isDarkTheme
                                                ? "border-white/8 bg-white/[0.03] text-white/85 hover:bg-white/[0.06] hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                                : "border-slate-900/10 bg-slate-900 text-white hover:bg-slate-800 shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                                )}
                                aria-label={isRecording ? (interfaceLanguage === 'ru' ? 'Остановить запись' : 'Detener grabación') : hasComposerContent ? sendLabel : voiceInputLabel}
                                title={isRecording ? (interfaceLanguage === 'ru' ? 'Остановить запись' : 'Detener grabación') : hasComposerContent ? sendLabel : voiceInputLabel}
                            >
                                <span className={cn(
                                    "absolute inset-0 rounded-full pointer-events-none",
                                    isDarkTheme
                                        ? "bg-gradient-to-b from-white/[0.06] to-transparent opacity-65"
                                        : "bg-gradient-to-b from-white/10 to-transparent opacity-45"
                                )} />
                                {isRecording && (
                                    <span className="absolute inset-0 rounded-full animate-pulse bg-red-400/8 pointer-events-none" />
                                )}
                                <AnimatePresence mode="wait" initial={false}>
                                    {isLoading ? (
                                        <motion.span
                                            key="loading"
                                            initial={{ opacity: 0, scale: 0.82, y: 2 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.82, y: -2 }}
                                            transition={{ duration: 0.16, ease: 'easeOut' }}
                                            className="relative z-10"
                                        >
                                            <Loader2 className="w-[18px] h-[18px] animate-spin text-white/90" />
                                        </motion.span>
                                    ) : isRecording ? (
                                        <motion.span
                                            key="recording"
                                            initial={{ opacity: 0, scale: 0.82, y: 2 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.82, y: -2 }}
                                            transition={{ duration: 0.16, ease: 'easeOut' }}
                                            className="relative z-10"
                                        >
                                            <MicOff className="w-[17px] h-[17px] text-white/95" strokeWidth={2} />
                                        </motion.span>
                                    ) : hasComposerContent ? (
                                        <motion.span
                                            key="send"
                                            initial={{ opacity: 0, scale: 0.82, rotate: -10, y: 2 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.82, rotate: 10, y: -2 }}
                                            transition={{ duration: 0.18, ease: 'easeOut' }}
                                            className="relative z-10"
                                        >
                                            <Send className="w-[18px] h-[18px] translate-x-[0.5px] text-white/95" strokeWidth={2} />
                                        </motion.span>
                                    ) : isProcessingVoice ? (
                                        <motion.span
                                            key="processing"
                                            initial={{ opacity: 0, scale: 0.82, y: 2 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.82, y: -2 }}
                                            transition={{ duration: 0.16, ease: 'easeOut' }}
                                            className="relative z-10"
                                        >
                                            <Loader2 className="w-[18px] h-[18px] animate-spin text-white/90" />
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="idle"
                                            initial={{ opacity: 0, scale: 0.82, y: 2 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.82, y: -2 }}
                                            transition={{ duration: 0.16, ease: 'easeOut' }}
                                            className="relative z-10"
                                        >
                                            <Mic className="w-[17px] h-[17px] text-white/90" strokeWidth={2} />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </div>
                        {microphoneHint && (
                            <div className="px-4 pb-3 pt-0">
                                <p className="text-[11px] leading-relaxed text-amber-300/85">
                                    {microphoneHint}
                                </p>
                            </div>
                        )}
                    </div>{/* /bg-[#121a2a] inner */}
                    </div>{/* /skily-glow-wrap outer */}
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
                    className={cn(
                        "w-full max-w-xl p-0 flex flex-col rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md",
                        isDarkTheme
                            ? "border border-white/8 bg-[#121a2a]/98 text-slate-100"
                            : "border border-slate-200 bg-white/98 text-slate-900"
                    )}
                    style={{
                        height: '80vh',
                        maxHeight: '700px',
                        backgroundColor: isDarkTheme ? '#121a2a' : '#ffffff',
                        color: isDarkTheme ? '#e2e8f0' : '#0f172a',
                    }}
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
