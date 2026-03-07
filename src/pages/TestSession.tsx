import { useRef, useMemo, memo, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "@/components/optimized/Motion";
import {
  Clock, CheckCircle2, XCircle, Languages, Lightbulb, ChevronLeft,
  ChevronRight, Grid3x3, X, AlertTriangle, Bot, MessageCircle,
  Bookmark, BookmarkCheck, MoreVertical, Trophy, ArrowRight,
  CornerDownLeft, Keyboard
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { isTelegramMiniApp, triggerHapticFeedback } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { useExamStore } from "@/store/examStore";
import { useTestEffects } from "@/hooks/test-session/useTestEffects";
import { useSettingsStore } from "@/store/settingsStore";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/hooks/usePremium";
import { usePDDContext } from "@/contexts/PDDContext";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import { AIWidget } from "@/components/AIWidget";
import { useAIChat } from "@/hooks/useAIChat";
import { useTestProgress } from "@/hooks/useTestProgress";
import { useTestTimer } from "@/hooks/useTestTimer";
import { useRedemptionMode } from "@/hooks/useRedemptionMode";
import { useRoundRetryMode } from "@/hooks/useRoundRetryMode";
import { useRussiaExamMode } from "@/hooks/useRussiaExamMode";
import { TestSessionModals } from "@/components/test-session/TestSessionModals";
import { OfflineStatusIndicator, AnswerOptionsList } from "@/components/test-session";
import { TestContentLayout } from "@/components/test-session/TestContentLayout";
import { TestSessionHeader } from "@/components/test-session/TestSessionHeader";
import { QuestionCard } from "@/components/test-session/QuestionCard";
import { useTestState } from "@/hooks/test-session/useTestState";
import { SkilyAICharacter } from "@/components/skily-ai/SkilyAICharacter";
import { TestSettingsMenu } from "@/components/TestSettingsMenu";

import { useTestSettings } from "@/hooks/test-session/useTestSettings";
import { useTestAudio } from "@/hooks/test-session/useTestAudio";
import { useTestAmbientMusic } from "@/hooks/test-session/useTestAmbientMusic";
import { useTestDataLoader, type TestMode } from "@/hooks/test-session/useTestDataLoader";
import { BlitzQuestionCard } from "@/components/test-session/BlitzQuestionCard";
import { PageLoader } from "@/components/PageLoader";
import { SubmitButton } from "@/components/test/SubmitButton";
import { UniversalQuestionCard } from "@/components/shared/question/UniversalQuestionCard";
import { getCachedImageAspectRatio, getImageUrl } from "@/utils/imageUtils";
import { checkOnlineStatus } from "@/hooks/useOnlineStatus";
import { trackOfflineAction } from "@/utils/offlineAnalytics";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

import type { Flashcard } from "../types/ai";
import { type UniversalQuestion, type UniversalAnswer as Answer, type CountryCode } from "@/types/pdd";
import { getExamStats, handleMainQuestionAnswer, handleExtraQuestionAnswer } from "@/utils/russiaExamLogic";
import { useRussiaExamAdapter } from "@/hooks/test-session/useRussiaExamAdapter";

import { useTestInteraction } from "@/hooks/test-session/useTestInteraction";
import { useTestCompletion } from "@/hooks/test-session/useTestCompletion";
import { GameBackground } from "@/components/test-session/GameBackground";

type QuestionData = {
  id: string;
  question_ru: string;
  question_es: string;
  question_en: string;
  profileId?: string | null;
  image_url: string | null;
  explanation_ru: string | null;
  explanation_es: string | null;
  explanation_en: string | null;
  topics: {
    title_ru: string;
    title_es: string;
  } | null;
  // answer_options table was removed - now optional/not used
  answer_options?: {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
  }[];
};

// Удалено локальное определение Answer, используем глобальное

type TestRewardResult = {
  coins_awarded?: number;
  sp_awarded?: number;
  base_coins?: number;
  base_sp?: number;
  abuse_penalty?: number;
  diminishing_factor?: number;
  message?: string;
  level_up?: boolean;
  new_level?: number;
  tests_today?: number;
};



const TestSession = () => {
  const params = useParams();
  const topic = params.topic;
  const testId = params.testId;
  const rawMode = params.mode;
  const countryParam = params.country as CountryCode | undefined;
  const ticketIdParam = params.ticketId;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId || undefined);
  const { selectedCountry, selectedCategory } = usePDDContext();
  const isRussia = (countryParam || selectedCountry) === 'russia';
  const { language: userLanguage, t } = useLanguage();
  const mode = useMemo(() => {
    // Sanitization: extract only the base mode part before any query markers that might have leaked into path
    const sanitizedRawMode = rawMode?.split('&')[0]?.split('?')[0];

    if (sanitizedRawMode) return sanitizedRawMode;
    if (location.pathname.includes("/learn/") && ticketIdParam) return "pdd-ticket";
    if (location.pathname.includes("/test/sequential")) return "sequential";
    if (location.pathname.includes("/test/challenge-bank")) return "challenge-bank";
    if (location.pathname.includes("/test/favorites")) return "favorites";
    if (location.pathname.includes("/test/module")) return "module";
    if (location.pathname.includes("/test/dgt")) return "dgt";
    if (location.pathname.includes("/test/exam-russia") || searchParams.get('mode') === 'exam-russia') return "exam-russia";
    if (location.pathname.includes("/test/by-topic") || searchParams.get('topic')) return "by-topic";
    if (location.pathname.includes("/test/marathon")) return "marathon";
    if (location.pathname.includes("/test/nonstop")) return "nonstop";
    return "practice";
  }, [rawMode, location.pathname, searchParams, ticketIdParam]);

  // Определяем страну для ПДД билета
  const pddCountry = useMemo(() => {
    // Если в URL есть страна, используем её
    if (countryParam) return countryParam;

    // Если режим явно испанский (DGT)
    if (mode === 'dgt') return 'spain';

    // Если режим явно российский
    if (mode === 'exam-russia' || mode === 'pdd-ticket') return 'russia';

    // В остальных случаях берем из контекста или дефолтимся
    return selectedCountry || 'russia';
  }, [mode, countryParam, selectedCountry]);

  // Определяем номер билета
  const ticketNumber = useMemo(() => {
    if (mode === 'pdd-ticket' && ticketIdParam) {
      const parsed = parseInt(ticketIdParam);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }, [mode, ticketIdParam]);

  // Получаем количество вопросов из URL
  const countParam = searchParams.get('count');
  const questionCount = countParam ? parseInt(countParam) : (
    mode === 'blitz' ? 20 :
      mode === 'nonstop' && pddCountry === 'russia' ? 800 :
        mode === 'challenge-bank' ? 20 :
          mode === 'marathon' && pddCountry === 'russia' ? 20 :
            30
  );
  const blitzDuration = parseInt(searchParams.get('timer') || (mode === 'blitz' ? '300' : '300')) || (mode === 'blitz' ? 300 : 300);
  const initialTimeBudget = mode === "exam" ? 30 * 60 : mode === "blitz" ? blitzDuration : 0;
  const [showTranslation, setShowTranslation] = useState(false);
  const [questionsState, setQuestionsState] = useState<QuestionData[]>([]);
  const setQuestions = setQuestionsState;

  // Game Engine - manages navigation and answers
  // === ZUSTAND CORE (Replacing useTestEngine) ===
  const {
    activeState,
    timeLeft,
    selectedOption,
    isAnswerLocked,
    feedbackStatus,
    streak,
    initializeExam,
    answerQuestion: answerQuestionZ,
    nextQuestion: nextQuestionZ,
    prevQuestion: prevQuestionZ,
    jumpToQuestion: jumpToQuestionZ,
    selectOption,
    setRussiaSelectedOption,
    setIsAnswerLocked,
    setFeedbackStatus,
    resetExam,
    modifyTime,
    tickTimer,
  } = useTestState();

  // Aliases for compatibility
  const examState = activeState?.kind === 'russia' ? activeState.data : null;
  const answerQuestionZustand = (isCorrect: boolean) => answerQuestionZ('compat-alias', isCorrect);

  // Local UI State (анимации - оставляем здесь)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isEnterPressed, setIsEnterPressed] = useState(false);

  // === ADAPTERS ===
  // 1. Current Index
  const currentIndex = activeState
    ? (activeState.kind === 'russia'
      ? (activeState.data.isExtraMode ? activeState.data.currentExtraIndex : activeState.data.currentMainIndex)
      : activeState.data.currentIndex)
    : 0;

  // 2. Answers Array (Transformed for UI compatibility)
  const answers = useMemo(() => {
    if (!activeState) return [];
    if (activeState.kind === 'russia') {
      // Flatten main and extra answers
      return [
        ...Object.values(activeState.data.mainAnswers),
        ...Object.values(activeState.data.extraAnswers)
      ].map((a: any) => ({
        questionId: a.questionId,
        selectedAnswerId: a.selectedAnswerId || '', // Russia logic might not store ID, only correctness? Check types.
        isCorrect: a.isCorrect
      }));
    }
    // Standard
    return Object.entries(activeState.data.answers).map(([questionId, a]) => ({
      questionId: questionId,
      selectedAnswerId: (a as { selectedOptionId: string }).selectedOptionId,
      isCorrect: (a as { isCorrect: boolean }).isCorrect
    }));
  }, [activeState, questionsState]);

  // 3. Navigation Wrappers
  const engineNextQuestion = nextQuestionZ;
  const enginePrevQuestion = prevQuestionZ;
  const engineJumpToQuestion = jumpToQuestionZ;
  const setCurrentIndex = (i: number) => jumpToQuestionZ(i);
  const setAnswers = () => { }; // No-op, answers are derived from store
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTestSettings, setShowTestSettings] = useState(false);
  const hasLoadedProgressRef = useRef<string | null>(null);
  const previousTestIdRef = useRef<string | null>(null); // Для отслеживания изменения testId

  // === PHASE 3: startTime теперь в examStore.data.startTime ===
  const [sessionStartTime] = useState(Date.now());
  const startTime = activeState?.kind === 'standard' ? activeState.data.startTime : Date.now();

  // AI Chat через Zustand store (глобальный виджет)
  const { openWithQuestion: openAIChat, close: closeAIChat, isOpen: showAIExplanation } = useAIChat();
  const [showChallengeBankNotification, setShowChallengeBankNotification] = useState(false);
  const [isFirstWrongAnswer, setIsFirstWrongAnswer] = useState(true);
  const [blitzShaking, setBlitzShaking] = useState(false); // Screen shake for Blitz wrong answers

  // ============================================
  // REDEMPTION SESSION CONFIG & STATE
  // ============================================
  interface AppError {
    message?: string;
    details?: string;
    code?: string;
    hint?: string;
  }

  interface ExtendedQuestion {
    id: string;
    text?: string;
    question_ru?: string;
    question_text?: string;
    image?: string;
    image_url?: string;
    explanation?: string;
    explanation_ru?: string;
    explanation_es?: string;
    answers?: Array<unknown>;
    answer_options?: Array<unknown>;
    topics?: string[];
  }

  interface LocationState {
    mode?: string;
    failedQuestions?: Array<{ questionId: string }>;
    analysisData?: unknown;
  }
  const locState = location.state as LocationState | null;
  const isRedemptionMode = locState?.mode === 'redemption';
  const redemptionFailedQuestions = useMemo(() => locState?.failedQuestions || [], [locState?.failedQuestions]);
  const redemptionAnalysisData = locState?.analysisData;
  // Log only once on mount via useEffect below


  // Flashcards для индивидуальных подсказок в режиме Redemption
  const [redemptionFlashcards, setRedemptionFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // ============================================
  // DATA LAYER: Single source of truth for questions
  // ============================================
  const topicName = searchParams.get('topic');
  const topicId = searchParams.get('topicId'); // UUID темы для новой структуры БД
  const topicLevel = searchParams.get('level'); // Номер билета (1, 2, 3...)

  const redemptionData = useMemo(() => isRedemptionMode ? {
    failedIds: redemptionFailedQuestions.map((q: { questionId: string }) => q.questionId)
  } : undefined, [isRedemptionMode, redemptionFailedQuestions]);

  const dataLoader = useTestDataLoader({
    mode: mode as TestMode,
    profileId,
    testId,
    topic: topicName || topic || undefined,
    topicId: topicId || undefined, // Передаем UUID темы
    topicLevel: topicLevel ? parseInt(topicLevel) : undefined, // Номер билета
    pddCountry: pddCountry || selectedCountry || undefined,
    ticketNumber: ticketNumber || undefined,
    questionCount,
    category: searchParams.get('category') || selectedCategory || 'B',
    redemptionData
  });

  // Preload first image logic
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);

  // Derived loading state
  // We will compute the final loading state combining dataLoader and image preloading below

  const isOnline = useOnlineStatus();
  const [pendingSync, setPendingSync] = useState(false);

  // === DERIVED DATA & ADAPTERS ===
  const shouldUsePDD = isRussia && (
    mode === 'practice' ||
    mode === 'blitz' ||
    mode === 'exam' ||
    mode === 'mastery' ||
    mode === 'hardest' ||
    mode === 'by-topic' ||
    mode === 'nonstop' ||
    mode === 'pdd-ticket' ||
    mode === 'exam-russia' ||
    mode === 'sequential' ||
    mode === 'challenge-bank' ||
    mode === 'favorites'
  );

  const challengeBankQuestions = useMemo(() => ({
    data: mode === 'challenge-bank' ? dataLoader.questions : null,
    isLoading: mode === 'challenge-bank' && dataLoader.isLoading,
    error: mode === 'challenge-bank' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const favoritesQuestions = useMemo(() => ({
    data: mode === 'favorites' ? dataLoader.questions : null,
    isLoading: mode === 'favorites' && dataLoader.isLoading,
    error: mode === 'favorites' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const redemptionQuestions = useMemo(() => ({
    data: isRedemptionMode ? dataLoader.questions : null,
    isLoading: isRedemptionMode && dataLoader.isLoading,
    error: isRedemptionMode ? dataLoader.error : null,
  }), [isRedemptionMode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const fallbackTestInfo = useMemo(() => ({
    title: mode === 'exam' ? (isRussia ? "Экзамен ГИБДД" : "Examen DGT") : (mode === 'blitz' ? "Блиц" : "Тренировка"),
    category: selectedCategory || "B",
    topic: (mode === 'by-topic' ? (topic || "") : ""),
    mode: mode
  }), [mode, selectedCategory, topic, isRussia]);

  const testInfo = useMemo(() => {
    if (dataLoader.testInfo) return dataLoader.testInfo;
    return fallbackTestInfo;
  }, [dataLoader.testInfo, fallbackTestInfo]);

  const onViewResults = useCallback(() => {
    if (!activeState) {
      navigate('/tests'); // Fallback
      return;
    }

    let timeSpent = 0;
    let isRussianFailed = false;

    if (activeState.kind === 'russia') {
      const d = activeState.data;
      timeSpent = d.endTime ? Math.floor((d.endTime - d.startTime) / 1000) : (d.timeLimit + d.extraTimeAdded - d.timeRemaining);
      isRussianFailed = d.status === 'failed' || d.status === 'failed-extra';
    } else {
      timeSpent = activeState.data.timeLimit
        ? (activeState.data.timeLimit - activeState.data.timeInfo)
        : activeState.data.timeInfo;
    }

    navigate('/test/results', {
      state: {
        questions: questionsState,
        answers,
        mode,
        testInfo,
        timeSpent,
        isRussianFailed,
        country: pddCountry
      }
    });
  }, [navigate, activeState, questionsState, answers, mode, testInfo, pddCountry]);

  const dgtQuestions = useMemo(() => ({
    data: mode === 'dgt' ? dataLoader.questions : null,
    isLoading: mode === 'dgt' && dataLoader.isLoading,
    error: mode === 'dgt' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const pddRandomQuestions = useMemo(() => ({
    data: shouldUsePDD && (mode === 'practice' || mode === 'blitz' || mode === 'exam' || mode === 'nonstop' || (mode as string) === 'marathon' || (mode as string) === 'traps' || mode === 'mastery' || mode === 'hardest') ? dataLoader.questions : null,
    isLoading: shouldUsePDD && dataLoader.isLoading,
    error: shouldUsePDD ? dataLoader.error : null,
  }), [shouldUsePDD, mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const practiceQuestions = useMemo(() => ({
    data: !shouldUsePDD && (mode === 'practice' || mode === 'blitz' || mode === 'exam') ? dataLoader.questions : null,
    isLoading: !shouldUsePDD && (mode === 'practice' || mode === 'blitz' || mode === 'exam') && dataLoader.isLoading,
    error: !shouldUsePDD && (mode === 'practice' || mode === 'blitz' || mode === 'exam') ? dataLoader.error : null,
  }), [shouldUsePDD, mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const masteryQuestions = useMemo(() => ({
    data: !shouldUsePDD && mode === 'mastery' ? dataLoader.questions : null,
    isLoading: !shouldUsePDD && mode === 'mastery' && dataLoader.isLoading,
    error: !shouldUsePDD && mode === 'mastery' ? dataLoader.error : null,
  }), [shouldUsePDD, mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const hardestQuestions = useMemo(() => ({
    data: !shouldUsePDD && mode === 'hardest' ? dataLoader.questions : null,
    isLoading: !shouldUsePDD && mode === 'hardest' && dataLoader.isLoading,
    error: !shouldUsePDD && mode === 'hardest' ? dataLoader.error : null,
  }), [shouldUsePDD, mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const moduleQuestions = useMemo(() => ({
    data: mode === 'module' ? dataLoader.questions : null,
    isLoading: mode === 'module' && dataLoader.isLoading,
    error: mode === 'module' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const sequentialQuestions = useMemo(() => ({
    data: mode === 'sequential' ? dataLoader.questions : null,
    isLoading: mode === 'sequential' && dataLoader.isLoading,
    error: mode === 'sequential' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const testInfoData = useMemo(() => ({
    data: mode === 'sequential' ? dataLoader.testInfo : null,
    isLoading: mode === 'sequential' && dataLoader.isLoading,
    error: mode === 'sequential' ? dataLoader.error : null,
  }), [mode, dataLoader.testInfo, dataLoader.isLoading, dataLoader.error]);

  const pddExamQuestions = useMemo(() => ({
    data: mode === 'exam-russia' ? dataLoader.meta?.rawData : null,
    isLoading: mode === 'exam-russia' && dataLoader.isLoading,
    error: mode === 'exam-russia' ? dataLoader.error : null,
  }), [mode, dataLoader.meta?.rawData, dataLoader.isLoading, dataLoader.error]);

  const pddTicketQuestions = useMemo(() => ({
    data: mode === 'pdd-ticket' ? dataLoader.questions : null,
    isLoading: mode === 'pdd-ticket' && dataLoader.isLoading,
    error: mode === 'pdd-ticket' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const pddTopicQuestions = useMemo(() => ({
    data: mode === 'by-topic' ? dataLoader.questions : null,
    isLoading: mode === 'by-topic' && dataLoader.isLoading,
    error: mode === 'by-topic' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const universalPDDQuestions = useMemo(() => {
    if (mode === 'exam-russia' && dataLoader.meta?.rawData) {
      return dataLoader.meta.rawData.selectedQuestions;
    }
    if (mode === 'pdd-ticket' && dataLoader.questions) {
      return dataLoader.questions;
    }
    return null;
  }, [mode, dataLoader.meta?.rawData, dataLoader.questions]);

  const allQuestionsByBlock = useMemo(() => {
    if (mode === 'exam-russia' && dataLoader.meta?.allQuestionsByBlock) {
      return dataLoader.meta.allQuestionsByBlock;
    }
    return undefined;
  }, [mode, dataLoader.meta?.allQuestionsByBlock]);


  const questions = useMemo((): QuestionData[] => {
    interface RawQuestion {
      id: string;
      text?: string;
      question_ru?: string;
      question_es?: string;
      question_en?: string;
      question_text?: string;
      image?: string;
      image_url?: string;
      image_filename?: string;
      explanation?: string;
      explanation_ru?: string;
      explanation_es?: string;
      explanation_en?: string;
      topics?: Array<string | { title_ru: string; title_es: string }>;
      topic_title_ru?: string;
      topic_title_es?: string;
      answers?: Array<{
        id: string;
        text?: string;
        text_ru?: string;
        text_es?: string;
        text_en?: string;
        answer_text?: string;
        is_correct?: boolean;
        isCorrect?: boolean;
        position?: number;
      }>;
      answer_options?: Array<{
        id: string;
        text?: string;
        text_ru?: string;
        text_es?: string;
        text_en?: string;
        answer_text?: string;
        is_correct?: boolean;
        isCorrect?: boolean;
        position?: number;
      }>;
    }

    let raw: RawQuestion[] = [];
    if (mode === 'exam-russia' || mode === 'pdd-ticket') {
      raw = (universalPDDQuestions || []);
    } else {
      raw = (dataLoader.questions || []);
    }

    if (!raw || raw.length === 0) return [];

    return raw.map((q) => ({
      id: q.id,
      // NEW: Use multilingual fields from SpainUnifiedStrategy
      question_ru: q.question_ru || (q as any).text_ru || (q as any).text || (q as any).question_text || q.question_es || '',
      question_es: q.question_es || (q as any).text_es || (q as any).text || q.question_ru || (q as any).question_text || '',
      question_en: (q as any).question_en || (q as any).text_en || (q as any).text || q.question_ru || (q as any).question_text || '',
      image_url: (q as any).image || q.image_url || (q as any).image_filename || null,
      explanation_ru: q.explanation_ru || (q as any).explanation || (q as any).explanation_es || null,
      explanation_es: (q as any).explanation_es || (q as any).explanation || q.explanation_ru || null,
      explanation_en: (q as any).explanation_en || (q as any).explanation || q.explanation_ru || null,
      topics: q.topics && q.topics.length > 0
        ? (typeof q.topics[0] === 'string' ? { title_ru: q.topics[0], title_es: q.topics[0] } : q.topics[0])
        : ((q as any).topic_title_ru ? { title_ru: (q as any).topic_title_ru, title_es: (q as any).topic_title_es } : null),
      answer_options: (q.answers || (q as any).answer_options || []).map((a: any) => ({
        id: a.id,
        // NEW: Use multilingual fields from UniversalAnswer
        text_ru: a.text_ru || a.text || a.answer_text || '',
        text_es: a.text_es || a.text || a.text_ru || a.answer_text || '',
        text_en: a.text_en || a.text || a.text_ru || a.answer_text || '',
        is_correct: a.is_correct !== undefined ? a.is_correct : (a.isCorrect !== undefined ? a.isCorrect : false),
        position: a.position || 0,
      })),
    }));
  }, [mode, universalPDDQuestions, dataLoader.questions]);

  // Derived testInfo merged above

  // === IMAGE PRELOADING ===
  const firstImageUrl = questions[0]?.image_url;

  useEffect(() => {
    if (dataLoader.isLoading || questions.length === 0) {
      setFirstImageLoaded(false);
      return;
    }

    if (!firstImageUrl) {
      setFirstImageLoaded(true);
      return;
    }

    const url = getImageUrl(firstImageUrl);
    if (!url) {
      setFirstImageLoaded(true);
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      setFirstImageLoaded(true);
    };
    img.onerror = () => {
      setFirstImageLoaded(true);
    };
    img.src = url;
  }, [dataLoader.isLoading, questions.length, firstImageUrl]);

  const loading = dataLoader.isLoading || (!firstImageLoaded && questions.length > 0 && !!firstImageUrl);

  // === MODE EFFECTS (Moved here to have 'questions' available) ===
  const {
    redemptionStep,
    setRedemptionStep,
    showReflectionOverlay,
    setShowReflectionOverlay,
    redemptionOriginalCount,
    lastRedemptionAnswerTimestamp,
    setLastRedemptionAnswerTimestamp,
    handleReflectionAnswer
  } = useRedemptionMode({
    isEnabled: isRedemptionMode,
    failedQuestions: redemptionFailedQuestions
  });

  const {
    wrongQuestionIds: masteryWrongQuestions,
    setWrongQuestionIds: setMasteryWrongQuestions,
    round: masteryRound,
    setRound: setMasteryRound,
    addWrongQuestion,
    reset: resetMastery,
  } = useRoundRetryMode({
    isEnabled: mode === 'mastery' || mode === 'marathon',
  });


  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [testLanguage, setTestLanguage] = useState<'es' | 'en' | 'ru'>(() => {
    const saved = localStorage.getItem('test-language');
    return (saved === 'en' || saved === 'ru' ? saved : 'es') as 'es' | 'en' | 'ru';
  });

  const effectiveLanguage = useMemo(() => {
    if (mode === 'blitz') return 'es';
    return (shouldUsePDD || showTranslation) ? 'ru' : testLanguage;
  }, [shouldUsePDD, showTranslation, testLanguage, mode]);

  // Handler to save language to localStorage when changed
  const handleLanguageChange = (lang: 'es' | 'en' | 'ru') => {
    setTestLanguage(lang);
    localStorage.setItem('test-language', lang);
  };

  const {
    voiceOver, setVoiceOver,
    answerPopularity, setAnswerPopularity,
    ambientMusic, setAmbientMusic,
    selectedMusicTrack, setSelectedMusicTrack,
    fontSize, setFontSize
  } = useTestSettings();

  const {
    showPenaltyAlert,
    setShowPenaltyAlert,
    penaltyBlock,
    setPenaltyBlock: setPenaltyBlockAny,
    showFailureModal,
    setShowFailureModal,
    failureReason,
    setFailureReason,
    triggerPenaltyAlert,
    closePenaltyAlert,
    triggerFailure,
    closeFailureModal
  } = useRussiaExamMode({ isEnabled: mode === 'exam-russia' });

  // Adapter for penaltyBlock type if needed
  const setPenaltyBlock = (val: string | number | null) => {
    setPenaltyBlockAny(val as any);
  };

  const { clearProgress } = useTestProgress({
    testId: (testInfo as any)?.id,
    mode: mode as any,
    answers,
    currentIndex,
    startTime,
  });

  // Cleanup on unmount to prevent stale results when starting a new game (fixes the 'completed' status carryover)
  useEffect(() => {
    return () => {
      console.log("[TestSession] Cleaning up exam state on unmount");
      resetExam();
    };
  }, [resetExam]);

  useTestTimer({ tickTimer });

  useTestAmbientMusic(ambientMusic);

  const voiceOverText = useMemo(() => {
    if (!questionsState[currentIndex]) return undefined;
    const q = questionsState[currentIndex];
    if (isRussia || showTranslation || testLanguage === 'ru') return q.question_ru;
    return testLanguage === 'en' ? q.question_en : q.question_es;
  }, [questionsState, currentIndex, isRussia, showTranslation, testLanguage]);

  const voiceOverLang = useMemo(() => {
    if (isRussia || showTranslation || testLanguage === 'ru') return 'ru';
    return testLanguage;
  }, [isRussia, showTranslation, testLanguage]);

  useTestAudio(voiceOver, voiceOverText, voiceOverLang);

  const smartVocabularyEnabled = useSettingsStore(state => state.smartVocabularyEnabled);
  const toggleSmartVocabulary = useSettingsStore(state => state.toggleSmartVocabulary);
  const appLanguage = useSettingsStore(state => state.language);
  const setSettings = useSettingsStore(state => state.updateSettings);
  const smartDefaultAppliedRef = useRef(false);

  const isTelegramApp = isTelegramMiniApp();

  const isClosingRef = useRef<boolean>(false);
  const handleCloseModal = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      setShowQuestionMap(false);
      setIsClosing(false);
      isClosingRef.current = false;
    }, 300);
  }, []);

  const testSessionIdRef = useRef<string | null>(null);
  const getOrCreateSessionId = useCallback(() => {
    if (!testSessionIdRef.current) {
      const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      testSessionIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : fallbackId;
    }
    return testSessionIdRef.current;
  }, []);

  // Адаптер для совместимости с существующим JSX кодом
  const russiaExam = useRussiaExamAdapter();

  // Универсальный объект текущего вопроса
  // Для экзамена РФ используем вопрос из russiaExam
  const currentQuestion = mode === 'exam-russia' && russiaExam.currentQuestion
    ? {
      id: russiaExam.currentQuestion.id,
      question_ru: russiaExam.currentQuestion.text || (russiaExam.currentQuestion as ExtendedQuestion).question_ru || (russiaExam.currentQuestion as ExtendedQuestion).question_text || '',
      question_es: russiaExam.currentQuestion.text || (russiaExam.currentQuestion as ExtendedQuestion).question_ru || '',
      question_en: russiaExam.currentQuestion.text || (russiaExam.currentQuestion as ExtendedQuestion).question_ru || '',
      image_url: russiaExam.currentQuestion.image || (russiaExam.currentQuestion as ExtendedQuestion).image_url,
      explanation_ru: russiaExam.currentQuestion.explanation || (russiaExam.currentQuestion as ExtendedQuestion).explanation || null,
      explanation_es: russiaExam.currentQuestion.explanation || (russiaExam.currentQuestion as ExtendedQuestion).explanation || null,
      explanation_en: russiaExam.currentQuestion.explanation || (russiaExam.currentQuestion as ExtendedQuestion).explanation || null,
      topics: russiaExam.currentQuestion.topics && russiaExam.currentQuestion.topics.length > 0
        ? { title_ru: russiaExam.currentQuestion.topics[0], title_es: russiaExam.currentQuestion.topics[0] }
        : null,
      answer_options: (russiaExam.currentQuestion.answers || (russiaExam.currentQuestion as { answer_options?: Array<unknown> }).answer_options || []).map((a: { id: string; text?: string; text_ru?: string; text_es?: string; text_en?: string; is_correct?: boolean; isCorrect?: boolean; position?: number }) => ({
        id: a.id,
        text_ru: a.text || a.text_ru || '',
        text_es: a.text || a.text_es || '',
        text_en: a.text || a.text_en || '',
        is_correct: (a as any).isCorrect !== undefined ? (a as any).isCorrect : (a.is_correct !== undefined ? a.is_correct : false),
        position: a.position || 0,
      })),
    }
    : (questionsState && questionsState.length > 0 ? questionsState[currentIndex] : questions[currentIndex]);

  // Sort answer options by position - защита от null/undefined
  const sortedOptions = useMemo(() => {
    if (!currentQuestion?.answer_options || !Array.isArray(currentQuestion.answer_options)) {
      return [];
    }
    return [...currentQuestion.answer_options].sort((a, b) => (a?.position || 0) - (b?.position || 0));
  }, [currentQuestion?.id, currentQuestion?.answer_options]);

  // Helper: открыть AI чат с контекстом текущего вопроса
  const handleOpenAIChat = () => {
    if (!currentQuestion) return;

    const question = mode === 'exam-russia' && russiaExam.currentQuestion
      ? russiaExam.currentQuestion.text
      : (showTranslation || testLanguage === 'ru'
        ? currentQuestion.question_ru
        : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es));

    const correctAnswer = mode === 'exam-russia' && russiaExam.currentQuestion
      ? (russiaExam.currentQuestion.answers || []).find((a: any) => a.isCorrect || a.is_correct)?.text || ''
      : (sortedOptions.find((opt) => opt.is_correct)?.[showTranslation || testLanguage === 'ru' ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] || '');

    const userAnswer = mode === 'exam-russia' && russiaExam.currentQuestion && selectedOption
      ? (russiaExam.currentQuestion.answers || []).find(a => a.id === selectedOption)?.text
      : (selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[showTranslation || testLanguage === 'ru' ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] : undefined);

    const isCorrectAnswer = mode === 'exam-russia' && russiaExam.currentQuestion && selectedOption
      ? ((russiaExam.currentQuestion.answers || []).find((a: any) => a.id === selectedOption)?.isCorrect || false)
      : (selectedOption ? (sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false) : false);

    // Передаем объяснение только если ответ ПРИНЯТ (locked)
    const isAnswerSubmitted = isAnswerLocked;

    const explanation = isAnswerSubmitted && selectedOption
      ? (mode === 'exam-russia' && russiaExam.currentQuestion
        ? russiaExam.currentQuestion.explanation
        : (showTranslation ? currentQuestion.explanation_ru : (testLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es)))
      : undefined;

    openAIChat({
      question,
      correctAnswer,
      userAnswer,
      isCorrect: isCorrectAnswer,
      explanation,
      explanationRu: isAnswerSubmitted && selectedOption
        ? (mode === 'exam-russia' && russiaExam.currentQuestion
          ? russiaExam.currentQuestion.explanation
          : currentQuestion.explanation_ru)
        : undefined,
      explanationEs: isAnswerSubmitted && selectedOption ? currentQuestion.explanation_es : undefined,
      explanationEn: isAnswerSubmitted && selectedOption ? currentQuestion.explanation_en : undefined,
      topic: mode === 'exam-russia' && russiaExam.currentQuestion
        ? (russiaExam.currentQuestion.topics && russiaExam.currentQuestion.topics.length > 0 ? russiaExam.currentQuestion.topics[0] : undefined)
        : currentQuestion.topics?.title_es,
      imageUrl: mode === 'exam-russia' && russiaExam.currentQuestion
        ? russiaExam.currentQuestion.image
        : currentQuestion.image_url,
      testLanguage,
      country: isRussia ? 'russia' : 'spain',
    });
  };

  // === PHASE 4: Глобальные эффекты сессии ===
  const { isBookmarked: isQuestionBookmarked, toggleBookmark, bookmarkLoading } = useTestEffects({
    // Данные
    questions,
    questionsState,
    setQuestionsState,
    initializeExam,
    mode,
    allQuestionsByBlock,
    initialTimeBudget,
    profileId,
    testId,
    testInfo,
    loading,
    testLanguage,
    appLanguage,
    isRussia,
    isOnline,
    startTime,
    answers,
    pddCountry: pddCountry || "spain",
    currentIndex,

    // UI стейты и сеттеры
    showQuestionMap,
    setShowQuestionMap,
    isClosingRef,
    isClosing,
    setIsClosing,
    handleCloseModal,
    showFailureModal,
    setShowFailureModal,
    setFailureReason,
    navigate,
    showAIExplanation,
    handleOpenAIChat,
    setSettings,
    smartDefaultAppliedRef,
    setPendingSync,

    // Режимы
    isRedemptionMode,
    redemptionStep,
    redemptionFailedQuestions,
    setFlashcardsLoading,
    setRedemptionFlashcards,
    setShowReflectionOverlay,
    russiaExamStatus: russiaExam.status,
    russiaExamStats: russiaExam.stats,
    isPremium: !!isPremium,

    // Хелперы
    getOrCreateSessionId
  });


  // ============================================
  // ADAPTER: Map loader data to legacy variable names
  // These aliases allow the existing useEffect to work unchanged
  // ============================================





  // Timer Hook - Manages time robustly
  // Fix: Use unique session ID to prevent collisions with old expired timers
  const timerDuration = parseInt(searchParams.get('timer') || (mode === 'blitz' ? '60' : '1200'));


  // Формируем массив ответов для прогресс-бара РФ
  const russiaExamAnswers = useMemo(() => {
    if (!russiaExam.state) return [];

    // Safety check just in case
    const mainAnswers = russiaExam.state.mainAnswers || {};
    const extraAnswers = russiaExam.state.extraAnswers || {};

    const main = Array.from({ length: 20 }).map((_, i) => {
      const ans = mainAnswers[i];
      return ans ? { questionId: ans.questionId, isCorrect: ans.isCorrect } : null;
    }).filter((a): a is { questionId: string; isCorrect: boolean } => a !== null);

    const extra = Array.from({ length: russiaExam.state.extraQuestions?.length || 0 }).map((_, i) => {
      const ans = extraAnswers[i];
      return ans ? { questionId: ans.questionId, isCorrect: ans.isCorrect } : null;
    }).filter((a): a is { questionId: string; isCorrect: boolean } => a !== null);

    return [...main, ...extra];
  }, [russiaExam.state]);





  // ============================================
  // LEGACY useEffect REMOVED
  // Data is now loaded reactively via derived values (lines 640-783)
  // The pattern { questions, loading, testInfo } now comes from useMemo blocks
  // ============================================







  const practiceLikeModes = [
    "practice", "blitz", "mastery", "marathon", "sequential", "module",
    "challenge-bank", "dgt", "pdd-ticket", "redemption", "by-topic",
    "traps", "hardest", "favorites", "nonstop"
  ];
  const isPracticeLikeMode = practiceLikeModes.includes(mode);

  // ============================================
  // NAVIGATION WRAPPERS (Moved up for hook dependency)
  // ============================================

  const jumpToQuestion = (index: number) => {
    engineJumpToQuestion(index);
    setShowTranslation(false);
    closeAIChat();
  };

  // Wrapper that handles UI cleanup (AI, Translation) + Navigation
  const nextQuestion = () => {
    // Используем актуальное количество вопросов для текущего раунда (для Марафона/Мастерства)
    const currentTotal = questionsState.length > 0 ? questionsState.length : questions.length;

    // === PHASE 2: selectedOption и isAnswerLocked теперь сбрасываются в examStore.nextQuestion() ===
    if (currentIndex < currentTotal - 1) {
      engineNextQuestion();
      setShowTranslation(false);
      closeAIChat();
    } else {
      finishTest();
    }
  };

  const prevQuestion = () => {
    enginePrevQuestion();
    setShowTranslation(false);
    closeAIChat();
  };

  // ============================================
  // INTERACTION & NAVIGATION LOGIC
  // ============================================

  // КРИТИЧНО: Используем questionsState (то, что реально на экране) для прогресса и логики
  const effectiveSessionQuestions = useMemo(() => {
    return (questionsState && questionsState.length > 0) ? questionsState : (questions || []);
  }, [questionsState, questions]);

  // КРИТИЧНО: Используем effectiveSessionQuestions (то, что реально на экране) для прогресса
  const sessionQuestionCount = effectiveSessionQuestions.length;

  const progressPercent = useMemo(() => {
    if (activeState?.kind === 'russia' && russiaExam.progress) {
      return (russiaExam.progress.current / russiaExam.progress.total) * 100;
    }
    return sessionQuestionCount > 0 ? (answers.length / sessionQuestionCount) * 100 : 0;
  }, [answers.length, sessionQuestionCount, activeState, russiaExam.progress]);

  const errorCount = mode === 'exam-russia' && russiaExam.stats
    ? russiaExam.stats.totalErrors
    : answers.filter((a) => !a.isCorrect).length;

  // Map QuestionData to UniversalQuestion for hooks and components
  const universalQuestions = useMemo(() => {
    if (!effectiveSessionQuestions) return [];
    return effectiveSessionQuestions.map(q => ({
      id: q.id,
      text: q.question_ru || q.question_es || '',
      image: q.image_url || null,
      answers: (q.answer_options || []).map(a => ({
        id: a.id,
        text: a.text_ru || a.text_es || '',
        isCorrect: a.is_correct
      })),
      explanation: q.explanation_ru || q.explanation_es || null
    }));
  }, [effectiveSessionQuestions]);

  const { handleAnswer } = useTestInteraction({
    profileId: profileId || undefined,
    mode,
    isTelegramApp: !!isTelegramApp,
    pddCountry: pddCountry || "spain",
    questions: universalQuestions,
    currentIndex,
    activeState,
    russiaExam,
    answerQuestionZ,
    nextQuestion,
    modifyTime,
    selectOption,
    setRussiaSelectedOption,
    setIsTransitioning,
    setBlitzShaking,
    setIsAnswerLocked,
    setPenaltyBlock: setPenaltyBlockAny as any,
    setShowPenaltyAlert,
    setShowFailureModal,
    setFailureReason,
    setShowChallengeBankNotification,
    setShowReflectionOverlay,
    setMasteryWrongQuestions,
    isRedemptionMode,
    redemptionStep,
    setRedemptionStep,
    redemptionOriginalCount,
    redemptionFailedQuestions,
    navigate,
    answers,
    isAnswerLocked: !!isAnswerLocked
  });

  const { finishTest } = useTestCompletion({
    profileId: profileId || undefined,
    mode,
    questions: universalQuestions,
    testInfo: testInfo as any,
    startTime,
    timeLeft,
    initialTimeBudget,
    testId,
    ticketIdParam,
    pddCountry,
    topic: topic || "",
    isPremium: !!isPremium,
    enqueueOfflineAction,
    getOrCreateSessionId,
    masteryWrongQuestions,
    masteryRound,
    setQuestions: setQuestions as any,
    setMasteryWrongQuestions,
    setMasteryRound,
    setCurrentIndex,
    initializeExam,
    setShowTranslation,
    closeAIChat,
    russiaExamQuestions: russiaExam.questions,
    isRussia,
    answers,
    setAnswers
  });

  // === KEYBOARD NAVIGATION ===
  useKeyboardNavigation({
    mode: mode as any,
    selectedOption,
    isAnswerLocked,
    currentIndex,
    isRussia,
    showQuestionMap,
    showExitConfirm,
    showReportModal,
    showTestSettings,
    currentQuestion: (questionsState && questionsState[currentIndex]) || (questions && questions[currentIndex]),
    russiaExamCurrentQuestion: russiaExam.currentQuestion,
    selectOption,
    handleAnswer,
    nextQuestion,
    setIsEnterPressed
  });

  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds)) return "20:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")} `;
  };

  if (loading) {
    return <PageLoader />;
  }

  if (questions.length === 0 && questionsState.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопросы не найдены</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  if (!questionsState[currentIndex] && !questions[currentIndex]) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопрос не найден</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  if (!currentQuestion) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопрос не найден</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  const getQuestionText = (lang: 'ru' | 'es' | 'en'): string => {
    if (lang === 'ru') return currentQuestion.question_ru || currentQuestion.question_es;
    if (lang === 'en') return currentQuestion.question_en || currentQuestion.question_es;
    return currentQuestion.question_es;
  };

  // Приоритет: ПДД РФ > Кнопка перевода (showTranslation) > testLanguage (настройки)
  const displayQuestion = getQuestionText(effectiveLanguage);
  const displayTopic = currentQuestion.topics?.title_es || 'Sin tema';

  // Typography Hierarchy: Question should be "Boss" - larger & bolder than answers
  const fontSizeClasses = [
    'text-lg sm:text-xl font-bold tracking-tight leading-tight', // small
    'text-xl sm:text-2xl font-bold tracking-tight leading-tight', // default
    'text-2xl sm:text-3xl font-bold tracking-tight leading-tight',  // large
  ];

  const toggleTranslation = async () => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setShowTranslation(!showTranslation);
    setTimeout(() => setIsTransitioning(false), 150);
  };


  const handleClose = () => {
    setShowExitConfirm(true);
  };

  return (
    <Layout hideNavigation={true}>
      <GameBackground mode={mode} timeLeft={timeLeft} streak={streak} />
      <TestContentLayout
        mode={mode}
        isTelegramApp={!!isTelegramApp}
        isPracticeLikeMode={!!isPracticeLikeMode}
        isRedemptionMode={!!isRedemptionMode}
        sidebar={
          !isTelegramApp && isPracticeLikeMode && mode !== 'blitz' && mode !== 'exam' && mode !== 'exam-russia' && (
            <div className="lg:mt-[76px]">
              <AIWidget
                id={currentQuestion.id}
                explanation={selectedOption ? (showTranslation ? currentQuestion.explanation_ru :
                  (effectiveLanguage === 'ru' ? currentQuestion.explanation_ru :
                    (effectiveLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es))) : null}
                explanationRu={selectedOption ? currentQuestion.explanation_ru : null}
                explanationEs={selectedOption ? currentQuestion.explanation_es : null}
                explanationEn={selectedOption ? currentQuestion.explanation_en : null}
                question={effectiveLanguage === 'ru' ? currentQuestion.question_ru :
                  (effectiveLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es)}
                correctAnswer={sortedOptions.find((opt) => opt.is_correct)?.[
                  effectiveLanguage === 'ru' ? 'text_ru' :
                    (effectiveLanguage === 'en' ? 'text_en' : 'text_es')] || ''}
                userAnswer={selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[
                  effectiveLanguage === 'ru' ? 'text_ru' :
                    (effectiveLanguage === 'en' ? 'text_en' : 'text_es')] : undefined}
                isCorrect={sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false}
                topic={currentQuestion.topics?.title_es}
                imageUrl={currentQuestion.image_url}
                showTranslation={showTranslation}
                onToggleTranslation={toggleTranslation}
                testLanguage={effectiveLanguage}
                country={isRussia ? 'russia' : 'spain'}
              />
            </div>

          )
        }
      >
        <OfflineStatusIndicator isOnline={isOnline} pendingSync={pendingSync} />

        <TestSessionHeader
          mode={mode as any}
          isTelegramApp={!!isTelegramApp}
          handleClose={() => setShowExitConfirm(true)}
          currentIndex={currentIndex}
          totalQuestions={sessionQuestionCount}
          answers={answers as any}
          streak={streak}
          timeLeft={timeLeft}
          russiaExam={{
            state: russiaExam.state,
            progress: russiaExam.progress,
            timeRemaining: russiaExam.timeRemaining,
            isExtraMode: russiaExam.isExtraMode,
            stats: russiaExam.stats,
          }}
          russiaExamAnswers={russiaExamAnswers}
          showTestSettings={showTestSettings}
          setShowTestSettings={setShowTestSettings}
          voiceOver={voiceOver}
          setVoiceOver={setVoiceOver}
          answerPopularity={answerPopularity}
          setAnswerPopularity={setAnswerPopularity}
          ambientMusic={ambientMusic}
          setAmbientMusic={setAmbientMusic}
          selectedMusicTrack={selectedMusicTrack}
          setSelectedMusicTrack={setSelectedMusicTrack}
          fontSize={fontSize}
          setFontSize={setFontSize}
          testLanguage={testLanguage}
          setTestLanguage={(lang: string) => handleLanguageChange(lang as any)}
          smartVocabularyEnabled={smartVocabularyEnabled}
          setSettings={setSettings}
          setShowQuestionMap={setShowQuestionMap}
          toggleBookmark={toggleBookmark}
          isQuestionBookmarked={isQuestionBookmarked}
          bookmarkLoading={bookmarkLoading}
          profileId={profileId || ""}
          toggleTranslation={toggleTranslation}
          showTranslation={showTranslation}
          masteryRound={masteryRound}
          onReportProblem={() => setShowReportModal(true)}
        />


        {/* Question Card - используем UniversalQuestionCard для exam-russia */}
        {mode === 'exam-russia' && russiaExam.currentQuestion ? (
          <motion.div
            key={russiaExam.currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "max-w-5xl mx-auto w-full mt-6",
              isAnswerLocked && "opacity-50 pointer-events-none"
            )}
          >
            <UniversalQuestionCard
              mode="exam-russia"
              question={russiaExam.currentQuestion.text || (russiaExam.currentQuestion as ExtendedQuestion).question_ru || (russiaExam.currentQuestion as ExtendedQuestion).question_text || ''}
              image={russiaExam.currentQuestion.image || (russiaExam.currentQuestion as ExtendedQuestion).image_url}
              imageAspectRatio={russiaExam.currentQuestion.image ? getCachedImageAspectRatio(russiaExam.currentQuestion.image) : null}
              explanation={russiaExam.currentQuestion.explanation || null}
              answers={(russiaExam.currentQuestion.answers || (russiaExam.currentQuestion as { answer_options?: Array<unknown> }).answer_options || []).map((a: { id: string; text?: string; text_ru?: string; text_es?: string; text_en?: string; is_correct?: boolean; position?: number }) => ({
                id: a.id,
                text: a.text || a.text_ru || '',
                isCorrect: !!a.is_correct, // Cast to boolean properly using available property
              }))}
              selectedAnswerId={selectedOption}
              showResult={false} // на экзамене не показываем результат сразу
              disabled={isAnswerLocked}
              onAnswerClick={(answerId) => {
                if (mode === "exam-russia" && !isAnswerLocked) {
                  selectOption(answerId);
                }
              }}
              onShowExplanation={selectedOption ? handleOpenAIChat : undefined}
              fontSize={fontSize as any}
              header={
                russiaExam.isExtraMode && (
                  <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {t('test.extraBlockWarning')}
                    </p>
                  </div>
                )
              }
              footer={
                <SubmitButton
                  label={t('test.confirm')}
                  onClick={() => handleAnswer(selectedOption ?? undefined)}
                  disabled={!selectedOption || isAnswerLocked}
                  isEnterPressed={isEnterPressed}
                  variant="exam"
                  tooltipText={t('test.confirmTooltip')}
                  showArrow={!!selectedOption}
                  showKeyboardHint={true}
                />
              }
            />
          </motion.div>
        ) : mode === 'blitz' ? (
          <div className="max-w-5xl mx-auto w-full">
            <BlitzQuestionCard
              blitzShaking={blitzShaking}
              currentQuestion={currentQuestion}
              displayQuestion={displayQuestion}
              fontSize={fontSize}
              sortedOptions={sortedOptions || []}
              selectedOption={selectedOption}
              selectOption={selectOption}
              handleAnswer={handleAnswer}
              nextQuestion={nextQuestion}
              testLanguage={effectiveLanguage}
            />
          </div>
        ) : (
          <div className={cn(
            "max-w-[1300px] w-full mx-auto",
          )}>
            <QuestionCard
              currentQuestion={currentQuestion as any}
              displayQuestion={displayQuestion}
              isRussia={isRussia}
              feedbackStatus={feedbackStatus}
              fontSize={fontSize as any}
              isTransitioning={isTransitioning}
              sortedOptions={sortedOptions || []}
              selectedOption={selectedOption}
              isPracticeLikeMode={isPracticeLikeMode}
              mode={mode}
              testLanguage={effectiveLanguage}
              showTranslation={showTranslation}
              toggleTranslation={toggleTranslation}
              answerPopularity={answerPopularity || false}
              selectOption={selectOption}
              handleAnswer={handleAnswer}
              handleOpenAIChat={handleOpenAIChat}
              nextQuestion={nextQuestion}
              isEnterPressed={isEnterPressed}
              onReportProblem={() => setShowReportModal(true)}
            />
          </div>
        )}

        {/* 
          Modern AI floating widget - Moved or removed as requested by user
        */}
        {(mode === 'marathon' || mode === 'practice' || mode === 'mastery') && (
          null
        )}


        {/* Question Map Bottom Sheet */}
        <TestSessionModals
          showQuestionMap={showQuestionMap}
          setShowQuestionMap={setShowQuestionMap}
          questions={universalQuestions}
          currentIndex={currentIndex}
          answers={answers as any}
          jumpToQuestion={jumpToQuestion}
          mode={mode}
          showReportModal={showReportModal}
          setShowReportModal={setShowReportModal}
          currentQuestion={currentQuestion as any}
          showTranslation={showTranslation}
          testLanguage={testLanguage}
          showChallengeBankNotification={showChallengeBankNotification}
          setShowChallengeBankNotification={setShowChallengeBankNotification}
          isRedemptionMode={isRedemptionMode}
          showReflectionOverlay={showReflectionOverlay}
          setShowReflectionOverlay={setShowReflectionOverlay}
          redemptionStep={redemptionStep}
          redemptionFlashcards={redemptionFlashcards}
          redemptionAnalysisData={redemptionAnalysisData}
          showPenaltyAlert={showPenaltyAlert}
          setShowPenaltyAlert={setShowPenaltyAlert}
          penaltyBlock={penaltyBlock as any}
          setPenaltyBlock={setPenaltyBlock}
          russiaExam={russiaExam}
          setIsAnswerLocked={setIsAnswerLocked}
          setIsTransitioning={setIsTransitioning}
          setCurrentIndex={setCurrentIndex}
          showFailureModal={showFailureModal}
          failureReason={failureReason}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          userLanguage={userLanguage}
          onViewResults={onViewResults}
        />

      </TestContentLayout>
    </Layout >
  );
};

export default TestSession;
