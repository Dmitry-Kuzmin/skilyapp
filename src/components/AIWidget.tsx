import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Maximize2, Minimize2, Languages, ThumbsUp, ThumbsDown, Mic, MicOff, Zap, Crown, Paperclip, ImagePlus, Camera, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SkilyAICharacter } from "@/components/skily-ai/SkilyAICharacter";
import { useAIRequest, uploadChatAttachment } from "@/hooks/useAIRequest";
import { useTypewriter } from "@/hooks/useTypewriter";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from 'sonner';
import { triggerHapticFeedback } from "@/lib/telegram";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { AILimitReachedModal } from "@/components/ai/AILimitReachedModal";
import { useModalStore } from "@/store/modalStore";
import { usePremium } from "@/hooks/usePremium";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDuelPassData } from "@/hooks/useDuelPassData";
import { useTTSStore } from "@/store/useTTSStore";
import { AIMessageContent } from "@/components/ai/AIMessageContent";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PendingAttachment = {
  file: File;
  kind: 'image';
  source: 'gallery' | 'camera';
  previewUrl?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface AIWidgetProps {
  id?: string | null;
  explanation?: string | null;
  explanationRu?: string | null;
  explanationEs?: string | null;
  explanationEn?: string | null;
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  isCorrect: boolean;
  topic?: string;
  imageUrl?: string | null;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  testLanguage?: 'es' | 'en' | 'ru';
  country?: 'spain' | 'russia';
  questionIndex?: number;
  totalQuestions?: number;
}

export const AIWidget = (props: AIWidgetProps) => {
  const { enabled: aiEnabled } = useFeatureFlag('ai_chat_enabled', true);

  // Feature flag: не показываем виджет если AI чат отключён
  if (!aiEnabled) return null;

  return <AIWidgetContent {...props} />;
};

// ─── Personalized greeting builder ────────────────────────────────────────────

interface GreetingContext {
  interfaceLanguage: 'ru' | 'es' | 'en';
  country: 'spain' | 'russia';
  questionIndex?: number;
  totalQuestions?: number;
  topic?: string;
  seasonName: string | null;
  seasonPoints: number | null;
  errorsCount: number | null;
  totalAnswered: number | null;
}

function buildPersonalizedGreeting(ctx: GreetingContext): string {
  const { interfaceLanguage: lang, country, questionIndex, totalQuestions, topic,
    seasonName, seasonPoints, errorsCount, totalAnswered } = ctx;

  const isRu = lang === 'ru';
  const isEs = lang === 'es';

  // ── Question position line ──────────────────────────────────────────────────
  let questionLine = '';
  if (questionIndex != null && totalQuestions != null) {
    if (questionIndex === 0) {
      questionLine = isRu
        ? `Вижу, ты только начал — вопрос 1 из ${totalQuestions}.`
        : isEs
          ? `Veo que acabas de empezar — pregunta 1 de ${totalQuestions}.`
          : `I see you're just starting — question 1 of ${totalQuestions}.`;
    } else if (questionIndex < Math.floor(totalQuestions / 2)) {
      questionLine = isRu
        ? `Уже на вопросе ${questionIndex + 1} из ${totalQuestions}, хороший темп! 🔥`
        : isEs
          ? `Ya vas por la pregunta ${questionIndex + 1} de ${totalQuestions}, ¡buen ritmo! 🔥`
          : `You're on question ${questionIndex + 1} of ${totalQuestions}, good pace! 🔥`;
    } else {
      questionLine = isRu
        ? `Вопрос ${questionIndex + 1} из ${totalQuestions} — финишная прямая! 💪`
        : isEs
          ? `Pregunta ${questionIndex + 1} de ${totalQuestions} — ¡recta final! 💪`
          : `Question ${questionIndex + 1} of ${totalQuestions} — final stretch! 💪`;
    }
  }

  // ── Topic line ──────────────────────────────────────────────────────────────
  const topicLine = topic
    ? (isRu ? `Тема: «${topic}» — спроси если что-то непонятно.`
      : isEs ? `Tema: «${topic}» — pregúntame si algo no queda claro.`
        : `Topic: "${topic}" — ask me if anything's unclear.`)
    : '';

  // ── Season line (shown ~50% of the time to avoid repetition) ───────────────
  let seasonLine = '';
  // Use questionIndex as deterministic seed so same question = same greeting
  const seed = (questionIndex ?? 0) + (totalAnswered ?? 0);
  const showSeasonHint = (seed % 2 === 0) && !!seasonName;

  if (showSeasonHint && seasonName) {
    if (seasonPoints === 0 || seasonPoints === null) {
      seasonLine = isRu
        ? `Кстати, идёт сезон «${seasonName}» — зарабатывай SP в дуэлях и открывай награды! ⚔️`
        : isEs
          ? `Por cierto, la temporada «${seasonName}» está activa — ¡gana SP en duelos y desbloquea premios! ⚔️`
          : `By the way, season "${seasonName}" is live — earn SP in duels and unlock rewards! ⚔️`;
    } else {
      seasonLine = isRu
        ? `Сезон «${seasonName}»: у тебя уже ${seasonPoints} SP — продолжай в том же духе! 🏆`
        : isEs
          ? `Temporada «${seasonName}»: ya tienes ${seasonPoints} SP — ¡sigue así! 🏆`
          : `Season "${seasonName}": you already have ${seasonPoints} SP — keep it up! 🏆`;
    }
  }

  // ── Error bank nudge (only if >10 errors and shown on odd seed) ─────────────
  let errorNudge = '';
  if (!showSeasonHint && errorsCount != null && errorsCount > 10 && seed % 3 === 1) {
    errorNudge = isRu
      ? `У тебя ${errorsCount} ошибок в банке — разбери их с моей помощью после теста.`
      : isEs
        ? `Tienes ${errorsCount} errores en el banco — repásalos conmigo después del test.`
        : `You have ${errorsCount} errors in the bank — review them with me after the test.`;
  }

  // ── Base greeting ───────────────────────────────────────────────────────────
  const base = isRu
    ? (country === 'russia'
      ? 'Привет! Я Скили — твой эксперт по ПДД РФ 🚗'
      : 'Привет! Я Скили — твой эксперт по правилам DGT 🚗')
    : isEs
      ? '¡Hola! Soy Skily, tu experto en el reglamento DGT 🚗'
      : 'Hi! I\'m Skily — your DGT driving rules expert 🚗';

  const closing = isRu
    ? 'Задавай вопросы — объясню логику, а не просто дам ответ.'
    : isEs
      ? 'Pregúntame lo que necesites — te explico la lógica, no solo la respuesta.'
      : 'Ask me anything — I\'ll explain the logic, not just the answer.';

  return [base, questionLine, topicLine, seasonLine || errorNudge, closing]
    .filter(Boolean)
    .join('\n\n');
}

// Внутренний компонент: все хуки вызываются безусловно (правила React)
const AIWidgetContent = ({
  id,
  explanation,
  explanationRu,
  explanationEs,
  explanationEn,
  question,
  correctAnswer,
  userAnswer,
  isCorrect,
  topic,
  imageUrl,
  showTranslation = false,
  onToggleTranslation,
  testLanguage = 'es',
  country = 'spain',
  questionIndex,
  totalQuestions,
}: AIWidgetProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isSpeaking = useTTSStore((s) => s.isSpeaking);
  const { sendRequest } = useAIRequest();
  const typewriter = useTypewriter({ charsPerSecond: 60 });
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [messageRatings, setMessageRatings] = useState<Record<number, 1 | -1>>({});
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitData, setLimitData] = useState({ currentCount: 0, limit: 5, message: '' });
  const openModal = useModalStore((s) => s.openModal);
  const { isPremium } = usePremium();
  const { profileId } = useUserContext();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceBaselineInputRef = useRef('');
  const voiceFinalTranscriptRef = useRef('');
  const speechRecognitionEnabledRef = useRef(false);
  const speechRecognitionFailedRef = useRef(false);
  const { refreshPermission: refreshMicrophonePermission, isDenied: isMicrophoneDenied } = useMicrophonePermission();
  const clearVoiceDraft = useCallback(() => {
    voiceBaselineInputRef.current = '';
    voiceFinalTranscriptRef.current = '';
    speechRecognitionEnabledRef.current = false;
    speechRecognitionFailedRef.current = false;
  }, []);

  // Personalization context — reads from already-loaded React Query cache, no extra requests
  const { data: dashboardData } = useDashboardData();
  const { data: duelPassResult } = useDuelPassData(profileId);

  // Message limit query
  // ВАЖНО: p_user_id = auth.users.id (не profiles.id!), т.к. daily_ai_usage.user_id → auth.users
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
    enabled: !!profileId,
    staleTime: 0,
  });

  // RPC returns: { current_count, remaining, limit_reached }
  const aiUsed = aiUsage?.current_count ?? 0;
  const aiRemaining = aiUsage?.remaining ?? (isPremium ? 999 : 5);
  const aiLimit = isPremium ? 999 : Math.max(aiUsed, 5);
  const aiLimitReached = aiUsage?.limit_reached ?? false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { t, language: profileLanguage } = useLanguage();

  // Язык AI: приоритет → страна Russia / showTranslation → язык профиля пользователя → язык теста
  // Логика: если пользователь говорит по-русски — AI объясняет по-русски, даже если вопросы на испанском
  const interfaceLanguage: 'ru' | 'es' | 'en' = (country === 'russia' || testLanguage === 'ru' || showTranslation)
    ? 'ru'
    : (profileLanguage === 'ru' || profileLanguage === 'en')
      ? profileLanguage as 'ru' | 'en'
      : (testLanguage ?? 'es');

  const pickRecorderMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    const MR: any = typeof window !== 'undefined' && (window as any).MediaRecorder || null;
    if (MR?.isTypeSupported) {
      for (const m of candidates) if (MR.isTypeSupported(m)) return m;
    }
    return '';
  };

  const startRecording = async () => {
    const permission = await refreshMicrophonePermission();
    if (permission === 'unsupported' || !navigator.mediaDevices?.getUserMedia) {
      toast.error(interfaceLanguage === 'ru' ? 'Браузер не поддерживает запись голоса' : 'El navegador no soporta grabación de voz');
      return;
    }
    if (permission === 'denied') {
      toast.error(interfaceLanguage === 'ru'
        ? 'Доступ к микрофону отключён. Разреши в настройках сайта.'
        : 'El acceso al micrófono está bloqueado. Permítelo en los ajustes del sitio.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast.error(interfaceLanguage === 'ru' ? 'Нет доступа к микрофону' : 'Sin acceso al micrófono');
      return;
    }

    const mimeType = pickRecorderMime();
    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];
    voiceBaselineInputRef.current = input.trim();
    voiceFinalTranscriptRef.current = '';
    speechRecognitionFailedRef.current = false;
    speechRecognitionEnabledRef.current = false;

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = interfaceLanguage === 'ru' ? 'ru-RU' : interfaceLanguage === 'en' ? 'en-US' : 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = true;
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
            voiceFinalTranscriptRef.current = voiceFinalTranscriptRef.current
              ? `${voiceFinalTranscriptRef.current} ${finalDelta}` : finalDelta;
          }
          const live = [voiceFinalTranscriptRef.current, interimTranscript].filter(Boolean).join(' ').trim();
          setInput([voiceBaselineInputRef.current, live].filter(Boolean).join(' ').trim());
        };
        recognition.onerror = () => { speechRecognitionFailedRef.current = true; };
        recognition.onend = () => { recognitionRef.current = null; };
        recognitionRef.current = recognition;
        speechRecognitionEnabledRef.current = true;
        recognition.start();
      } catch { speechRecognitionEnabledRef.current = false; }
    }

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mediaRecorder.onstop = async () => {
      const usedMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: usedMime });
      stream.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop?.();
      recognitionRef.current = null;
      setIsRecording(false);

      if (audioBlob.size < 2048) {
        toast.message(interfaceLanguage === 'ru' ? 'Запись слишком короткая' : 'Grabación demasiado corta');
        return;
      }

      const liveTranscript = [voiceBaselineInputRef.current, voiceFinalTranscriptRef.current].filter(Boolean).join(' ').trim();
      const shouldFallback = !speechRecognitionEnabledRef.current || speechRecognitionFailedRef.current || !liveTranscript;
      if (!shouldFallback) { setInput(liveTranscript); triggerHapticFeedback('success'); return; }

      setIsProcessingVoice(true);
      try {
        const ext = usedMime.includes('mp4') ? 'mp4' : usedMime.includes('ogg') ? 'ogg' : 'webm';
        const formData = new FormData();
        formData.append('file', audioBlob, `voice.${ext}`);
        const { data, error } = await supabase.functions.invoke('speech-to-text', { body: formData });
        if (error) throw error;
        const recognised = (data?.text || '').trim();
        if (recognised) {
          setInput(prev => { const t = prev.trim(); return t ? `${t} ${recognised}` : recognised; });
          triggerHapticFeedback('success');
          setTimeout(() => textareaRef.current?.focus(), 150);
        } else {
          toast.message(interfaceLanguage === 'ru' ? 'Ничего не услышал — попробуйте ещё раз' : 'No te he entendido, inténtalo de nuevo');
        }
      } catch {
        toast.error(interfaceLanguage === 'ru' ? 'Не удалось распознать речь' : 'No se pudo reconocer la voz');
      } finally { setIsProcessingVoice(false); }
    };

    mediaRecorder.start();
    setIsRecording(true);
    triggerHapticFeedback('light');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      triggerHapticFeedback('medium');
    }
  };

  const toggleVoiceInput = () => { if (isRecording) stopRecording(); else startRecording(); };

  const handleFileSelect = (source: 'gallery' | 'camera') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment({ file, kind: 'image', source, previewUrl: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const removePendingAttachment = () => {
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
  };

  const hasComposerContent = Boolean(input.trim() || pendingAttachment);

  // Показываем explanation из БД при загрузке
  // Используем правильный язык: приоритет showTranslation, затем explanation (уже зависит от testLanguage)
  useEffect(() => {
    if (messages.length === 0) {
      let explanationToShow = null;

      // Приоритет: showTranslation > explanation (который уже зависит от testLanguage)
      if (showTranslation && explanationRu && explanationRu.trim()) {
        explanationToShow = explanationRu;
      } else if (explanation && explanation.trim()) {
        // explanation уже содержит правильный язык в зависимости от testLanguage
        explanationToShow = explanation;
      }

      if (explanationToShow && explanationToShow.trim()) {
        setMessages([
          {
            role: "assistant",
            content: explanationToShow
          }
        ]);
      }
    }
  }, [explanation, explanationRu, explanationEs, explanationEn, showTranslation]);

  // Обновляем первое сообщение при изменении showTranslation (если это explanation из БД)
  useEffect(() => {
    if (messages.length > 0 && messages[0]?.role === 'assistant') {
      // Проверяем, что это explanation из БД (не AI ответ)
      const isDbExplanation = explanationRu || explanationEs || explanationEn || explanation;
      if (isDbExplanation) {
        let explanationToShow = null;

        if (showTranslation && explanationRu) {
          explanationToShow = explanationRu;
        } else if (explanation) {
          explanationToShow = explanation;
        }

        if (explanationToShow && messages[0].content !== explanationToShow) {
          setMessages(prev => {
            const updated = [...prev];
            updated[0] = { ...updated[0], content: explanationToShow };
            return updated;
          });
        }
      }
    }
  }, [showTranslation, explanation, explanationRu, explanationEs, explanationEn]);

  // Сброс при смене вопроса (используем ID как надежный идентификатор)
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsExpanded(false);
  }, [id || question]);

  // Измеряем высоту всего блока тестов и ограничиваем максимальную высоту виджета
  useEffect(() => {
    if (!widgetRef.current) return;

    // Находим весь блок тестов по data-testid (включает Question Card + кнопки навигации + кнопку Reportar problema)
    const testBlock = document.querySelector('[data-testid="test-content-block"]') as HTMLElement;

    if (!testBlock) {
      // Fallback: ищем родительский grid-контейнер и первую колонку
      const gridContainer = widgetRef.current.closest('[class*="grid"]');
      if (gridContainer) {
        const firstChild = gridContainer.firstElementChild as HTMLElement;
        if (firstChild && firstChild !== widgetRef.current.closest('.lg\\:flex')?.parentElement) {
          // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для избежания forced layout
          const updateMaxHeight = () => {
            requestAnimationFrame(() => {
              const blockHeight = firstChild.offsetHeight;
              if (blockHeight > 0) {
                setMaxHeight(blockHeight);
              }
            });
          };

          updateMaxHeight();
          const resizeObserver = new ResizeObserver(updateMaxHeight);
          resizeObserver.observe(firstChild);
          resizeObserver.observe(gridContainer as HTMLElement);

          return () => resizeObserver.disconnect();
        }
      }
      return;
    }

    // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для избежания forced layout
    const updateMaxHeight = () => {
      // Батчим чтение layout свойств в requestAnimationFrame
      requestAnimationFrame(() => {
        const blockHeight = testBlock.offsetHeight;
        if (blockHeight > 0) {
          setMaxHeight(blockHeight);
        }
      });
    };

    // Обновляем высоту при загрузке и изменении размера
    updateMaxHeight();

    const resizeObserver = new ResizeObserver(() => {
      // ResizeObserver уже вызывается в правильное время, но всё равно батчим
      updateMaxHeight();
    });

    resizeObserver.observe(testBlock);

    // Также наблюдаем за Question Card для надежности
    const questionCard = document.querySelector('[data-testid="question-card"]');
    if (questionCard) {
      resizeObserver.observe(questionCard as HTMLElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [question, isExpanded]);

  // Авто-высота textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  const askAI = async (userMessage: string, imageFile?: File) => {
    if (!isPremium && aiLimitReached) {
      setLimitData({ currentCount: aiUsed, limit: 5, message: '' });
      setLimitModalOpen(true);
      return;
    }
    setIsLoading(true);

    let uploadedImageUrl: string | null = null;
    if (imageFile && profileId) {
      if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
      setPendingAttachment(null);
      uploadedImageUrl = await uploadChatAttachment(imageFile, profileId);
    }

    // Адаптивный контекст и системный промпт в зависимости от страны
    const getRussiaSystemPrompt = () => `
# Роль
Ты — Skily, профессиональный и эмпатичный ИИ-инструктор по вождению, эксперт по Правилам дорожного движения Российской Федерации (ПДД РФ). Твоя цель — помочь ученику понять логику дороги, выучить правила и успешно сдать теоретический экзамен в ГИБДД.

# База знаний
1. Твои знания основаны исключительно на актуальных ПДД РФ (последняя редакция 2024-2025 гг.), КоАП РФ и официальных билетах ГИБДД.
2. Ты знаешь номера знаков (например, 3.27 "Остановка запрещена"), типы разметки и пункты правил.
3. Ты игнорируешь правила других стран, если тебя специально не спросят о сравнении.

# Стиль общения
1. **Не давай прямой ответ сразу.** Твоя задача — научить думать. Наводящими вопросами подталкивай ученика к правильному решению.
2. **Объясняй "почему".** Не просто цитируй сухой закон. Объясни логику безопасности: почему это правило существует?
3. **Ссылайся на пункты.** Когда пользователь выбрал ответ (или просит объяснения), укажи конкретный пункт ПДД (например, "п. 8.5") или номер знака. Это повышает доверие.
4. **Тон.** Дружелюбный, поддерживающий, но строгий в вопросах безопасности. Используй эмодзи (🚗, 🛑, 💡), но не перебарщивай.
5. **Краткость.** В чате мало места. Пиши лаконично, разбивай текст на абзацы.

# Сценарии

## Если ученик просит подсказку (userAnswer отсутствует):
**НИКОГДА не говори "Не переживай из-за ошибки" или "Ничего страшного, что ошибся", если ответа еще нет!** 
Вместо этого используй фразы: "Давай разберемся вместе", "Хороший вопрос, давай посмотрим на детали", "Даю наводку:".
Твоя цель — направить внимание на ключевой дорожный знак или ситуацию.
ЗАПРЕЩЕНО называть номер правильного ответа.

## Если ученик ошибся (userAnswer есть и isCorrect=false):
Мягко укажи на ошибку. "Не совсем так. Ты подумал про помеху справа, но здесь действует знак 'Главная дорога'. Посмотри пункт 13.9 ПДД."
Здесь уместно поддержать ученика.

## Если ученик спрашивает "А в жизни так же?":
Честно отвечай, как это работает на практике в России (ДДД - Дай Дорогу Дураку), но подчеркивай, что на экзамене мы отвечаем строго по книжке.

# Безопасность прежде всего
Всегда напоминай, что главная цель — не сдать тест, а выжить на дороге и не навредить другим.
`;

    const getSpainSystemPrompt = () => `
Eres Skily, un instructor de conducción amigable y experto en las normativas de tráfico de España (DGT). Tu objetivo es ayudar al estudiante a comprender la lógica de conducción segura y aprobar el examen teórico.

Estilo de comunicación:
1. Sé claro y directo, pero nunca des la respuesta correcta de inmediato. Guía al estudiante con preguntas reflexivas.
2. Explica el "por qué" detrás de cada regla: la seguridad es lo primero.
3. Referencias específicas: Menciona señales por número (ej. R-101), artículos de la Ley de Tráfico, o normas DGT cuando sea relevante.
4. Tono cercano y motivador. Usa emojis (🚗, 🛑, 💡) con moderación.
5. Respuestas breves: el espacio en el chat es limitado.

Escenarios:
- **Si el estudiante pide ayuda (userAnswer no existe):** ¡NO digas "no te preocupes por el error"! No hay error todavía. Guía con preguntas brillantes. PROHIBIDO dar la respuesta directa.
- Si el estudiante se equivoca: Señala el error con tacto y explica la lógica.
- Si pregunta sobre la práctica real: Sé honesto sobre cómo es en la carretera, pero recuerda que en el examen debes responder según el reglamento.

Siempre recuerda: la meta no es solo aprobar, sino conducir con seguridad.
`;

    // Выбираем промпт в зависимости от СТРАНЫ (не языка UI)
    const systemPrompt = country === 'russia'
      ? getRussiaSystemPrompt()
      : getSpainSystemPrompt();

    const context = `
${systemPrompt}

# ${interfaceLanguage === 'ru' ? 'Информация о текущем вопросе' : interfaceLanguage === 'en' ? 'Current Question Info' : 'Información sobre la pregunta actual'}:
${interfaceLanguage === 'ru' ? 'Вопрос' : interfaceLanguage === 'en' ? 'Question' : 'Pregunta'}: ${question}
${interfaceLanguage === 'ru' ? 'Правильный ответ' : interfaceLanguage === 'en' ? 'Correct Answer' : 'Respuesta correcta'}: ${correctAnswer}
${userAnswer ? `${interfaceLanguage === 'ru' ? 'Ответ пользователя' : interfaceLanguage === 'en' ? 'User Answer' : 'Respuesta del usuario'}: ${userAnswer}` : ''}
${interfaceLanguage === 'ru' ? 'Результат' : interfaceLanguage === 'en' ? 'Result' : 'Resultado'}: ${userAnswer ? (isCorrect ? (interfaceLanguage === 'ru' ? 'ПРАВИЛЬНО ✅' : 'CORRECTO ✅') : (interfaceLanguage === 'ru' ? 'НЕПРАВИЛЬНО ❌' : 'INCORRECTO ❌')) : (interfaceLanguage === 'ru' ? 'Ещё не отвечено (нужна подсказка) 💡' : 'Still searching for answer (needs a hint) 💡')}
${topic ? `${interfaceLanguage === 'ru' ? 'Тема' : interfaceLanguage === 'en' ? 'Topic' : 'Tema'}: ${topic}` : ''}
${explanation ? `\n${interfaceLanguage === 'ru' ? 'Официальное объяснение из базы' : interfaceLanguage === 'en' ? 'Official Explanation' : 'Explicación oficial'}: ${explanation}` : ''}
${imageUrl ? `\n⚠️ К вопросу есть иллюстрация — она уже передана в API как изображение. Используй её содержимое в объяснении.` : ''}
`;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    // Strip leading assistant messages (e.g. greeting) — Gemini requires first turn to be 'user'
    const apiMessages = newMessages[0]?.role === 'assistant'
      ? newMessages.slice(1)
      : newMessages;

    // Typewriter throttle — печатаем ответ AI со скоростью 60 chars/sec,
    // даже если Gemini Flash отдал всё за полсекунды (одинаковый UX в обоих чатах)
    typewriter.start((slice) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { role: 'assistant', content: last.content + slice };
        }
        return updated;
      });
    });

    await sendRequest(
      {
        messages: [{ role: 'system', content: context }, ...apiMessages],
        country,
        language: interfaceLanguage,
        imageUrl: uploadedImageUrl || imageUrl || null,
      },
      {
        onChunk: (text) => typewriter.push(text),
        onDone: () => { typewriter.finish(); },
        onLimitReached: (data) => {
          typewriter.cancel();
          setLimitData({ currentCount: data.currentCount, limit: data.limit, message: data.message || '' });
          setLimitModalOpen(true);
          setMessages(prev => prev.slice(0, -1));
        },
        onError: () => {
          typewriter.cancel();
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: interfaceLanguage === 'ru' ? "Произошла ошибка. Попробуйте ещё раз." : interfaceLanguage === 'en' ? "An error occurred. Please try again." : "Ocurrió un error. Por favor, inténtalo de nuevo.",
            };
            return updated;
          });
        },
      },
    );
    setIsLoading(false);
    if (!isPremium) refetchUsage();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isProcessingVoice) return;
    if (isRecording) { stopRecording(); return; }
    if (!input.trim() && !pendingAttachment) return;

    const userMessage = input.trim();
    const imageFile = pendingAttachment?.file;
    setInput('');
    clearVoiceDraft();
    askAI(userMessage, imageFile);
  };

  const submitFeedback = async (messageIndex: number, rating: 1 | -1) => {
    if (messageRatings[messageIndex]) return; // Уже оценено

    try {
      triggerHapticFeedback(rating === 1 ? 'success' : 'error');

      // Здесь можно отправить feedback на сервер
      // const { data: { session } } = await supabase.auth.getSession();
      // await supabase.from('ai_feedback').insert({
      //   message_index: messageIndex,
      //   rating: rating,
      //   question_id: questionId,
      //   ...
      // });

      setMessageRatings(prev => ({ ...prev, [messageIndex]: rating }));

      // Используем правильный API для sonner
      if (rating === 1) {
        toast.success(interfaceLanguage === 'ru' ? "Спасибо за отзыв!" : "¡Gracias por tu comentario!", {
          description: interfaceLanguage === 'ru' ? "Ваш лайк помогает улучшить ответы" : "Tu me gusta ayuda a mejorar las respuestas",
          duration: 2000,
        });
      } else {
        toast.info(interfaceLanguage === 'ru' ? "Спасибо за обратную связь!" : "¡Gracias por tus comentarios!", {
          description: interfaceLanguage === 'ru' ? "Мы учтем ваше мнение" : "Tendremos en cuenta tu opinión",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  return (
    <>
      <Card
        ref={widgetRef}
        className={cn(
          "flex flex-col overflow-hidden border shadow-lg transition-all duration-300 rounded-2xl",
          "bg-card border-border/50",
          "dark:bg-slate-800/95 dark:border-white/10 dark:shadow-xl",
          isExpanded ? "" : "h-auto"
        )}
        style={{
          ...(isExpanded && maxHeight ? {
            height: `${maxHeight}px`,
            maxHeight: `${maxHeight}px`,
            overflow: 'hidden'
          } : maxHeight ? {
            maxHeight: `${maxHeight}px`,
            overflow: 'hidden'
          } : {})
        }}
      >
        {/* Header */}
        <div className="p-3 xl:p-4 border-b flex items-center shrink-0 gap-3 bg-muted/30 dark:bg-slate-900/50 dark:border-white/5">
          <div className="flex items-center gap-2 xl:gap-3 min-w-0 flex-1">
            <div className="relative w-8 h-8 xl:w-10 xl:h-10 flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105">
              {isSpeaking && (
                <>
                  <span className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <span className="absolute inset-[-4px] rounded-full border border-purple-400/40 animate-pulse" />
                </>
              )}
              <SkilyAICharacter size="sm" mood="happy" className="scale-75" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm xl:text-base text-foreground dark:text-slate-100 truncate">
                {interfaceLanguage === 'ru' ? 'Skily AI' : 'Skily AI'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <Crown className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">PRO</span>
              </div>
            ) : aiUsage !== null ? (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all shadow-sm",
                aiRemaining <= 1
                  ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse"
                  : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              )}>
                <Zap className={cn("w-2.5 h-2.5", aiRemaining <= 1 ? "fill-current" : "")} />
                <span className="text-[10px] font-bold">
                  {aiRemaining}/{aiLimit}
                </span>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 xl:h-8 xl:w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? (interfaceLanguage === 'ru' ? t('lumiCollapse') : interfaceLanguage === 'en' ? 'Collapse' : 'Contraer') : (interfaceLanguage === 'ru' ? t('lumiExpand') : interfaceLanguage === 'en' ? 'Expand' : 'Expandir')}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" /> : <Maximize2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" />}
            </Button>
          </div>
        </div>

        {/* Messages Area - фиксированная высота с скроллом */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4 xl:p-5 space-y-4 xl:space-y-6 scroll-smooth min-h-0 relative transition-colors duration-500",
          "bg-[#F8FAFF] dark:bg-slate-900/40"
        )}>
          {/* Subtle noise texture */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(rgba(15,23,42,0.8) 0.8px, transparent 0.8px)",
              backgroundSize: "10px 10px",
            }}
          ></div>

          {messages.length === 0 ? (
            <div className="space-y-4 xl:space-y-5">
              {/* Welcome Message — personalized */}
              <div className="text-foreground dark:text-slate-200 text-xs xl:text-sm leading-relaxed whitespace-pre-line">
                <p>
                  {buildPersonalizedGreeting({
                    interfaceLanguage,
                    country,
                    questionIndex,
                    totalQuestions,
                    topic,
                    seasonName: duelPassResult?.seasonData?.name_ru ?? null,
                    seasonPoints: dashboardData?.season_progress?.season_points ?? null,
                    errorsCount: dashboardData?.challenge_stats?.errors ?? null,
                    totalAnswered: dashboardData?.stats?.total_answered ?? null,
                  })}
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 xl:gap-2.5">
                <Button
                  variant="outline"
                  className="h-auto py-2 xl:py-2.5 px-2.5 xl:px-3 text-[10px] xl:text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg whitespace-normal break-words"
                  onClick={() => {
                    // "Дай мне подсказку" - запрашиваем подсказку у AI (не правильный ответ)
                    const hintPrompt = interfaceLanguage === 'ru'
                      ? "Дай мне подсказку к этому вопросу, но не говори правильный ответ напрямую. Помоги мне подумать самостоятельно."
                      : interfaceLanguage === 'en'
                        ? "Give me a hint for this question, but don't tell me the correct answer directly. Help me think independently."
                        : "Dame una pista para esta pregunta, pero no me digas la respuesta correcta directamente. Ayúdame a pensar por mí mismo.";
                    askAI(hintPrompt);
                  }}
                  disabled={isLoading}
                >
                  {interfaceLanguage === 'ru' ? t('lumiHintButton') :
                    interfaceLanguage === 'en' ? 'Give me a hint' :
                      'Dame una pista'}
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-2 xl:py-2.5 px-2.5 xl:px-3 text-[10px] xl:text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg whitespace-normal break-words"
                  onClick={() => {
                    // "Помоги понять" - показываем explanation из БД, если есть
                    if (explanation) {
                      setMessages([{
                        role: "assistant",
                        content: explanation
                      }]);
                    } else {
                      // Если explanation нет, запрашиваем у AI
                      askAI(interfaceLanguage === 'ru' ? "Помоги мне понять это" : interfaceLanguage === 'en' ? "Help me understand this" : "Ayúdame a entender esto");
                    }
                  }}
                  disabled={isLoading}
                >
                  {interfaceLanguage === 'ru' ? t('lumiHelpButton') :
                    interfaceLanguage === 'en' ? 'Help me understand this' :
                      'Ayúdame a entender esto'}
                </Button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index}>
                {message.role === "user" && (
                  <div className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="max-w-[85%] xl:max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md shadow-indigo-500/10">
                      <div className="text-xs xl:text-sm font-medium leading-relaxed break-words">
                        {message.content}
                      </div>
                    </div>
                  </div>
                )}
                {message.role === "assistant" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="min-w-0">
                      {message.content ? (
                        <div className={cn(
                          "max-w-[90%] p-4 rounded-2xl rounded-tl-none text-xs xl:text-sm leading-relaxed transition-all",
                          "bg-white dark:bg-slate-800/90 backdrop-blur-md border border-indigo-100/30 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-black/20"
                        )}>
                          <AIMessageContent
                            content={message.content}
                            onOpenPremium={() => openModal('PAYWALL', { trigger: 'ai_cta' })}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150" />
                        </div>
                      )}

                      {/* Feedback buttons и кнопка перевода под каждым сообщением от AI */}
                      {message.content && (
                        <div className="flex items-center gap-1 mt-2">
                          {/* Кнопка перевода - только для первого сообщения из БД */}
                          {index === 0 && onToggleTranslation && explanationRu && (explanationEs || explanationEn || explanation) && (
                            <button
                              onClick={() => {
                                if (onToggleTranslation) {
                                  // Определяем новый контент ПЕРЕД переключением showTranslation
                                  // Если сейчас показываем русский (showTranslation === true), переключаем на оригинал
                                  // Если сейчас показываем оригинал (showTranslation === false), переключаем на русский
                                  const newContent = showTranslation
                                    ? (explanationEs || explanationEn || explanation || '')
                                    : (explanationRu || '');

                                  // Обновляем сообщение синхронно перед переключением
                                  setMessages(prev => {
                                    const updated = [...prev];
                                    if (updated[0] && updated[0].role === 'assistant') {
                                      updated[0] = { ...updated[0], content: newContent };
                                    }
                                    return updated;
                                  });

                                  // Переключаем состояние
                                  onToggleTranslation();
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors h-7"
                              title={showTranslation ? (interfaceLanguage === 'ru' ? t('lumiShowOriginal') : interfaceLanguage === 'en' ? 'Show original' : 'Mostrar original') : (interfaceLanguage === 'ru' ? t('lumiShowTranslation') : interfaceLanguage === 'en' ? 'Show Russian translation' : 'Mostrar traducción al ruso')}
                            >
                              <Languages className="w-3 h-3" />
                              <span>{showTranslation ? (testLanguage === 'en' ? "EN" : "ES") : "RU"}</span>
                            </button>
                          )}

                          {/* Кнопки лайков для всех сообщений от AI */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => submitFeedback(index, 1)}
                            disabled={!!messageRatings[index]}
                            className={`h-7 px-2 hover:bg-muted ${messageRatings[index] === 1 ? 'bg-muted' : ''}`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${messageRatings[index] === 1 ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => submitFeedback(index, -1)}
                            disabled={!!messageRatings[index]}
                            className={`h-7 px-2 hover:bg-muted ${messageRatings[index] === -1 ? 'bg-muted' : ''}`}
                          >
                            <ThumbsDown className={`w-3.5 h-3.5 ${messageRatings[index] === -1 ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 xl:p-4 border-t shrink-0 bg-background dark:bg-slate-900/60 dark:border-white/5">
          {/* Image preview */}
          {pendingAttachment?.previewUrl && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <img
                src={pendingAttachment.previewUrl}
                alt=""
                className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <p className="flex-1 min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">{pendingAttachment.file.name}</p>
              <button type="button" onClick={removePendingAttachment} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect('gallery')} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect('camera')} />

          <form onSubmit={handleSubmit}>
            <div className={cn(
              "rounded-[22px] border transition-all duration-200",
              "border-slate-200 dark:border-white/8",
              "bg-white dark:bg-slate-800/80",
              "shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_20px_rgba(2,6,23,0.18)]",
              "focus-within:border-blue-300/70 dark:focus-within:border-white/12"
            )}>
              <div className="flex min-h-[52px] items-end gap-1 px-3 py-2">
                {/* Paperclip — opens gallery/camera */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      title={interfaceLanguage === 'ru' ? 'Прикрепить фото' : 'Adjuntar foto'}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-48 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1 shadow-lg">
                    <DropdownMenuItem onClick={() => imageInputRef.current?.click()} className="rounded-lg px-3 py-2.5 text-sm cursor-pointer">
                      <ImagePlus className="mr-2.5 h-4 w-4 text-indigo-500" />
                      {interfaceLanguage === 'ru' ? 'Выбрать фото' : 'Elegir foto'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => cameraInputRef.current?.click()} className="rounded-lg px-3 py-2.5 text-sm cursor-pointer">
                      <Camera className="mr-2.5 h-4 w-4 text-amber-400" />
                      {interfaceLanguage === 'ru' ? 'Сделать фото' : 'Hacer foto'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <textarea
                  ref={textareaRef}
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
                        : (interfaceLanguage === 'ru' ? t('lumiPlaceholder') : interfaceLanguage === 'en' ? 'Ask your question here...' : 'Haz tu pregunta aquí...')
                  }
                  readOnly={isRecording || isProcessingVoice}
                  className="min-w-0 flex-1 h-auto max-h-28 bg-transparent resize-none overflow-y-auto leading-[1.4] py-1.5 px-0 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  style={{ fontSize: '14px' }}
                  disabled={isLoading}
                />

                {/* Combined send / mic button */}
                <Button
                  type={isRecording ? 'button' : hasComposerContent ? 'submit' : 'button'}
                  onClick={isRecording || isProcessingVoice ? toggleVoiceInput : hasComposerContent ? undefined : toggleVoiceInput}
                  disabled={isLoading || isProcessingVoice}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "shrink-0 h-9 w-9 rounded-full border transition-all duration-200 active:scale-[0.97]",
                    isRecording
                      ? "border-slate-900/10 dark:border-white/10 bg-slate-900 dark:bg-white/[0.06] text-white shadow-sm"
                      : hasComposerContent
                        ? "border-slate-900/10 dark:border-white/10 bg-slate-900 dark:bg-white/[0.05] text-white shadow-sm hover:bg-slate-700 dark:hover:bg-white/[0.08]"
                        : "border-slate-200 dark:border-white/8 bg-slate-900 dark:bg-white/[0.03] text-white dark:text-white/85 hover:bg-slate-700 dark:hover:bg-white/[0.06]"
                  )}
                  title={isRecording
                    ? (interfaceLanguage === 'ru' ? 'Остановить запись' : 'Detener grabación')
                    : hasComposerContent
                      ? (interfaceLanguage === 'ru' ? 'Отправить' : 'Enviar')
                      : (interfaceLanguage === 'ru' ? 'Голосовой ввод' : 'Entrada por voz')}
                >
                  {isRecording && <span className="absolute inset-0 rounded-full animate-pulse bg-red-400/15 pointer-events-none" />}
                  <AnimatePresence mode="wait" initial={false}>
                    {isLoading ? (
                      <motion.span key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.14 }} className="relative z-10">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </motion.span>
                    ) : isRecording ? (
                      <motion.span key="recording" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.14 }} className="relative z-10">
                        <MicOff className="w-4 h-4" strokeWidth={2} />
                      </motion.span>
                    ) : hasComposerContent ? (
                      <motion.span key="send" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.14 }} className="relative z-10">
                        <Send className="w-4 h-4" strokeWidth={2} />
                      </motion.span>
                    ) : (
                      <motion.span key="mic" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.14 }} className="relative z-10">
                        <Mic className="w-4 h-4" strokeWidth={2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Card>

      {/* AI Limit Modal */}
      <AILimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        currentCount={limitData.currentCount}
        limit={limitData.limit}
        message={limitData.message}
      />
    </>
  );
};
