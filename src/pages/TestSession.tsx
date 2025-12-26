import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, CheckCircle2, XCircle, Languages, Lightbulb, ChevronLeft, ChevronRight, Grid3x3, X, AlertTriangle, Bot, MessageCircle, Bookmark, BookmarkCheck, MoreVertical, Trophy, ArrowRight } from "lucide-react";
import { QuestionProgressBar } from "@/components/QuestionProgressBar";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { PenaltyAlert } from "@/components/exam/PenaltyAlert";
import { ExamFailureModal } from "@/components/exam/ExamFailureModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { UniversalQuestionCard } from "@/components/shared/question";
import { AppButton, AppProgressBar } from "@/components/shared/ui";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isTelegramMiniApp, triggerHapticFeedback } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { getImageUrl, preloadImage, getCachedImageAspectRatio, preloadImages } from "@/utils/imageUtils";
import { QuestionImage } from "@/components/test/QuestionImage";
import { QuestionText } from '@/components/test/QuestionText';
import { AnswerButton } from '@/components/test/AnswerButton';
import { saveTestProgress, loadTestProgress, clearTestProgress } from "@/utils/testStorage";
import { useExamStore, selectActiveState, selectCurrentQuestion, selectTimerValue } from "@/store/examStore";
import { getExamStats, handleMainQuestionAnswer, handleExtraQuestionAnswer } from "@/utils/russiaExamLogic";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { AIExplanationDialog } from "@/components/AIExplanationDialog";
import { AIWidget } from "@/components/AIWidget";
import { TestExitDialog } from "@/components/test-session/TestExitDialog";
import { TestQuestionMap } from "@/components/test-session/TestQuestionMap";
import { TestContentLayout } from "@/components/test-session/TestContentLayout";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { TestSettingsMenu } from "@/components/TestSettingsMenu";
import { ChallengeBankNotification } from "@/components/ChallengeBankNotification";
import { OfflineStatusIndicator, AnswerOptionsList } from "@/components/test-session";
import { AccountWatermark } from "@/components/anti-abuse/AccountWatermark";
import { usePremium } from "@/hooks/usePremium";
import { mapRussiaQuestionToUniversal } from "@/utils/pddAdapters";
import { usePDDContext } from "@/contexts/PDDContext";
import { CountryCode } from "@/types/pdd";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trackOfflineAction } from "@/utils/offlineAnalytics";
import { useOnlineStatus, checkOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTestSettings } from "@/hooks/test-session/useTestSettings";
import { useTestAudio } from "@/hooks/test-session/useTestAudio";
import { useTestAmbientMusic } from "@/hooks/test-session/useTestAmbientMusic";
import { useTestDataLoader, type TestMode } from "@/hooks/test-session/useTestDataLoader";
import { BlitzHeader, BlitzGameCard } from "@/components/blitz";

type QuestionData = {
  id: string;
  question_ru: string;
  question_es: string;
  question_en: string;
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

type Answer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
};

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
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId);
  const { selectedCountry } = usePDDContext();
  const isRussia = (countryParam || selectedCountry) === 'russia';
  const { language: userLanguage } = useLanguage();
  const mode = useMemo(() => {
    if (rawMode) return rawMode;
    if (location.pathname.includes("/learn/") && ticketIdParam) return "pdd-ticket";
    if (location.pathname.includes("/test/sequential")) return "sequential";
    if (location.pathname.includes("/test/challenge-bank")) return "challenge-bank";
    if (location.pathname.includes("/test/module")) return "module";
    if (location.pathname.includes("/test/dgt")) return "dgt";
    if (location.pathname.includes("/test/exam-russia") || searchParams.get('mode') === 'exam-russia') return "exam-russia";
    if (location.pathname.includes("/test/by-topic") || searchParams.get('topic')) return "by-topic";
    if (location.pathname.includes("/test/nonstop")) return "nonstop";
    return "practice";
  }, [rawMode, location.pathname, searchParams, ticketIdParam]);

  // Определяем страну для ПДД билета
  const pddCountry = useMemo(() => {
    // Если мы в режиме РФ (явно или через настройки)
    if (isRussia || mode === 'pdd-ticket' || mode === 'exam-russia' || mode === 'challenge-bank') {
      return countryParam || selectedCountry || 'russia';
    }
    return null;
  }, [mode, countryParam, selectedCountry, isRussia]);

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
  const questionCount = countParam ? parseInt(countParam) : (mode === 'nonstop' && selectedCountry === 'russia' ? 800 : 30);
  const blitzDuration = parseInt(searchParams.get('timer') || (mode === 'blitz' ? '60' : '300')) || (mode === 'blitz' ? 60 : 300);
  const initialTimeBudget = mode === "exam" ? 30 * 60 : mode === "blitz" ? blitzDuration : 0;
  const [showTranslation, setShowTranslation] = useState(false);
  const [questionsState, setQuestionsState] = useState<QuestionData[]>([]);

  // Game Engine - manages navigation and answers
  // === ZUSTAND CORE (Replacing useTestEngine) ===
  const activeState = useExamStore(state => state.activeState);
  const initializeExam = useExamStore(state => state.initializeExam);
  // Aliases for compatibility
  const examState = activeState?.kind === 'russia' ? activeState.data : null;
  const answerQuestionZ = useExamStore(state => state.answerQuestion);
  const answerQuestionZustand = (isCorrect: boolean) => answerQuestionZ('compat-alias', isCorrect);
  const modifyTime = useExamStore(state => state.modifyTime);
  const timeLeft = useExamStore(selectTimerValue);

  const nextQuestionZ = useExamStore(state => state.nextQuestion);
  const prevQuestionZ = useExamStore(state => state.prevQuestion);
  const jumpToQuestionZ = useExamStore(state => state.jumpToQuestion);
  const tickTimer = useExamStore(state => state.tickTimer);
  const resetExam = useExamStore(state => state.resetExam);

  // Local UI State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
      ].map(a => ({
        questionId: a.questionId,
        selectedAnswerId: a.selectedAnswerId || '', // Russia logic might not store ID, only correctness? Check types.
        isCorrect: a.isCorrect
      }));
    }
    // Standard
    return Object.values(activeState.data.answers).map((a: any) => ({
      questionId: questionsState.find(q => q.id === Object.keys(activeState.data.answers).find(k => activeState.data.answers[k] === a))?.id || '',
      selectedAnswerId: a.selectedOptionId,
      isCorrect: a.isCorrect
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
  const [startTime, setStartTime] = useState<number>(0);
  const [showAIExplanation, setShowAIExplanation] = useState(false);
  const [showChallengeBankNotification, setShowChallengeBankNotification] = useState(false);
  const [isFirstWrongAnswer, setIsFirstWrongAnswer] = useState(true);
  const [isQuestionBookmarked, setIsQuestionBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [blitzShaking, setBlitzShaking] = useState(false); // Screen shake for Blitz wrong answers
  // ============================================
  // DATA LAYER: Single source of truth for questions
  // ============================================
  const topicName = searchParams.get('topic');

  const dataLoader = useTestDataLoader({
    mode: mode as TestMode,
    profileId,
    testId,
    topic: topicName || topic || undefined,
    pddCountry: pddCountry || selectedCountry || undefined,
    ticketNumber: ticketNumber || undefined,
    questionCount,
  });

  // Derived loading state
  const loading = dataLoader.isLoading;

  // Derived testInfo - DEFINED HERE BEFORE USE
  const testInfo = useMemo((): { id: string; title: string } | null => {
    if (dataLoader.isLoading) return null;

    // Use testInfo from dataLoader if available
    if (dataLoader.testInfo) return dataLoader.testInfo;

    return dataLoader.testInfo || null;
  }, [dataLoader.testInfo, dataLoader.isLoading]);

  // Load progress effect
  useEffect(() => {
    if (testInfo?.id && questionsState.length > 0 && hasLoadedProgressRef.current !== testInfo.id) {
      const restoreProgress = async () => {
        try {
          const savedProgress = await loadTestProgress(testInfo.id);
          if (savedProgress && savedProgress.answers.length > 0) {
            console.log(`[TestSession] Restoring progress for ${testInfo.id} at index ${savedProgress.currentIndex}`);
            savedProgress.answers.forEach(ans => {
              // Восстанавливаем ответы в стор
              answerQuestionZ(ans.selectedAnswerId || '', ans.isCorrect);
            });
            jumpToQuestionZ(savedProgress.currentIndex);
            if (savedProgress.startTime) {
              setStartTime(savedProgress.startTime);
            }
            toast.info("Прогресс восстановлен", { icon: "↩️" });
          }
          hasLoadedProgressRef.current = testInfo.id;
        } catch (error) {
          console.error('[TestSession] Error restoring progress:', error);
          hasLoadedProgressRef.current = testInfo.id; // Mark as "tried" even on error
        }
      };

      restoreProgress();
    }
  }, [testInfo?.id, questionsState.length, setAnswers, setCurrentIndex]);

  // Состояние для модального окна штрафа в exam-russia
  const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);
  const [penaltyBlock, setPenaltyBlock] = useState<number | null>(null);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState<string>("");
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [streak, setStreak] = useState(0);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

  const {
    voiceOver, setVoiceOver,
    answerPopularity, setAnswerPopularity,
    ambientMusic, setAmbientMusic,
    fontSize, setFontSize
  } = useTestSettings();
  const [testLanguage, setTestLanguage] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('test-language');
    // Если сохранен 'ru', заменяем на 'es' (русский доступен только через кнопку перевода)
    if (saved === 'ru') {
      localStorage.setItem('test-language', 'es');
      return 'es';
    }
    return (saved === 'en' ? 'en' : 'es') as 'es' | 'en';
  });
  const testSessionIdRef = useRef<string | null>(null);
  const testSessionStartedRef = useRef<boolean>(false); // Флаг для отслеживания старта сессии
  const isClosingRef = useRef<boolean>(false); // Флаг для предотвращения повторного закрытия
  const getOrCreateSessionId = () => {
    if (!testSessionIdRef.current) {
      const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      testSessionIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : fallbackId;
    }
    return testSessionIdRef.current;
  };

  // КРИТИЧНО: Вызываем start-test-session Edge Function при старте теста
  useEffect(() => {
    const startTestSession = async () => {
      // Проверяем условия: вопросы загружены, есть profileId, сессия еще не начата
      if (!profileId || questionsState.length === 0 || testSessionStartedRef.current) {
        return;
      }

      const sessionId = getOrCreateSessionId();

      try {
        // Проверяем онлайн статус
        const realOnline = await checkOnlineStatus();
        if (!realOnline) {
          // В offline режиме не вызываем Edge Function, но помечаем как начатую локально
          testSessionStartedRef.current = true;
          return;
        }

        const { data, error } = await supabase.functions.invoke('start-test-session', {
          body: {
            user_id: profileId,
            session_id: sessionId,
            test_id: testId || null,
            questions_count: questionsState.length,
            mode: mode || null,
          },
        });

        if (error) {
          console.error('[TestSession] Error starting test session:', error);
          // Не блокируем тест, но логируем ошибку
          toast.warning("Не удалось зарегистрировать начало теста. Результаты могут быть не сохранены.");
        } else {
          testSessionStartedRef.current = true;
        }
      } catch (error) {
        console.error('[TestSession] Unexpected error starting test session:', error);
        // Не блокируем тест
      }
    };

    startTestSession();
  }, [profileId, questionsState.length, mode, testId]); // Вызываем когда вопросы загружены

  // Mastery Mode - отслеживаем неправильные вопросы для повторения
  const [masteryWrongQuestions, setMasteryWrongQuestions] = useState<string[]>([]);
  const [masteryRound, setMasteryRound] = useState(1);

  // КРИТИЧНО: Состояния для отслеживания онлайн/офлайн и синхронизации
  // FIX: Используем useOnlineStatus вместо navigator.onLine (Safari bug)
  const isOnline = useOnlineStatus();
  const [pendingSync, setPendingSync] = useState(false);



  const isTelegramApp = isTelegramMiniApp();

  // Сохраняем настройки в localStorage

  useEffect(() => {
    localStorage.setItem('test-language', testLanguage);
  }, [testLanguage]);



  // Ambient Music Hook
  useTestAmbientMusic(ambientMusic);

  // Voice Over Hook
  const voiceOverText = useMemo(() => {
    if (!questionsState[currentIndex]) return undefined;
    const q = questionsState[currentIndex];
    // Если регион Россия или включен перевод - читаем на русском
    if (isRussia || showTranslation) return q.question_ru;
    return testLanguage === 'en' ? q.question_en : q.question_es;
  }, [questionsState, currentIndex, isRussia, showTranslation, testLanguage]);

  const voiceOverLang = useMemo(() => {
    if (isRussia || showTranslation) return 'ru';
    return testLanguage;
  }, [isRussia, showTranslation, testLanguage]);

  useTestAudio(
    voiceOver,
    voiceOverText,
    voiceOverLang
  );



  // Reset drag state when modal closes and prevent body scroll
  useEffect(() => {
    if (showQuestionMap) {
      // Сохраняем текущую позицию скролла перед блокировкой
      const scrollY = window.scrollY;

      // Блокируем скролл фона при открытом модальном окне
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.left = '0';
      document.body.style.right = '0';

      // Сохраняем позицию скролла в data-атрибут для восстановления
      document.body.setAttribute('data-scroll-y', scrollY.toString());
    } else {
      // Восстанавливаем позицию скролла
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');

      // Разблокируем скролл при закрытии
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';

      // Восстанавливаем позицию скролла
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }

      setIsClosing(false);
    }

    return () => {
      // Очистка при размонтировании
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    };
  }, [showQuestionMap]);

  // Функция закрытия модального окна Question Map
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

  // Close modal with Escape key
  useEffect(() => {
    if (!showQuestionMap) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosingRef.current && !isClosing) {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQuestionMap, isClosing]);


  // ============================================
  // ADAPTER: Map loader data to legacy variable names
  // These aliases allow the existing useEffect to work unchanged
  // ============================================

  // ПДД РФ активно для России во всех тренировочных режимах и экзамене
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
    mode === 'challenge-bank'
  );

  // Алиасы для отдельных хуков — создаём объекты с тем же интерфейсом
  const challengeBankQuestions = useMemo(() => ({
    data: mode === 'challenge-bank' ? dataLoader.questions : null,
    isLoading: mode === 'challenge-bank' && dataLoader.isLoading,
    error: mode === 'challenge-bank' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const dgtQuestions = useMemo(() => ({
    data: mode === 'dgt' ? dataLoader.questions : null,
    isLoading: mode === 'dgt' && dataLoader.isLoading,
    error: mode === 'dgt' ? dataLoader.error : null,
  }), [mode, dataLoader.questions, dataLoader.isLoading, dataLoader.error]);

  const pddRandomQuestions = useMemo(() => ({
    data: shouldUsePDD && (mode === 'practice' || mode === 'blitz' || mode === 'exam' || mode === 'nonstop' || mode === 'marathon' || mode === 'traps' || mode === 'mastery' || mode === 'hardest') ? dataLoader.questions : null,
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

  // For exam-russia mode, extract special data structures
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

  // ============================================
  // DERIVED VALUES: Replace old useState + useEffect pattern
  // ============================================

  // Derived questions - converts PDD format to QuestionData if needed
  const questions = useMemo((): QuestionData[] => {
    // Determine the source of raw questions
    let raw: any[] = [];
    if (mode === 'exam-russia' || mode === 'pdd-ticket') {
      raw = (universalPDDQuestions || []);
    } else {
      raw = (dataLoader.questions || []);
    }

    if (!raw || raw.length === 0) return [];

    return raw.map((q: any) => ({
      id: q.id,
      question_ru: q.text || q.question_ru || q.question_text || q.question_es || '',
      question_es: q.question_es || q.text || q.question_ru || q.question_text || '',
      question_en: q.question_en || q.text || q.question_ru || q.question_text || '',
      image_url: q.image || q.image_url || q.image_filename || null,
      explanation_ru: q.explanation || q.explanation_ru || q.explanation_es || null,
      explanation_es: q.explanation_es || q.explanation || q.explanation_ru || null,
      explanation_en: q.explanation_en || q.explanation || q.explanation_ru || null,
      topics: q.topics && q.topics.length > 0
        ? (typeof q.topics[0] === 'string' ? { title_ru: q.topics[0], title_es: q.topics[0] } : q.topics[0])
        : (q.topic_title_ru ? { title_ru: q.topic_title_ru, title_es: q.topic_title_es } : null),
      answer_options: (q.answers || q.answer_options || []).map((a: any) => ({
        id: a.id,
        text_ru: a.text || a.text_ru || a.answer_text || '',
        text_es: a.text_es || a.text || a.text_ru || a.answer_text || '',
        text_en: a.text_en || a.text || a.text_ru || a.answer_text || '',
        is_correct: a.is_correct !== undefined ? a.is_correct : (a.isCorrect !== undefined ? a.isCorrect : false),
        position: a.position || 0,
      })),
    }));
  }, [mode, universalPDDQuestions, dataLoader.questions]);

  // Sync questionsState with derived questions for useTestEngine
  useEffect(() => {
    if (questions.length > 0) {
      // Prevent infinite loop by checking if questions actually changed
      // Simple referential equality check is not enough because questions is a new array every time
      const isDifferent =
        questions.length !== questionsState.length ||
        (questions[0]?.id !== questionsState[0]?.id);

      if (isDifferent) {
        setQuestionsState(questions);
      }
    }
  }, [questions, questionsState]);



  // === ZUSTAND INIT ===
  // Инициализация экзамена через стор (для ВСЕХ режимов)
  useEffect(() => {
    if (questionsState.length > 0) {
      // Инициализируем, если есть вопросы. Стор сам проверит дубликаты.
      initializeExam(mode as any, questionsState, {
        allQuestionsByBlock,
        timeLimit: initialTimeBudget
      });
    }
  }, [mode, questionsState, allQuestionsByBlock, initializeExam, initialTimeBudget]);

  // Глобальный таймер (тикает всегда, стор решает что делать с тиком)
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimer]);


  // Адаптер для совместимости с существующим JSX кодом (временное решение перед полным рефакторингом UI)
  // Адаптер для совместимости с существующим JSX кодом
  const russiaExam = useMemo(() => {
    if (!examState) return {
      state: null,
      currentQuestion: null,
      isExtraMode: false,
      progress: { current: 0, total: 0 },
      currentBlock: null,
      errorsInCurrentBlock: 0,
      stats: null,
      handleAnswer: () => ({ shouldContinue: true }),
      timeRemaining: 0,
      status: 'in-progress'
    };

    const currentQ = examState.isExtraMode
      ? (examState.extraQuestions[examState.currentExtraIndex]?.question || null)
      : (examState.mainQuestions[examState.currentMainIndex] || null);

    if (currentQ) {
      console.log('[RussiaExamAdapter] Current question:', {
        id: currentQ.id,
        text: currentQ.text,
        answersCount: currentQ.answers?.length,
        isExtra: examState.isExtraMode
      });
    }

    return {
      state: examState,
      currentQuestion: currentQ,
      isExtraMode: examState.isExtraMode,
      progress: examState.isExtraMode
        ? { current: examState.currentExtraIndex + 1, total: examState.extraQuestions.length, label: 'Доп. вопросы' }
        : { current: examState.currentMainIndex + 1, total: examState.mainQuestions.length, label: 'Основные вопросы' },
      currentBlock: Math.ceil((examState.currentMainIndex + 1) / 5),
      errorsInCurrentBlock: 0,
      stats: getExamStats(examState),
      handleAnswer: (isCorrect: boolean) => {
        // Локальный расчет для UI
        let result;
        if (examState.isExtraMode) {
          result = handleExtraQuestionAnswer(examState, examState.currentExtraIndex, isCorrect);
        } else {
          result = handleMainQuestionAnswer(examState, examState.currentMainIndex, isCorrect);
        }
        // Отправка в стор
        answerQuestionZ('', isCorrect);
        return result;
      },
      timeRemaining: examState.timeRemaining,
      status: examState.status
    };
  }, [examState, answerQuestionZ]);

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

  // Универсальный мониторинг статуса (Провал / Завершение по таймеру)
  useEffect(() => {
    if (!activeState) return;
    const { status } = activeState.data;

    // FAILED status handling
    if (status === 'failed' || status === 'failed-extra') {
      if (!showFailureModal) {
        const reason = activeState.kind === 'russia'
          ? (activeState.data as any).failureReason
          : "Время вышло";
        setFailureReason(reason || "Тест завершен");
        setShowFailureModal(true);
      }
    }

    // COMPLETED status (e.g. timeout in Standard mode without explicit 'failure' flag? Or 'completed'?)
    // In our store, timeout sets 'failed'. Finish sets 'completed'.
    // We should handle 'completed' redirect here too potentially, or let TestFinisher do it?
    // TestFinisher is removed (or logic moved).

    if (status === 'completed') {
      // Redirect to results
      // But we need to pass data.
      // Let's rely on manual navigation for now inside handleAnswer or NextButton?
      // Or adds a completion effect?
      // For now, assume Completion handled by UI actions (Last question -> Results).
      // But store sets 'completed' on last nextQuestion.
      if (activeState.kind === 'standard') {
        navigate('/test/results', {
          state: {
            questions: questions,
            answers: answers,
            mode: mode,
            testInfo: testInfo,
            timeSpent: activeState.data.timeLimit ? (activeState.data.timeLimit - activeState.data.timeInfo) : activeState.data.timeInfo,
            // ... stats
          }
        });
      }
    }

  }, [activeState, showFailureModal, navigate, answers, mode, testInfo, questions]);

  // Обработка успешного завершения экзамена РФ
  useEffect(() => {
    if (mode === 'exam-russia' && russiaExam.status === 'passed') {
      // Небольшая задержка для завершения анимаций
      const timer = setTimeout(() => {
        navigate('/test/results', {
          state: {
            questions: questions,
            answers: answers,
            mode: mode,
            testInfo: testInfo,
            timeSpent: russiaExam.stats?.timeSpent ?? 0,
            russiaExamStats: russiaExam.stats,
          },
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, russiaExam.status, russiaExam.stats, questions, answers, testInfo, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentQ = mode === 'exam-russia' ? russiaExam.currentQuestion : questions[currentIndex];
      if (!currentQ) return;

      const currentAnswers = mode === 'exam-russia'
        ? russiaExam.currentQuestion?.answers
        : currentQ.answer_options;

      if (!currentAnswers) return;

      // Select option 1-9
      if (/^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key) - 1;
        if (index < currentAnswers.length) {
          const answerId = currentAnswers[index].id;
          if (!isAnswerLocked) {
            setSelectedOption(answerId);
          }
        }
      }

      // Confirm with Enter
      if (e.key === 'Enter') {
        if (selectedOption && !isAnswerLocked) {
          handleAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, russiaExam.currentQuestion, questions, currentIndex, selectedOption, isAnswerLocked]);


  // ============================================
  // LEGACY useEffect REMOVED
  // Data is now loaded reactively via derived values (lines 640-783)
  // The pattern { questions, loading, testInfo } now comes from useMemo blocks
  // ============================================

  // Bookmark check effect




  // Проверяем, добавлен ли текущий вопрос в закладки
  useEffect(() => {
    if (profileId && questions.length > 0 && questions[currentIndex]?.id) {
      checkIfBookmarked();
    }
  }, [profileId, currentIndex, questions]);

  const checkIfBookmarked = async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.id) {
      return;
    }

    try {
      const { data, error } = await (supabase as any).from('user_challenge_questions')
        .select('id')
        .eq('user_id', profileId)
        .eq('question_id', questions[currentIndex].id)
        .maybeSingle();


      if (error && error.code !== 'PGRST116') {
        console.error('[Bookmark] Check error:', error);
        throw error;
      }
      setIsQuestionBookmarked(!!data);
    } catch (error) {
      console.error('[Bookmark] Error checking bookmark:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!profileId) {
      console.error('[Bookmark] No profileId available');
      toast.error("Необходима авторизация для добавления в закладки");
      return;
    }

    if (!questions.length || !questions[currentIndex]?.id) {
      console.error('[Bookmark] No question available');
      return;
    }

    if (bookmarkLoading) {
      return;
    }

    const questionId = questions[currentIndex].id;

    try {
      setBookmarkLoading(true);

      // Закладки теперь работают для РФ — вопросы мигрированы в questions_new

      if (isQuestionBookmarked) {
        // Удаляем из закладок
        const { error, data } = await (supabase as any)
          .from('user_challenge_questions')
          .delete()
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .select();


        if (error) {
          console.error('[Bookmark] Delete error:', error);
          throw error;
        }
        toast.success("Удалено из закладок");
        setIsQuestionBookmarked(false);
      } else {
        // Добавляем в закладки

        // Сначала проверяем, есть ли уже запись
        const { data: existing, error: checkError } = await (supabase as any)
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .maybeSingle();


        if (checkError && checkError.code !== 'PGRST116') {
          console.error('[Bookmark] Check error:', checkError);
          throw checkError;
        }

        if (existing) {
          // Уже есть, просто показываем сообщение
          toast.success("Вопрос уже в закладках");
          setIsQuestionBookmarked(true);
        } else {
          // Создаем новую запись с times_wrong = 0 (добавлено вручную)
          const { data: insertData, error: insertError } = await (supabase as any)
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 0, // 0 означает добавлено вручную, не через ошибку
              last_wrong_at: new Date().toISOString(),
            })
            .select();


          if (insertError) {
            console.error('[Bookmark] Insert error details:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint
            });
            throw insertError;
          }
          toast.success("Добавлено в закладки");
          setIsQuestionBookmarked(true);
        }
      }
    } catch (error: any) {
      console.error('[Bookmark] Error toggling bookmark:', error);
      const errorMessage = error?.message || error?.details || "Не удалось изменить закладку";
      console.error('[Bookmark] Full error object:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
      toast.error(`Не удалось изменить закладку: ${errorMessage}`);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ОПТИМИЗАЦИЯ: Агрессивная предзагрузка изображений следующих вопросов
  useEffect(() => {
    if (questions.length === 0 || loading) return;

    const preloadNextImages = async () => {
      const imagesToPreload: (string | null | undefined)[] = [];

      // КРИТИЧНО: Предзагружаем следующее изображение ПРИОРИТЕТНО (для мгновенного переключения)
      if (currentIndex + 1 < questions.length && questions[currentIndex + 1]?.image_url) {
        imagesToPreload.push(questions[currentIndex + 1].image_url);
      }

      // Предзагружаем изображения следующих 3-5 вопросов (для плавной прокрутки)
      for (let i = 2; i <= 5 && currentIndex + i < questions.length; i++) {
        if (questions[currentIndex + i]?.image_url) {
          imagesToPreload.push(questions[currentIndex + i].image_url);
        }
      }

      // Предзагружаем предыдущее изображение (на случай возврата назад)
      if (currentIndex > 0 && questions[currentIndex - 1]?.image_url) {
        imagesToPreload.push(questions[currentIndex - 1].image_url);
      }

      // Предзагружаем все изображения в фоне
      if (imagesToPreload.length > 0) {
        // Первое изображение предзагружаем сразу
        preloadImage(imagesToPreload[0]).catch(() => {
          // Игнорируем ошибки предзагрузки
        });

        // Остальные предзагружаем с небольшой задержкой, чтобы не перегружать сеть
        if (imagesToPreload.length > 1) {
          setTimeout(() => {
            imagesToPreload.slice(1).forEach((url) => {
              preloadImage(url).catch(() => {
                // Игнорируем ошибки предзагрузки
              });
            });
          }, 200);
        }
      }
    };

    // Предзагружаем после небольшой задержки, чтобы текущее изображение загрузилось первым
    // Уменьшена задержка для более быстрой предзагрузки
    const timeoutId = setTimeout(preloadNextImages, 300);

    return () => clearTimeout(timeoutId);
  }, [currentIndex, questions, loading]);



  const loadQuestions = async () => {
    try {
      setLoading(true);

      // Если это режим Challenge Bank, загружаем вопросы с ошибками
      if (mode === 'challenge-bank' && profileId) {
        const { data: challengeQuestions, error: challengeError } = await (supabase as any)
          .rpc('get_challenge_bank_questions', {
            p_user_id: profileId,
            p_limit: 30,
            p_only_not_mastered: true
          });

        if (challengeError) throw challengeError;
        if (!challengeQuestions || challengeQuestions.length === 0) {
          toast.error("Нет вопросов в Банке Сложных Вопросов");
          navigate("/tests/challenge-bank");
          return;
        }

        // Преобразуем Challenge Bank вопросы в формат TestSession
        // Загружаем answer_options для каждого вопроса
        const questionIds = challengeQuestions.map((q: any) => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("answer_options")
          .select("*")
          .in("question_id", questionIds);

        if (optionsError) throw optionsError;

        const formattedQuestions = challengeQuestions.map((q: any) => {
          const options = (optionsData || []).filter((opt: any) => opt.question_id === q.id);
          return {
            ...q,
            answer_options: options,
            topics: q.topic_title_ru ? {
              title_ru: q.topic_title_ru,
              title_es: q.topic_title_es || q.topic_title_ru,
            } : null,
          };
        });

        setQuestions(formattedQuestions);
        setTestInfo({
          id: 'challenge_bank',
          title: '💡 Банк Сложных Вопросов™',
        });
      }
      // Режим Mastery - случайные вопросы для прохождения "до победного"
      else if (mode === 'mastery') {
        let query = (supabase as any)
          .from("questions_new")
          .select(`
            *,
            topics (title_ru, title_es),
            answer_options (*)
          `);

        // Если указана тема
        if (topic) {
          query = query.eq("topic_id", topic);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Перемешиваем и берём заданное количество вопросов
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, questionCount);

        setQuestions(limited);
        setTestInfo({
          id: 'mastery_mode',
          title: '🏆 Режим Мастерства',
        });
      }
      // Режим Hardest - самые сложные вопросы
      else if (mode === 'hardest') {
        // TODO: Загружать из статистики самые сложные вопросы
        // Пока загружаем случайные вопросы
        const { data, error } = await (supabase as any)
          .from("questions_new")
          .select(`
            *,
            topics (title_ru, title_es),
            answer_options (*)
          `);

        if (error) throw error;

        // Перемешиваем и берём заданное количество
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, questionCount);

        setQuestions(limited);
        setTestInfo({
          id: 'hardest_questions',
          title: '⚠️ Сложные Вопросы',
        });
      }
      // Если это DGT тест, загружаем из dgt_questions
      else if (mode === 'dgt' && topic) {
        const category = topic.toUpperCase();

        // Загружаем случайные 30 вопросов из DGT базы
        const { data: dgtQuestions, error: dgtError } = await (supabase as any)
          .rpc('get_random_dgt_questions', {
            p_category: category,
            p_limit: 30
          });

        if (dgtError) throw dgtError;
        if (!dgtQuestions || dgtQuestions.length === 0) {
          toast.error("Вопросы для этой категории не найдены");
          navigate("/dgt-tests");
          return;
        }

        // Преобразуем DGT вопросы в формат TestSession
        const formattedQuestions = dgtQuestions.map((q: any) => ({
          id: q.id,
          question_ru: q.question_es,
          question_es: q.question_es,
          question_en: q.question_es,
          image_url: q.image_filename || null, // Используем filename, если есть
          explanation_ru: q.explanation_es || 'Нет объяснения',
          explanation_es: q.explanation_es || 'Sin explicación',
          explanation_en: q.explanation_es || 'No explanation',
          topics: {
            title_ru: `DGT Экзамен ${category}`,
            title_es: `Examen DGT ${category}`,
          },
          answer_options: [
            {
              id: `${q.id}_a`,
              question_id: q.id,
              text_ru: q.option_a_es,
              text_es: q.option_a_es,
              text_en: q.option_a_es,
              is_correct: q.correct_answer === 'a',
              position: 1,
            },
            {
              id: `${q.id}_b`,
              question_id: q.id,
              text_ru: q.option_b_es,
              text_es: q.option_b_es,
              text_en: q.option_b_es,
              is_correct: q.correct_answer === 'b',
              position: 2,
            },
            {
              id: `${q.id}_c`,
              question_id: q.id,
              text_ru: q.option_c_es,
              text_es: q.option_c_es,
              text_en: q.option_c_es,
              is_correct: q.correct_answer === 'c',
              position: 3,
            },
          ],
        }));

        setQuestions(formattedQuestions);
        setTestInfo({
          id: `dgt_${category}`,
          title: `DGT Экзамен ${category}`,
        });
      }
      // Итоговый тест по модулю: короткий экзамен по одной теме
      else if (mode === "module" && topic) {
        const { data, error } = await (supabase as any)
          .from("questions_new")
          .select(
            `
            *,
            topics (title_ru, title_es),
            answer_options (*)
          `
          )
          .eq("topic_id", topic);

        if (error) throw error;

        const uniqueQuestionsMap = new Map<string, (typeof data)[0]>();
        (data || []).forEach((q) => {
          if (!uniqueQuestionsMap.has(q.id)) {
            uniqueQuestionsMap.set(q.id, q);
          }
        });
        const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

        const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, 20); // короче, чем обычный экзамен

        setQuestions(limited);
        setTestInfo({
          id: `module_${topic}`,
          title: "Итоговый тест по модулю",
        });
      }
      // Если это sequential тест, загружаем вопросы через функцию
      else if (testId) {
        // Получаем информацию о тесте
        const { data: testData, error: testError } = await (supabase as any)
          .from("tests")
          .select(`
            *,
            topics (title_ru, title_es)
          `)
          .eq("id", testId)
          .single();

        if (testError) throw testError;
        if (!testData) throw new Error("Test not found");

        setTestInfo({
          id: testData.id,
          title: testData.title_ru,
        });

        // Проверяем доступность теста
        if (profileId) {
          const { data: progressData } = await (supabase as any)
            .from("user_test_progress")
            .select("*")
            .eq("user_id", profileId)
            .eq("test_id", testId)
            .single();

          if (progressData && progressData.status === 'locked') {
            toast.error("Этот тест заблокирован. Пройдите предыдущие тесты.");
            navigate("/tests/sequential");
            return;
          }

          // Устанавливаем статус "in_progress" и время начала
          setStartTime(Date.now());
          (supabase as any)
            .from("user_test_progress")
            .upsert({
              user_id: profileId,
              test_id: testId,
              status: 'in_progress',
              started_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,test_id'
            });
        }

        // Загружаем вопросы через функцию
        const { data: questionsData, error: questionsError } = await (supabase as any).rpc(
          'get_test_questions',
          { p_test_id: testId }
        );

        if (questionsError) {
          console.error("Error loading test questions:", questionsError);
          throw questionsError;
        }

        if (!questionsData || questionsData.length === 0) {
          toast.error("Вопросы для этого теста не найдены");
          navigate("/tests/sequential");
          return;
        }

        // Преобразуем question_id в id для совместимости
        const questionsWithId = questionsData.map((q: any) => ({
          ...q,
          id: q.question_id || q.id
        }));

        // Загружаем answer_options для каждого вопроса
        const questionIds = questionsWithId.map((q: any) => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("answer_options")
          .select("*")
          .in("question_id", questionIds);

        if (optionsError) throw optionsError;

        // Получаем информацию о теме (уже загружена через join или загружаем отдельно)
        let topicData = testData.topics;
        if (!topicData && testData.topic_id) {
          const { data: loadedTopicData } = await (supabase as any)
            .from("topics")
            .select("title_ru, title_es")
            .eq("id", testData.topic_id)
            .single();

          if (loadedTopicData) {
            topicData = loadedTopicData;
          }
        }

        // Объединяем вопросы с опциями и темой
        const questionsWithOptions = questionsWithId.map((q: any) => {
          const options = (optionsData || []).filter((opt: any) => opt.question_id === q.id);
          return {
            ...q,
            answer_options: options,
            topics: topicData ? { title_ru: topicData.title_ru, title_es: topicData.title_es } : null,
          };
        });

        setQuestions(questionsWithOptions);

        // Предзагружаем первые несколько изображений для sequential тестов
        const firstImagesToPreload = questionsWithOptions
          .slice(0, 3)
          .map(q => q.image_url)
          .filter(Boolean) as string[];

        if (firstImagesToPreload.length > 0) {
          preloadImage(firstImagesToPreload[0]).catch(() => { });
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => { });
            }, (index + 1) * 300);
          });
        }
      } else {
        // Старый способ загрузки вопросов (для обычных тестов)
        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser();
        let profileId = null;

        if (user) {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          profileId = profile?.id;
        }

        let query = (supabase as any)
          .from("questions_new")
          .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `);

        // Filter by topic if specified
        if (topic) {
          query = query.eq("topic_id", topic);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Убираем дубликаты вопросов по id (на случай если в базе есть дубликаты)
        const uniqueQuestionsMap = new Map<string, typeof data[0]>();
        (data || []).forEach(q => {
          if (!uniqueQuestionsMap.has(q.id)) {
            uniqueQuestionsMap.set(q.id, q);
          }
        });
        const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

        // Shuffle and limit questions (не исключаем уже отвеченные)
        const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, questionCount);

        setQuestions(limited);

        // Предзагружаем первые несколько изображений для быстрого старта
        const firstImagesToPreload = limited
          .slice(0, 3)
          .map(q => q.image_url)
          .filter(Boolean) as string[];

        if (firstImagesToPreload.length > 0) {
          // Предзагружаем первое изображение сразу
          preloadImage(firstImagesToPreload[0]).catch(() => { });

          // Остальные предзагружаем с задержкой
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => { });
            }, (index + 1) * 300);
          });
        }
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Ошибка загрузки вопросов");
    } finally {
      setLoading(false);
    }
  };

  const practiceLikeModes = ["practice", "blitz", "mastery", "sequential", "module", "challenge-bank", "dgt", "pdd-ticket"];
  const isPracticeLikeMode = practiceLikeModes.includes(mode);

  // Функция для сохранения ответа в прогресс и Банк Ошибок
  const saveAnswerToDB = async (questionId: string, isCorrect: boolean) => {
    if (!profileId) return;

    try {
      // 1. Challenge Bank (только при ошибке и не в режиме mastery)
      if (!isCorrect && mode !== "mastery") {
        const { data: existing } = await (supabase as any)
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .maybeSingle();

        if (existing) {
          await (supabase as any)
            .from('user_challenge_questions')
            .update({
              times_wrong: existing.times_wrong + 1,
              last_wrong_at: new Date().toISOString(),
              mastered: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await (supabase as any)
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 1,
              last_wrong_at: new Date().toISOString(),
            });

          // Показываем уведомление о первом добавлении в банк ошибок (НЕ в Blitz режиме)
          if (isFirstWrongAnswer && mode !== 'blitz' && mode !== 'exam-russia') {
            const isNotificationHidden = localStorage.getItem('challenge-bank-notification-hidden') === 'true';
            if (!isNotificationHidden) {
              setIsFirstWrongAnswer(false);
              setShowChallengeBankNotification(true);
            }
          }
        }
        setIsQuestionBookmarked(true);
      }

      // 2. Общий прогресс (user_progress)
      const progressData = {
        user_id: profileId,
        question_id: questionId,
        is_answered: true,
        is_correct: isCorrect,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("user_progress")
        .upsert(progressData, {
          onConflict: 'user_id,question_id',
        });

      if (error && error.code !== '23505' && !error.message?.includes('409')) {
        console.error('[TestSession] Error upserting user_progress:', error);
      } else {
        // Инвалидируем кеш для мгновенного обновления визуального прогресса на других страницах
        queryClient.invalidateQueries({ queryKey: ["tickets-status"] });
        queryClient.invalidateQueries({ queryKey: ["user-progress"] });
      }
    } catch (error) {
      console.error('[TestSession] Error saving answer to DB:', error);
    }
  };

  /**
   * Помечает вопрос как "отработанный" (выполняет Inbox Zero)
   */
  const markQuestionAsMastered = async (questionId: string) => {
    if (!profileId) return;
    try {
      const { error } = await supabase
        .from('user_challenge_questions')
        .update({ mastered: true, updated_at: new Date().toISOString() })
        .eq('user_id', profileId)
        .eq('question_id', questionId);

      if (error) throw error;

      // Обновляем счетчик ошибок в кэше
      queryClient.invalidateQueries({ queryKey: ["challenge-bank-count"] });
    } catch (error) {
      console.error('[Challenge Bank] Error marking as mastered:', error);
    }
  };

  const handleAnswer = async (optionId?: string) => {
    const answerId = optionId || selectedOption;
    if (!answerId) return;

    if (isTransitioning) return;

    // Специальная обработка для экзамена ПДД РФ
    if (mode === 'exam-russia' && russiaExam.currentQuestion) {
      const selectedAnswer = (russiaExam.currentQuestion.answers || []).find(a => a.id === answerId);
      const isCorrect = selectedAnswer?.isCorrect || false;

      // This call updates STORE via adapter side-effect and returns result
      const result = russiaExam.handleAnswer(isCorrect);

      // Фоновое сохранение в БД
      saveAnswerToDB(russiaExam.currentQuestion.id, isCorrect);

      if (!result.shouldContinue) {
        setFailureReason(result.failureReason || "Экзамен не сдан");
        setShowFailureModal(true);
        // Адаптер russiaExam уже обновит ответы реактивно
        return;
      }

      // Блокируем интерфейс при ошибке
      if (!isCorrect && result?.shouldAddExtra) {
        setIsAnswerLocked(true);
        setPenaltyBlock(result.blockId || null);
        setShowPenaltyAlert(true);

        // Добавляем штрафное время (через стор, но тут у нас обратный таймер, который сам тикает)
        // В РФ режиме время добавляется или штрафуется?
        // Логика была: addPenalty(result.extraTime / 60);
        // В сторе для РФ нет modifyTime, таймер просто тикает.
        // Если нужно добавить время (или отнять), нужно проверить как это работает.
        // Но пока оставим UI тост.
        if (result.extraTime) {
          // TODO: Implement timer penalty in store for Russia if needed. 
          // Currently Russia exam failure is purely based on errors, time is just a limiter 20 min.
          // If extraTime implies extending limit? No, usually it implies nothing for countdown, just info?
          // Actually, original code added penalty. We'll skip store mod for now as Russia timer is fixed 20m usually.
          toast.info(`+${Math.floor(result.extraTime / 60)} минут добавлено за ошибку`, {
            icon: "⏱️",
            className: "bg-orange-500 text-white border-none",
          });
        }

        if (isTelegramApp) triggerHapticFeedback('heavy');
        return;
      }

      // Переход к следующему вопросу (анимация)
      setSelectedOption(null);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
      return;
    }

    // === STANDARD MODES ===
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || !currentQuestion.answer_options) {
      toast.error("Ошибка: вопрос не найден");
      return;
    }

    const selectedAnswer = currentQuestion.answer_options.find(opt => opt.id === answerId);
    const isCorrect = selectedAnswer?.is_correct || false;

    // Haptic
    if (isTelegramApp) {
      triggerHapticFeedback(isCorrect ? 'success' : 'error');
    }

    // 1. Analytics & Persistence
    if (profileId) {
      saveAnswerToDB(currentQuestion.id, isCorrect);
    }

    // Inbox Zero: Remove from challenge bank if answered correctly
    if (mode === 'challenge-bank' && isCorrect) {
      markQuestionAsMastered(currentQuestion.id);
    }

    // Mastery Mode Logic
    if (mode === "mastery" && !isCorrect) {
      setMasteryWrongQuestions(prev => prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id]);
    }

    // Blitz Mode Logic
    if (mode === 'blitz') {
      if (isCorrect) {
        modifyTime(10);
        toast.success("+10 сек", { duration: 1000, icon: "⚡️" });
      } else {
        modifyTime(-10);
        toast.error("-10 сек", { duration: 1000, icon: "📉" });
        setBlitzShaking(true);
        setTimeout(() => setBlitzShaking(false), 300);
      }
    }

    // Streak UI logic (local visual)
    if (isCorrect) {
      setStreak(prev => prev + 1);
      setFeedbackStatus('correct');
    } else {
      setStreak(0);
      setFeedbackStatus('incorrect');
    }
    setTimeout(() => setFeedbackStatus(null), 800);

    // Navigation & Finalization Logic
    const isPracticeLikeMode = ['practice', 'pdd-topic', 'pdd-ticket', 'by-topic', 'traps', 'mastery', 'hardest', 'sequential', 'challenge-bank'].includes(mode);

    if (isPracticeLikeMode) {
      setIsTransitioning(false); // Stay for feedback
    } else {
      // Auto advance
      setSelectedOption(null);
      engineNextQuestion();
    }
  };



  // КРИТИЧНО: Отслеживание онлайн/офлайн статуса и синхронизация
  // FIX: Используем useOnlineStatus хук, события обрабатываются там
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    // Отслеживаем изменение с offline на online
    if (!prevOnlineRef.current && isOnline) {
      setPendingSync(true);

      // Синхронизируем сохраненные ответы при восстановлении связи
      if (testInfo?.id && answers.length > 0) {
        toast.success('Соединение восстановлено', {
          description: 'Синхронизируем ваши ответы...',
          duration: 3000,
        });

        // Здесь можно добавить синхронизацию с сервером
        // Пока просто сохраняем локально
        saveTestProgress(
          testInfo.id,
          mode,
          answers.map(a => ({
            questionId: a.questionId,
            selectedAnswerId: a.selectedAnswerId,
            isCorrect: a.isCorrect,
            timestamp: Date.now(),
          })),
          currentIndex,
          startTime
        ).then(() => {
          setPendingSync(false);
          toast.success('Прогресс синхронизирован', { duration: 2000 });
        }).catch((error) => {
          console.error('[TestSession] Error syncing progress:', error);
          setPendingSync(false);
        });
      }
    }

    // Отслеживаем изменение с online на offline
    if (prevOnlineRef.current && !isOnline) {
      toast.warning('Потеряно соединение с интернетом', {
        description: 'Ваши ответы сохраняются локально',
        duration: 5000,
      });
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, testInfo, answers, currentIndex, startTime, mode]);

  // Прокрутка вверх при изменении вопроса
  useEffect(() => {
    if (questions.length > 0 && currentIndex >= 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex, questions.length]);

  // Navigation wrappers - add UI logic on top of engine
  const jumpToQuestion = (index: number) => {
    engineJumpToQuestion(index);
    setShowTranslation(false);
    setShowAIExplanation(false);
  };

  const nextQuestion = () => {
    // КРИТИЧНО: Сбрасываем выбранный ответ при переходе на следующий вопрос
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      engineNextQuestion();
      setShowTranslation(false);
      setShowAIExplanation(false);
    } else {
      finishTest();
    }
  };

  const prevQuestion = () => {
    enginePrevQuestion();
    setShowTranslation(false);
    setShowAIExplanation(false);
  };

  const finishTest = async () => {
    // КРИТИЧНО: Очищаем локальное сохранение после завершения теста
    if (testInfo?.id) {
      clearTestProgress(testInfo.id).catch((error) => {
        console.error('[TestSession] Error clearing saved progress:', error);
      });
    }

    // MASTERY MODE: Если есть неправильные вопросы - повторяем!
    if (mode === "mastery" && masteryWrongQuestions.length > 0) {
      const wrongQuestionsData = questions.filter(q => masteryWrongQuestions.includes(q.id));

      if (wrongQuestionsData.length > 0) {
        toast.info(
          `Раунд ${masteryRound} завершён! Повторяем ${wrongQuestionsData.length} неправильных вопросов 🔄`,
          { duration: 3000 }
        );

        // Перезапускаем с неправильными вопросами
        setQuestions(wrongQuestionsData);
        setMasteryWrongQuestions([]); // Очищаем для следующего раунда
        setMasteryRound(masteryRound + 1);
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setShowTranslation(false);
        setShowAIExplanation(false);
        return; // НЕ завершаем тест!
      }
    }

    // Если Mastery Mode и все правильно - показываем поздравление!
    if (mode === "mastery") {
      toast.success(`🎉 ИДЕАЛЬНО! Все вопросы правильно за ${masteryRound} раундов!`, { duration: 5000 });
    }

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    const timeSpent = startTime > 0
      ? Math.floor((Date.now() - startTime) / 1000)
      : initialTimeBudget > 0
        ? initialTimeBudget - timeLeft
        : 0;

    let rewardResult: TestRewardResult | null = null;

    try {
      // Если это sequential тест, обновляем прогресс через функцию
      if (testId && profileId) {
        const { error: progressError } = await (supabase as any).rpc('update_test_progress', {
          p_user_id: profileId,
          p_test_id: testId,
          p_correct_answers: correctCount,
          p_total_questions: questions.length,
          p_time_spent_seconds: timeSpent,
        });

        if (progressError) {
          console.error("Error updating test progress:", progressError);
        }
      }

      // Для module-теста сохраняем прогресс по теме с мягким порогом (>= 70%)
      if (mode === "module" && profileId && topic) {
        try {
          await (supabase as any)
            .from("user_topic_progress")
            .upsert(
              {
                user_id: profileId,
                topic_id: topic,
                subtopic_id: null,
                completed: score >= 70,
                score,
              },
              { onConflict: "user_id,topic_id,subtopic_id" }
            );
        } catch (progressError) {
          console.error("Error updating module topic progress:", progressError);
        }
      }

      // Сохраняем в game_sessions для совместимости
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const duration = timeSpent;
          const sessionData = {
            user_id: profile.id,
            game_type: testId
              ? "test_sequential"
              : mode === "exam"
                ? "test_exam"
                : mode === "blitz"
                  ? "test_blitz"
                  : mode === "module"
                    ? "test_module"
                    : "test_practice",
            score: Math.min(Math.max(0, score), 100), // Ensure 0-100 range
            total_questions: Math.min(Math.max(1, questions.length), 100), // Ensure 1-100 range
            duration_seconds: Math.min(Math.max(0, duration), 7200), // Ensure 0-7200 range
          };

          await (supabase as any).from("game_sessions").insert(sessionData);
        }
      }
    } catch (error) {
      console.error("Error saving results:", error);
    }

    if (profileId) {
      try {
        const sessionId = getOrCreateSessionId();

        // OFFLINE-FIRST: Если offline - добавляем в очередь вместо прямой отправки
        // FIX: Используем checkOnlineStatus() вместо navigator.onLine
        const realOnline = await checkOnlineStatus();
        if (!realOnline) {

          await enqueueOfflineAction('test-result', {
            user_id: profileId,
            session_id: sessionId,
            test_id: testId || null,
            score,
            questions_count: questions.length,
            correct_count: correctCount,
            test_duration_seconds: Math.max(timeSpent, 0),
            premium_flag: Boolean(isPremium),
            double_sp_active: false,
          });

          // Базовые награды для UI (будут пересчитаны при sync)
          const baseCoins = Math.max(2, Math.floor(score / 10));
          const baseSP = Math.max(1, Math.floor(score / 20));

          rewardResult = {
            coins_awarded: baseCoins,
            sp_awarded: baseSP,
            message: "Результат сохранён локально. Награды будут начислены при восстановлении сети.",
          } as TestRewardResult;

          trackOfflineAction('test-submit', true);

          toast.info("Результат сохранён. Награды будут начислены при восстановлении соединения.", {
            duration: 4000,
          });
        } else {
          // ONLINE: Обычная отправка
          const { data: rewardData, error: rewardError } = await supabase.functions.invoke("complete-test-and-award", {
            body: {
              user_id: profileId,
              session_id: sessionId,
              test_id: testId || null,
              score,
              questions_count: questions.length,
              correct_count: correctCount,
              test_duration_seconds: Math.max(timeSpent, 0),
              premium_flag: Boolean(isPremium),
              double_sp_active: false,
            },
          });

          if (rewardError) throw rewardError;
          rewardResult = rewardData as TestRewardResult;

          trackOfflineAction('test-submit', true);
        }
      } catch (awardError: any) {
        console.error("[TestSession] Error awarding test:", awardError);

        trackOfflineAction('test-submit', false, awardError.message);

        // Fallback: показываем базовые награды локально (без начисления в БД)
        // Пользователь сможет повторить тест или награды начислятся при следующем запуске
        const baseCoins = Math.max(2, Math.floor(score / 10));
        const baseSP = Math.max(1, Math.floor(score / 20));

        rewardResult = {
          success: false,
          coins_awarded: baseCoins,
          sp_awarded: baseSP,
          message: "Награды будут начислены позже",
        } as TestRewardResult;

        // Показываем предупреждение (не ошибку), чтобы не пугать пользователя
        toast.warning("Результаты сохранены. Награды будут начислены при восстановлении соединения.", {
          duration: 5000,
        });
      }
    }

    navigate("/test/results", {
      state: {
        questions,
        answers,
        mode: testId ? "sequential" : mode,
        timeSpent,
        testId,
        testInfo,
        rewardResult,
        sessionId: testSessionIdRef.current,
      },
    });
  };

  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds)) return "20:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")} `;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
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

  if (!questions.length || !questions[currentIndex]) {
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

  // Для экзамена РФ используем вопрос из russiaExam
  const currentQuestion = mode === 'exam-russia' && russiaExam.currentQuestion
    ? {
      id: russiaExam.currentQuestion.id,
      question_ru: russiaExam.currentQuestion.text || (russiaExam.currentQuestion as any).question_ru || (russiaExam.currentQuestion as any).question_text || '',
      question_es: russiaExam.currentQuestion.text || (russiaExam.currentQuestion as any).question_ru || '',
      question_en: russiaExam.currentQuestion.text || (russiaExam.currentQuestion as any).question_ru || '',
      image_url: russiaExam.currentQuestion.image || (russiaExam.currentQuestion as any).image_url,
      explanation_ru: russiaExam.currentQuestion.explanation || (russiaExam.currentQuestion as any).explanation || null,
      explanation_es: russiaExam.currentQuestion.explanation || (russiaExam.currentQuestion as any).explanation || null,
      explanation_en: russiaExam.currentQuestion.explanation || (russiaExam.currentQuestion as any).explanation || null,
      topics: russiaExam.currentQuestion.topics && russiaExam.currentQuestion.topics.length > 0
        ? { title_ru: russiaExam.currentQuestion.topics[0], title_es: russiaExam.currentQuestion.topics[0] }
        : null,
      answer_options: (russiaExam.currentQuestion.answers || (russiaExam.currentQuestion as any).answer_options || []).map((a: any) => ({
        id: a.id,
        text_ru: a.text || a.text_ru || '',
        text_es: a.text || a.text_es || '',
        text_en: a.text || a.text_en || '',
        is_correct: a.isCorrect !== undefined ? a.isCorrect : (a.is_correct !== undefined ? a.is_correct : false),
        position: a.position || 0,
      })),
    }
    : questions[currentIndex];

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

  // Для экзамена РФ используем прогресс из russiaExam
  const progress = mode === 'exam-russia' && russiaExam.progress
    ? (russiaExam.progress.current / russiaExam.progress.total) * 100
    : questions.length > 0 ? (answers.length / questions.length) * 100 : 0;
  const errorCount = mode === 'exam-russia' && russiaExam.stats
    ? russiaExam.stats.totalErrors
    : answers.filter((a) => !a.isCorrect).length;

  const getQuestionText = (lang: 'ru' | 'es' | 'en'): string => {
    if (lang === 'ru') return currentQuestion.question_ru;
    if (lang === 'en') return currentQuestion.question_en;
    return currentQuestion.question_es;
  };

  // Приоритет: ПДД РФ > перевод (кнопка) > testLanguage (настройки)
  const effectiveLanguage = shouldUsePDD ? 'ru' : testLanguage;
  const displayQuestion = showTranslation
    ? currentQuestion.question_ru
    : getQuestionText(effectiveLanguage);
  const displayTopic = currentQuestion.topics?.title_es || 'Sin tema';

  // Swiss Design - refined typography, not gigantic
  const fontSizeClasses = [
    'text-sm leading-relaxed', // small
    'text-[15px] leading-relaxed', // default
    'text-base leading-relaxed sm:text-lg',  // large
  ];

  const toggleTranslation = async () => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setShowTranslation(!showTranslation);
    setTimeout(() => setIsTransitioning(false), 150);
  };

  // Sort answer options by position - защита от null/undefined
  const sortedOptions = (currentQuestion.answer_options && Array.isArray(currentQuestion.answer_options))
    ? [...currentQuestion.answer_options].sort((a, b) => (a?.position || 0) - (b?.position || 0))
    : [];

  const handleClose = () => {
    setShowExitConfirm(true);
  };

  return (
    <Layout hideNavigation={true}>
      <TestContentLayout
        mode={mode}
        isTelegramApp={isTelegramApp}
        isPracticeLikeMode={isPracticeLikeMode}
        sidebar={
          !isTelegramApp && isPracticeLikeMode && mode !== 'blitz' && mode !== 'exam' && mode !== 'exam-russia' && (
            <div className="lg:mt-[72px]"> {/* Компенсация высоты прогресс-бара */}
              <AIWidget
                explanation={selectedOption ? (showTranslation ? currentQuestion.explanation_ru :
                  (effectiveLanguage === 'ru' ? currentQuestion.explanation_ru :
                    (effectiveLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es))) : null}
                explanationRu={selectedOption ? currentQuestion.explanation_ru : null}
                explanationEs={selectedOption ? currentQuestion.explanation_es : null}
                explanationEn={selectedOption ? currentQuestion.explanation_en : null}
                question={showTranslation ? currentQuestion.question_ru :
                  (effectiveLanguage === 'ru' ? currentQuestion.question_ru :
                    (effectiveLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es))}
                correctAnswer={sortedOptions.find((opt) => opt.is_correct)?.[showTranslation ? 'text_ru' :
                  (effectiveLanguage === 'ru' ? 'text_ru' :
                    (effectiveLanguage === 'en' ? 'text_en' : 'text_es'))] || ''}
                userAnswer={selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[showTranslation ? 'text_ru' :
                  (effectiveLanguage === 'ru' ? 'text_ru' :
                    (effectiveLanguage === 'en' ? 'text_en' : 'text_es'))] : undefined}
                isCorrect={sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false}
                topic={currentQuestion.topics?.title_es}
                imageUrl={currentQuestion.image_url}
                showTranslation={showTranslation}
                onToggleTranslation={toggleTranslation}
                testLanguage={effectiveLanguage}
              />
            </div>
          )
        }
      >
        <OfflineStatusIndicator isOnline={isOnline} pendingSync={pendingSync} />

        {/* Progress Bar - SegmentedExamProgress для exam-russia, QuestionProgressBar для остальных */}
        <div className={cn(
          "sticky top-0 z-40 bg-background/95 backdrop-blur-xl transition-all duration-300",
          mode === 'exam-russia' ? "-mx-4 px-4 py-4 border-b border-border/50" : "py-1 sm:py-2"
        )}>
          {mode === 'exam-russia' && russiaExam.state && russiaExam.progress ? (
            <ExamHeader
              timeLeft={mode === 'exam-russia' ? russiaExam.timeRemaining : timeLeft}
              totalQuestions={20}
              currentQuestionIndex={russiaExam.isExtraMode ? 20 + russiaExam.progress.current - 1 : russiaExam.progress.current - 1}
              answers={russiaExamAnswers}
              extraQuestionsCount={russiaExam.state.extraQuestions.length}
              questionsPerBlock={5}
              errorsCount={russiaExam.stats?.totalErrors || 0}
              maxErrors={2}
              mode="exam-russia"
              onClose={handleClose}
            />
          ) : mode === 'blitz' ? (
            <BlitzHeader
              timeLeft={timeLeft}
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              onClose={handleClose}
              maxTime={90}
              streak={streak}
            />
          ) : (
            <QuestionProgressBar
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              answers={answers}
              streak={streak}
              hideScoreIndicators={mode === "exam" || mode === "exam-russia"}
              onClose={handleClose}
              showClose={true}
              layout="focus"
              onShowQuestionMap={() => setShowQuestionMap(true)}
              showQuestionMap={mode !== 'exam-russia'}
              onToggleBookmark={profileId ? toggleBookmark : undefined}
              isBookmarked={isQuestionBookmarked}
              bookmarkLoading={bookmarkLoading}
              customLeftContent={
                <>
                  {/* Timer */}
                  {(mode === "exam" || mode === "exam-russia" || mode === "marathon") && (
                    <div className={cn(
                      "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border shadow-sm shrink-0 transition-colors duration-300",
                      timeLeft < 300
                        ? "bg-red-500/10 border-red-500/30 animate-pulse"
                        : "bg-background/80 backdrop-blur-md border-border/50"
                    )}>
                      <Clock className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                        timeLeft < 300 ? "text-red-500" : "text-foreground/70"
                      )} />
                      <span className={cn(
                        "font-mono font-semibold text-xs sm:text-sm transition-colors",
                        timeLeft < 300 ? "text-red-600 dark:text-red-400" : "text-foreground"
                      )}>
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  )}

                  {/* Mastery Round Indicator */}
                  {mode === "mastery" && masteryRound > 1 && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/30 shadow-sm shrink-0">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                        Раунд {masteryRound}
                      </span>
                    </div>
                  )}
                </>
              }
              SettingsMenuComponent={
                <TestSettingsMenu
                  open={showTestSettings}
                  onOpenChange={setShowTestSettings}
                  voiceOver={voiceOver}
                  onVoiceOverChange={setVoiceOver}
                  answerPopularity={answerPopularity}
                  onAnswerPopularityChange={setAnswerPopularity}
                  ambientMusic={ambientMusic}
                  onAmbientMusicChange={setAmbientMusic}
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                  language={testLanguage}
                  onLanguageChange={setTestLanguage}
                  hideLanguageSelector={mode === 'pdd-ticket' || mode === 'exam-russia'}
                />
              }
            />
          )}
        </div>


        {/* Question Card - используем UniversalQuestionCard для exam-russia */}
        {mode === 'exam-russia' && russiaExam.currentQuestion ? (
          <motion.div
            key={russiaExam.currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "max-w-4xl mx-auto w-full mt-6",
              isAnswerLocked && "opacity-50 pointer-events-none"
            )}
          >
            <UniversalQuestionCard
              mode="exam-russia"
              question={russiaExam.currentQuestion.text || (russiaExam.currentQuestion as any).question_ru || (russiaExam.currentQuestion as any).question_text || ''}
              image={russiaExam.currentQuestion.image || (russiaExam.currentQuestion as any).image_url}
              imageAspectRatio={russiaExam.currentQuestion.image ? getCachedImageAspectRatio(russiaExam.currentQuestion.image) : null}
              explanation={russiaExam.currentQuestion.explanation || null}
              answers={(russiaExam.currentQuestion.answers || (russiaExam.currentQuestion as any).answer_options || []).map((a: any) => ({
                id: a.id,
                text: a.text || a.text_ru || '',
                isCorrect: a.isCorrect !== undefined ? a.isCorrect : (a.is_correct !== undefined ? a.is_correct : false),
              }))}
              selectedAnswerId={selectedOption}
              showResult={false} // на экзамене не показываем результат сразу
              disabled={isAnswerLocked || selectedOption !== null}
              onAnswerClick={(answerId) => {
                if (mode === "exam-russia" && !isAnswerLocked) {
                  setSelectedOption(answerId);
                }
              }}
              onShowExplanation={selectedOption ? () => setShowAIExplanation(true) : undefined}
              fontSize={fontSize}
              header={
                russiaExam.isExtraMode && (
                  <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      ДОПОЛНИТЕЛЬНЫЙ БЛОК: ОШИБКИ НЕДОПУСТИМЫ
                    </p>
                  </div>
                )
              }
              footer={
                <button
                  onClick={() => handleAnswer()}
                  disabled={!selectedOption || isAnswerLocked}
                  className={cn(
                    "w-full h-14 rounded-2xl font-semibold text-base tracking-wide transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    selectedOption && !isAnswerLocked
                      ? cn(
                        // Modern Gradient + Glow
                        "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600",
                        "text-white",
                        "shadow-[0_4px_20px_rgba(59,130,246,0.4)]",
                        "hover:shadow-[0_8px_25px_rgba(59,130,246,0.5)]",
                        "hover:-translate-y-0.5",
                        "active:scale-[0.98]"
                      )
                      : cn(
                        // Disabled state
                        "bg-slate-800/50 text-slate-500",
                        "cursor-not-allowed"
                      )
                  )}
                >
                  ПОДТВЕРДИТЬ
                  {selectedOption && <ArrowRight className="w-5 h-5" />}
                </button>
              }
            />
          </motion.div>
        ) : mode === 'blitz' ? (
          /* Blitz Mode: Glass Container Game Card */
          <BlitzGameCard isShaking={blitzShaking} className="mt-2">
            {/* Layout System */}
            {currentQuestion.image_url ? (
              // Blitz Vertical Layout (Image on top)
              <div className="space-y-4">
                <div className="w-full">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="w-full rounded-2xl object-cover max-h-[280px]"
                  />
                </div>
                <div className="flex flex-col">
                  {/* Question Text */}
                  <div className="mb-4">
                    <h2 className={cn(
                      fontSizeClasses[fontSize],
                      "font-medium text-white whitespace-pre-line"
                    )}>
                      {displayQuestion}
                    </h2>
                  </div>

                  {/* Answer Options - Tech Style */}
                  <div className="space-y-2">
                    {sortedOptions.map((option, index) => {
                      const isSelected = selectedOption === option.id;
                      const showResult = selectedOption !== null;
                      const isCorrect = option.is_correct;

                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            if (!selectedOption) {
                              setSelectedOption(option.id);
                              handleAnswer(option.id);
                            }
                          }}
                          disabled={!!selectedOption}
                          className={cn(
                            "w-full p-4 rounded-xl text-left transition-all duration-200",
                            "bg-slate-800/80 backdrop-blur border",
                            !selectedOption && "hover:bg-slate-700/80 hover:border-cyan-500/50 cursor-pointer",
                            !selectedOption && "border-white/10",
                            isSelected && isCorrect && "border-emerald-500 bg-emerald-500/20",
                            isSelected && !isCorrect && "border-red-500 bg-red-500/20",
                            showResult && !isSelected && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                            showResult && !isSelected && !isCorrect && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                              "bg-white/10",
                              isSelected && isCorrect && "bg-emerald-500 text-white",
                              isSelected && !isCorrect && "bg-red-500 text-white"
                            )}>
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className={cn(
                              "text-base font-medium flex-1",
                              isSelected ? "text-white" : "text-white/80"
                            )}>
                              {option.text_ru || option.text_es || option.text_en}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button (after answer) */}
                  {selectedOption && (
                    <button
                      onClick={nextQuestion}
                      className="mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                    >
                      Следующий вопрос →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // No image layout for Blitz
              <div className="space-y-4">
                <h2 className={cn(
                  fontSizeClasses[fontSize],
                  "font-medium text-white text-center whitespace-pre-line"
                )}>
                  {displayQuestion}
                </h2>
                <div className="space-y-2">
                  {sortedOptions.map((option, index) => {
                    const isSelected = selectedOption === option.id;
                    const showResult = selectedOption !== null;
                    const isCorrect = option.is_correct;

                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (!selectedOption) {
                            setSelectedOption(option.id);
                            handleAnswer(option.id);
                          }
                        }}
                        disabled={!!selectedOption}
                        className={cn(
                          "w-full p-4 rounded-xl text-left transition-all duration-200",
                          "bg-slate-800/80 backdrop-blur border",
                          !selectedOption && "hover:bg-slate-700/80 hover:border-cyan-500/50 cursor-pointer",
                          !selectedOption && "border-white/10",
                          isSelected && isCorrect && "border-emerald-500 bg-emerald-500/20",
                          isSelected && !isCorrect && "border-red-500 bg-red-500/20",
                          showResult && !isSelected && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                          showResult && !isSelected && !isCorrect && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                            "bg-white/10",
                            isSelected && isCorrect && "bg-emerald-500 text-white",
                            isSelected && !isCorrect && "bg-red-500 text-white"
                          )}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className={cn(
                            "text-base font-medium flex-1",
                            isSelected ? "text-white" : "text-white/80"
                          )}>
                            {option.text_ru || option.text_es || option.text_en}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedOption && (
                  <button
                    onClick={nextQuestion}
                    className="mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                  >
                    Следующий вопрос →
                  </button>
                )}
              </div>
            )}
          </BlitzGameCard>
        ) : (
          <Card
            data-testid="question-card"
            className={cn(
              "p-3 sm:p-4 md:p-6 bg-background border-border/50 shadow-xl backdrop-blur-sm transition-all duration-300 relative overflow-hidden",
              feedbackStatus === 'correct' && "border-emerald-500/50 shadow-emerald-500/10",
              feedbackStatus === 'incorrect' && "border-red-500/50 shadow-red-500/10"
            )}
          >
            {/* Layout System */}
            {currentQuestion.image_url ? (
              isRussia ? (
                // Russia Vertical Layout (Image on top)
                <div className="space-y-6">
                  <div className="w-full">
                    <QuestionImage imageUrl={currentQuestion.image_url} className="w-full h-48 object-contain bg-black/20 rounded-xl mb-4" />
                  </div>
                  <div className="flex flex-col mt-6">
                    {/* Question Card - Swiss Design */}
                    <div className="mb-6">
                      <div className="relative">
                        <h2 className={cn(
                          fontSizeClasses[fontSize],
                          "font-medium text-white whitespace-pre-line transition-opacity duration-300",
                          isTransitioning ? 'opacity-0' : 'opacity-100'
                        )}>
                          {displayQuestion}
                        </h2>
                      </div>
                    </div>

                    {/* Answer Options - Premium Component */}
                    <AnswerOptionsList
                      options={sortedOptions}
                      selectedOption={selectedOption}
                      showResult={selectedOption !== null && isPracticeLikeMode}
                      showTranslation={showTranslation}
                      testLanguage={testLanguage}
                      fontSize={fontSize}
                      isTransitioning={isTransitioning}
                      answerPopularity={answerPopularity}
                      onSelect={(val) => {
                        setSelectedOption(val);
                        // Auto-submit logic for non-practice modes or specific settings
                        if (!isPracticeLikeMode && val) {
                          setTimeout(() => handleAnswer(val), 200);
                        }
                      }}
                      onAnswer={handleAnswer}
                    />

                    {/* Navigation */}
                    <div className="flex gap-3 items-center mt-6">
                      {isPracticeLikeMode && (
                        <button
                          onClick={() => setShowAIExplanation(true)}
                          className="group w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 shadow-lg flex items-center justify-center transition-all active:scale-95 shrink-0"
                        >
                          <LumiCharacter size="sm" mood="happy" animate={true} />
                        </button>
                      )}
                      {isPracticeLikeMode && selectedOption ? (
                        <Button onClick={nextQuestion} className="flex-1 font-bold h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg shadow-xl">
                          <span>{isRussia ? 'Следующий' : 'Siguiente'}</span>
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      ) : (
                        !(isRussia && isPracticeLikeMode && mode !== "exam-russia") && (
                          <Button onClick={() => handleAnswer()} disabled={!selectedOption} className="!flex-1 !font-semibold h-12 sm:h-14 !rounded-2xl !bg-blue-600 hover:!bg-blue-500 disabled:!bg-slate-300 dark:disabled:!bg-slate-700 !text-white disabled:!text-slate-500 !text-lg !shadow-lg">
                            {isRussia ? "Ответить" : "Responder"}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // DGT Split Layout (Image on left)
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[400px_1fr] gap-6 md:gap-8">
                  <div className="w-full md:sticky md:top-4 md:self-start">
                    <QuestionImage imageUrl={currentQuestion.image_url} className="w-full h-48 object-contain bg-black/20 rounded-xl mb-4" />
                  </div>
                  <div className="flex flex-col">
                    {/* Question Text with Smart Features */}
                    <div className="mb-6">
                      <QuestionText
                        text={displayQuestion}
                        fontSize={fontSize}
                        showTranslation={showTranslation}
                        onToggleTranslation={toggleTranslation}
                        isTransitioning={isTransitioning}
                      />
                    </div>

                    <AnswerOptionsList
                      options={sortedOptions}
                      selectedOption={selectedOption}
                      showResult={selectedOption !== null && isPracticeLikeMode}
                      showTranslation={showTranslation}
                      testLanguage={testLanguage}
                      fontSize={fontSize}
                      isTransitioning={isTransitioning}
                      answerPopularity={answerPopularity}
                      onSelect={setSelectedOption}
                      onAnswer={handleAnswer}
                    />

                    {/* Sticky Mobile Navigation */}
                    <div className="sticky bottom-0 left-0 right-0 z-50 pt-4 pb-2 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent sm:relative sm:bg-transparent sm:pt-0 sm:z-10 mt-6">
                      <div className="flex gap-3 items-center">
                        {isPracticeLikeMode && (
                          <button onClick={() => setShowAIExplanation(true)} className="group w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg flex items-center justify-center active:scale-95 lg:hidden">
                            <LumiCharacter size="sm" mood="happy" />
                          </button>
                        )}
                        {isPracticeLikeMode && selectedOption ? (
                          <Button onClick={nextQuestion} className="flex-1 font-bold h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg">
                            <span>{isRussia ? 'Следующий' : 'Siguiente'}</span>
                            <ChevronRight className="w-5 h-5 ml-2" />
                          </Button>
                        ) : (
                          !(isRussia && isPracticeLikeMode && mode !== "exam-russia") && (
                            <Button onClick={() => handleAnswer()} disabled={!selectedOption} className="!flex-1 !font-semibold h-12 !rounded-xl !bg-blue-600 hover:!bg-blue-500 !text-white !shadow-lg">
                              {isRussia ? "Ответить" : "Responder"}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              // No image layout
              <div className="max-w-4xl mx-auto w-full space-y-6">
                <div className="relative p-6 sm:p-8 rounded-3xl bg-muted/20 border-2 border-border/30 shadow-inner">
                  <h2 className={cn(
                    fontSizeClasses[fontSize],
                    "font-semibold leading-relaxed text-foreground whitespace-pre-line text-center transition-opacity duration-300",
                    isTransitioning ? 'opacity-0' : 'opacity-100'
                  )}>
                    {displayQuestion}
                  </h2>
                  {isPracticeLikeMode && mode !== 'pdd-ticket' && (
                    <div className="flex justify-center mt-6">
                      <button onClick={toggleTranslation} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:shadow-md transition-all">
                        <Languages className="w-4 h-4" />
                        <span>{showTranslation ? "Original ES" : "Перевод RU"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <AnswerOptionsList
                  options={sortedOptions}
                  selectedOption={selectedOption}
                  showResult={selectedOption !== null && isPracticeLikeMode}
                  showTranslation={showTranslation}
                  testLanguage={testLanguage}
                  fontSize={fontSize}
                  isTransitioning={isTransitioning}
                  answerPopularity={answerPopularity}
                  onSelect={setSelectedOption}
                  onAnswer={handleAnswer}
                />

                <div className="flex gap-4 items-center pt-6">
                  {isPracticeLikeMode && (
                    <button onClick={() => setShowAIExplanation(true)} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-xl flex items-center justify-center active:scale-95 lg:hidden">
                      <LumiCharacter size="sm" mood="happy" />
                    </button>
                  )}
                  {isPracticeLikeMode && selectedOption ? (
                    <Button onClick={nextQuestion} className="flex-1 font-bold h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xl shadow-2xl">
                      <span>{isRussia ? 'Следующий вопрос' : 'Siguiente pregunta'}</span>
                      <ChevronRight className="w-6 h-6 ml-3" />
                    </Button>
                  ) : (
                    !(isRussia && isPracticeLikeMode && mode !== "exam-russia") && (
                      <Button onClick={() => handleAnswer()} disabled={!selectedOption} className="!flex-1 !font-bold h-16 !rounded-2xl !bg-blue-600 hover:!bg-blue-500 disabled:!bg-slate-300 dark:disabled:!bg-slate-700 !text-white disabled:!text-slate-500 !text-xl !shadow-xl">
                        {isRussia ? "Ответить" : "Responder"}
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </Card>
        )}


        {/* Question Map Bottom Sheet */}
        <TestQuestionMap
          open={showQuestionMap}
          onClose={() => setShowQuestionMap(false)}
          questions={questions}
          currentIndex={currentIndex}
          answers={answers}
          jumpToQuestion={jumpToQuestion}
          mode={mode}
        />

        {/* Report Problem Modal */}
        <ReportProblemModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          questionId={currentQuestion.id}
          questionText={showTranslation ? currentQuestion.question_ru : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es)}
        />


        {/* AI Explanation Dialog - работает в practice режиме и exam-russia */}
        {
          (isPracticeLikeMode || mode === 'exam-russia') && (
            <AIExplanationDialog
              open={showAIExplanation}
              onClose={() => setShowAIExplanation(false)}
              question={mode === 'exam-russia' && russiaExam.currentQuestion
                ? russiaExam.currentQuestion.text
                : (showTranslation ? currentQuestion.question_ru : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es))}
              correctAnswer={mode === 'exam-russia' && russiaExam.currentQuestion
                ? (russiaExam.currentQuestion.answers || []).find(a => a.isCorrect)?.text || ''
                : (sortedOptions.find((opt) => opt.is_correct)?.[showTranslation ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] || '')}
              userAnswer={mode === 'exam-russia' && russiaExam.currentQuestion && selectedOption
                ? (russiaExam.currentQuestion.answers || []).find(a => a.id === selectedOption)?.text
                : (selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[showTranslation ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] : undefined)}
              isCorrect={mode === 'exam-russia' && russiaExam.currentQuestion && selectedOption
                ? ((russiaExam.currentQuestion.answers || []).find(a => a.id === selectedOption)?.isCorrect || false)
                : (selectedOption ? (sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false) : false)}
              explanation={mode === 'exam-russia' && russiaExam.currentQuestion
                ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
                : (selectedOption ? (showTranslation ? currentQuestion.explanation_ru : (testLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es)) : null)}
              explanationRu={mode === 'exam-russia' && russiaExam.currentQuestion
                ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
                : (selectedOption ? currentQuestion.explanation_ru : null)}
              explanationEs={mode === 'exam-russia' && russiaExam.currentQuestion
                ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
                : (selectedOption ? currentQuestion.explanation_es : null)}
              explanationEn={mode === 'exam-russia' && russiaExam.currentQuestion
                ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
                : (selectedOption ? currentQuestion.explanation_en : null)}
              topic={mode === 'exam-russia' && russiaExam.currentQuestion
                ? (russiaExam.currentQuestion.topics && russiaExam.currentQuestion.topics.length > 0 ? russiaExam.currentQuestion.topics[0] : undefined)
                : currentQuestion.topics?.title_es}
              imageUrl={mode === 'exam-russia' && russiaExam.currentQuestion
                ? russiaExam.currentQuestion.image
                : currentQuestion.image_url}
              showTranslation={showTranslation}
              onToggleTranslation={toggleTranslation}
              testLanguage={testLanguage}
            />
          )
        }

        {/* AI Widget Lumi - только в режиме практики в браузере (не в Telegram), НЕ в экзамене */}
        {/* Только на больших экранах (lg+) - справа, на маленьких используется кнопка в навигации */}
      </TestContentLayout >

      {/* Challenge Bank Notification - fixed позиционирование относительно viewport */}
      < ChallengeBankNotification
        isVisible={showChallengeBankNotification}
        onClose={() => setShowChallengeBankNotification(false)}
      />

      {/* Account Watermark - защита от передачи аккаунтов */}
      <AccountWatermark variant="default" />

      {/* Penalty Alert Modal для exam-russia */}
      {
        mode === 'exam-russia' && (
          <>
            <PenaltyAlert
              open={showPenaltyAlert}
              blockNumber={penaltyBlock || 0}
              questionsAdded={russiaExam.state?.extraQuestions.length || 0}
              minutesAdded={5}
              onContinue={() => {
                setShowPenaltyAlert(false);
                setPenaltyBlock(null);
                setIsAnswerLocked(false);

                // Переходим к следующему вопросу
                if (russiaExam.isExtraMode) {
                  setCurrentIndex(russiaExam.progress.current - 1);
                } else {
                  setCurrentIndex(russiaExam.progress.current - 1);
                }

                setSelectedOption(null);
                setIsTransitioning(true);
                setTimeout(() => setIsTransitioning(false), 300);
              }}
            />

            <ExamFailureModal
              open={showFailureModal}
              reason={failureReason}
              onViewResults={() => {
                // Nuclear option: Force navigation to main tests page
                console.log('ExamFailureModal: Navigating to /tests');
                window.location.href = '/tests';
              }}
            />
          </>
        )
      }
      {/* Exit Confirmation Dialog */}
      <TestExitDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        language={userLanguage === 'es' ? 'es' : 'ru'}
      />
    </Layout >

  );
};

export default TestSession;
