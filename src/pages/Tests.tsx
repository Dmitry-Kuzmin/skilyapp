import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shuffle, Clock, Flame, History, AlertTriangle, AlertCircle,
  Target, TrendingUp, Crown, BookOpen, Gamepad2, Play, ArrowRight, Sparkles, CheckCircle,
  Star, AlertTriangle as AlertIcon, RotateCcw,
  CarFront, MapPin, Gauge, Check, Trophy, Bookmark, Lock, Archive, Brain, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopics } from "@/hooks/useTopics";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useChallengeStats } from "@/hooks/useChallengeStats";
import { usePDDContext } from "@/contexts/PDDContext";
import { usePDDTickets } from "@/hooks/usePDDTickets";
import { usePDDTopics } from "@/hooks/usePDDTopics";
import { useTicketsStatus } from "@/hooks/useTicketsStatus";
import { useSmartRecommendation } from "@/hooks/useSmartRecommendation";
import { motion } from "@/components/optimized/Motion";
import { getImageUrl } from "@/utils/imageUtils";
import { loadTestProgress } from "@/utils/testStorage";
import { cn } from "@/lib/utils";
import { useModalStore } from "@/store/modalStore";
import { FREE_QUESTION_LIMIT } from "@/lib/premiumState";
import { AIInsightsLibrary } from "@/components/test-results/AIInsightsLibrary";
import { useDashboardData } from "@/hooks/useDashboardData";
import { PageLoader } from "@/components/PageLoader";
import { SeoHead } from "@/components/seo/SeoHead";
import { ContextSwitcher } from "@/components/shared/ContextSwitcher";
import { CompactStreakJewel } from "@/components/shared/CompactStreakJewel";
import { useExamReadiness } from "@/hooks/useExamReadiness";

// --- Types ---
type Topic = {
  id: string;
  number: number;
  name: string;
  questions: number;
  cover_image?: string;
  gradient_from?: string;
  gradient_to?: string;
  is_premium?: boolean;
};

// --- Cyber-Core Grid Components ---
const TicketCore = ({
  number,
  progress = 0,
  status = 'idle', // 'idle' | 'charging' | 'charged' | 'damaged'
  hasErrors = false,
  errorCount = 0,
  isRussia = false,
  onClick
}: {
  number: number;
  progress?: number;
  status?: 'idle' | 'charging' | 'charged' | 'damaged';
  hasErrors?: boolean;
  errorCount?: number;
  isRussia?: boolean;
  onClick: () => void;
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      layout
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden cursor-pointer group transition-all duration-500",
        "border-[1.5px] shadow-sm",
        // Idle
        status === 'idle' && "bg-slate-50/50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/5",
        // Charging
        status === 'charging' && "bg-orange-500/[0.08] dark:bg-orange-500/[0.1] border-orange-500/30 shadow-orange-500/5",
        // Charged
        status === 'charged' && "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.1] border-emerald-500/30 shadow-emerald-500/5",
        // Damaged
        status === 'damaged' && "bg-red-500/[0.08] dark:bg-red-500/[0.1] border-red-500/30 shadow-red-500/5"
      )}
    >
      {/* Cyber Background pattern (Dots) */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        {/* Top Label */}
        <span className={cn(
          "text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase transition-colors duration-500 mb-2",
          status === 'idle' ? "text-slate-400 dark:text-white/20" : "text-slate-500/60 dark:text-white/40"
        )}>
          Билет
        </span>

        <div className="relative flex items-center justify-center">
          {/* Progress Ring */}
          {status !== 'idle' && progress > 0 && (
            <svg className="absolute w-20 h-20 sm:w-24 sm:h-24 -rotate-90 pointer-events-none">
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-200/20 dark:text-white/5"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                className={cn(
                  status === 'charged' ? "text-emerald-500" :
                    status === 'damaged' ? "text-red-500" :
                      "text-orange-500",
                  "drop-shadow-[0_0_8px_currentColor]"
                )}
              />
            </svg>
          )}

          <span className={cn(
            "text-3xl sm:text-5xl font-black transition-all duration-500 font-display",
            status === 'idle'
              ? "text-slate-300 dark:text-white/10 group-hover:text-slate-900 dark:group-hover:text-white/60"
              : "text-slate-900 dark:text-white drop-shadow-sm",
            status === 'charged' && "text-emerald-500 dark:text-emerald-400",
            status === 'damaged' && "text-red-500 dark:text-red-400"
          )}>
            {number}
          </span>
        </div>

        {/* Status Indicators at Bottom */}
        <div className="mt-4 sm:mt-6 flex flex-col items-center justify-center gap-1">
          {status === 'charged' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1"
            >
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500 fill-emerald-500" />
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
                Сдано
              </span>
            </motion.div>
          )}

          {status === 'charging' && progress > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="text-[10px] font-black text-orange-500 tabular-nums">{progress}%</span>
            </div>
          )}

          {hasErrors && status !== 'charged' && (
            <div className={cn(
              "px-2 py-0.5 rounded-full border flex items-center gap-1",
              status === 'damaged' ? "bg-red-500/20 border-red-500/30" :
                status === 'charging' ? "bg-orange-500/10 border-orange-500/20 opacity-80" :
                  "bg-red-500/10 border-red-200 dark:border-red-500/20 opacity-60"
            )}>
              <AlertCircle className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500", status === 'idle' && "text-red-400")} />
              <span className={cn("text-[8px] sm:text-[10px] font-black uppercase tracking-tighter", status === 'damaged' ? "text-red-500" : "text-red-400")}>
                {errorCount > 0 ? `${errorCount} ${isRussia ? 'ошибок' : 'errors'}` : (isRussia ? 'Ошибка' : 'Error')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-1.5 h-1.5 border-t border-l border-slate-300 dark:border-white/10 opacity-30 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-4 right-4 w-1.5 h-1.5 border-b border-r border-slate-300 dark:border-white/10 opacity-30 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};

const Tests = () => {
  const navigate = useNavigate();
  const { profileId, isAuthenticated, isLoading: authLoading } = useUserContext();
  const { isPremium } = usePremium();
  const openModal = useModalStore((s) => s.openModal);
  const { language, t } = useLanguage();
  const { selectedCountry, selectedCategory } = usePDDContext();
  const { data: dashboardData } = useDashboardData();
  const licensePoints = dashboardData?.profile?.license_points ?? 8;
  const streakDays = dashboardData?.profile?.streak_days ?? 0;
  const { readiness } = useExamReadiness(profileId);
  const readinessPct = (readiness?.percent !== undefined && !isNaN(readiness.percent)) ? Math.min(100, readiness.percent) : null;

  // 1. Сначала все хуки данных (React Query)
  const { data: dbTopics = [], isLoading: topicsLoading } = useTopics();
  const { data: tickets = [], isLoading: ticketsLoading } = usePDDTickets(selectedCountry, selectedCategory);
  const { data: userProgress = [] } = useUserProgress(profileId, selectedCountry, selectedCategory);
  const ticketsStatus = useTicketsStatus(profileId, selectedCountry, selectedCategory);
  const { data: challengeStats = { errors: 0, favorites: 0 } } = useChallengeStats(profileId, selectedCountry, selectedCategory);
  const { data: pddTopics = [] } = usePDDTopics(selectedCountry);
  const seoByLanguage = {
    ru: {
      title: "Тесты DGT | Тренировка теории ПДД Испании в Skily",
      description: "Проходите тесты DGT, билеты и экзаменационные режимы в Skily: адаптивные тренировки, рекомендации по ошибкам и подготовка к теории в Испании.",
    },
    es: {
      title: "Tests DGT | Practica de teoria en Skily",
      description: "Entrena con tests DGT, simulacros y modos de examen en Skily para preparar la teoria de conducir en Espana con mas confianza.",
    },
    en: {
      title: "DGT Practice Tests | Spanish theory exam prep in Skily",
      description: "Train with DGT practice tests, ticket modes and exam simulations in Skily to prepare for the Spanish driving theory exam.",
    },
  };

  // 2. Умные рекомендации
  const recommendation = useSmartRecommendation(profileId);

  // 3. Состояние UI
  const [randomQuestionCount, setRandomQuestionCount] = useState(20);
  const [hasSelectedCount, setHasSelectedCount] = useState(false);
  const [nonstopProgress, setNonstopProgress] = useState<{ answered: number; total: number } | null>(null);
  const isGuest = !authLoading && (!isAuthenticated || !profileId);
  const guestRandomQuestionCount = 30;
  const localeText = useCallback((ru: string, es: string, en: string = es) => {
    if (language === "ru") return ru;
    if (language === "es") return es;
    return en;
  }, [language]);

  // 4. Эффекты логирования и загрузки (после всех определений)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Tests] Данные прогресса:', {
        selectedCountry,
        profileId,
        ticketsCount: tickets.length,
        statusCount: Object.keys(ticketsStatus).length,
        statusSample: Object.keys(ticketsStatus).slice(0, 5),
        ticket1Status: ticketsStatus["1"]
      });
    }
  }, [selectedCountry, profileId, tickets, ticketsStatus]);

  // Загружаем прогресс для нон-стоп
  useEffect(() => {
    if (selectedCountry === 'russia') {
      loadTestProgress('nonstop_russia').then(progress => {
        if (progress && progress.answers.length > 0) {
          setNonstopProgress({
            answered: progress.answers.length,
            total: 800
          });
        }
      }).catch(console.error);
    }
  }, [selectedCountry]);

  // ОПТИМИЗАЦИЯ: Вычисляем topics с локализацией через useMemo
  const topics = useMemo(() => {
    return dbTopics.map((topic) => {
      // Выбираем название темы в зависимости от языка
      let topicName = "";
      if (language === "es") {
        topicName = topic.title_es || topic.title_ru || `Tema ${topic.number}`;
      } else if (language === "en") {
        topicName = topic.title_en || topic.title_es || topic.title_ru || `Topic ${topic.number}`;
      } else {
        topicName = topic.title_ru || `Тема ${topic.number}`;
      }

      return {
        id: topic.id,
        number: topic.number,
        name: topicName,
        questions: 40, // Placeholder
        cover_image: topic.cover_image,
        gradient_from: topic.gradient_from,
        gradient_to: topic.gradient_to,
        is_premium: topic.is_premium || false,
      };
    });
  }, [dbTopics, language]);

  // ОПТИМИЗАЦИЯ: Вычисляем stats через useMemo
  const stats = useMemo(() => {
    const totalAnswered = userProgress.length;
    const correct = userProgress.filter((item) => item.is_correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;
    const errors = totalAnswered - correct;

    return {
      accuracy,
      completed: 0,
      correct,
      errors,
      totalAnswered,
      averageScore: 0,
    };
  }, [userProgress]);

  // Fallback значения для stats
  const safeStats = stats || { accuracy: 0, totalAnswered: 0, errors: 0 };

  const handleStartTest = (path: string) => {
    if (!isGuest || !path.startsWith('/test/')) {
      navigate(path);
      return;
    }

    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    if (!params.has('count')) {
      params.set('count', String(guestRandomQuestionCount));
    }
    params.set('category', params.get('category') || selectedCategory);
    params.set('guest', '1');
    navigate(`${pathname}?${params.toString()}`);
  };

  const handleTopicClick = (topicId: string) => {
    handleStartTest(`/test/practice?topic=${topicId}&count=30`);
  };

  const handleCountSelect = (count: number) => {
    setRandomQuestionCount(count);
    setHasSelectedCount(true);
  };

  const handleRandomTestStart = () => {
    const count = isGuest ? guestRandomQuestionCount : randomQuestionCount;
    handleStartTest(`/test/practice?count=${count}${selectedCountry === 'russia' ? '&country=russia' : ''}&category=${selectedCategory}`);
  };

  const handleBannerClick = () => {
    if (selectedCountry !== 'russia') {
      handleRandomTestStart();
      return;
    }
    navigate(recommendation.route);
  };

  const handleSmartTestStart = () => {
    if (!isPremium) {
      openModal('PAYWALL');
      return;
    }
    navigate(`/test/smart?count=${randomQuestionCount}&category=${selectedCategory}`);
  };

  // Адаптируем тесты под выбранную страну
  const testModes = useMemo(() => {
    const baseModes = [
      {
        id: 1,
        title: t('testsPage.randomTest'),
        description: t('testsPage.randomTestDesc'),
        icon: Shuffle,
        color: "primary",
        premium: false,
        difficulty: localeText("Средняя", "Media", "Medium"),
        route: `/test/practice?count=${randomQuestionCount}${selectedCountry === 'russia' ? '&country=russia' : ''}&category=${selectedCategory}`,
        featured: true,
        gradient: "from-blue-600 via-blue-500 to-cyan-500",
      },
      {
        id: 2,
        title: selectedCountry === 'russia' ? 'Экзамен ПДД РФ' : (t('testsPage.exam') + " DGT"),
        description: selectedCountry === 'russia'
          ? 'Полная симуляция официального экзамена ПДД'
          : t('testsPage.examDesc'),
        icon: Clock,
        color: "success",
        premium: false,
        difficulty: localeText("Сложная", "Difícil", "Hard"),
        route: selectedCountry === 'russia' ? `/test/exam-russia?category=${selectedCategory}` : "/test/exam",
        featured: false,
        gradient: "from-emerald-600 to-teal-600",
        badge: selectedCountry === 'russia' ? 'Регламент 2025' : undefined,
        isLocked: selectedCountry !== 'russia' && licensePoints < 10,
      },

      {
        id: 4,
        title: t('testsPage.marathon'),
        description: t('testsPage.marathonDesc'),
        icon: Flame,
        color: "destructive",
        premium: false,
        difficulty: localeText("Сложная", "Difícil", "Hard"),
        route: `/test/marathon?country=${selectedCountry === 'russia' ? 'russia' : 'spain'}&category=${selectedCategory}`,
        gradient: "from-pink-600 to-rose-600",
      },
      {
        id: 5,
        title: challengeStats.errors === 0
          ? localeText('Ошибок нет!', '¡Sin errores!', 'No errors!')
          : (selectedCountry === 'russia' ? 'Ошибки' : t('testsPage.challengeBank')),
        description: challengeStats.errors === 0
          ? localeText(
            'Идеальный результат! Все ошибки разобраны.',
            '¡Resultado perfecto! Todos los errores ya están resueltos.',
            'Perfect result! All mistakes have been resolved.'
          )
          : (selectedCountry === 'russia'
            ? `${challengeStats.errors} вопросов требуют повторения`
            : localeText(
              `${challengeStats.errors} preguntas requieren repaso`,
              `${challengeStats.errors} preguntas requieren repaso`,
              `${challengeStats.errors} questions need review`
            )),
        icon: challengeStats.errors === 0 ? CheckCircle : History,
        color: challengeStats.errors === 0 ? "success" : "destructive",
        premium: false,
        difficulty: challengeStats.errors === 0
          ? localeText("Мастер", "Maestría", "Master")
          : localeText("Важно", "Importante", "Important"),
        route: challengeStats.errors === 0 ? "#" : `/tests/error-bank?category=${selectedCategory}${selectedCountry === 'russia' ? '&country=russia' : ''}`,
        gradient: challengeStats.errors === 0
          ? "from-emerald-500 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          : "from-rose-600 to-red-600",
      },
      {
        id: 9,
        title: selectedCountry === 'russia' ? 'Challenge Bank™' : localeText('Challenge Bank™', 'Challenge Bank™', 'Challenge Bank™'),
        description: selectedCountry === 'russia'
          ? `${challengeStats.favorites} сохраненных вопросов`
          : localeText(
            `${challengeStats.favorites} preguntas guardadas`,
            `${challengeStats.favorites} preguntas guardadas`,
            `${challengeStats.favorites} saved questions`
          ),
        icon: Archive,
        color: "secondary",
        premium: false,
        difficulty: localeText("Личная", "Personal", "Personal"),
        route: `/tests/favorites?category=${selectedCategory}${selectedCountry === 'russia' ? '&country=russia' : ''}`,
        gradient: "from-violet-600 to-purple-600",
      },
      {
        id: 6,
        title: selectedCountry === 'russia' ? 'Топ-50 ловушек ГАИ' : t('testsPage.hardest'),
        description: selectedCountry === 'russia'
          ? 'Самые сложные вопросы, на которых валятся все'
          : t('testsPage.hardestDesc'),
        icon: AlertTriangle,
        color: "destructive",
        premium: false,
        difficulty: localeText("Сложная", "Difícil", "Hard"),
        route: selectedCountry === 'russia' ? `/test/traps?country=russia&category=${selectedCategory}` : `/test/hardest`,
        gradient: selectedCountry === 'russia' ? "from-purple-600 to-pink-600" : "from-slate-600 to-gray-600",
        featured: selectedCountry === 'russia',
      },
      // По Темам - универсальный режим для всех стран
      {
        id: 7,
        title: selectedCountry === 'russia' ? 'По Темам' : localeText('По темам', 'Por temas', 'By topics'),
        description: selectedCountry === 'russia'
          ? 'Изучайте правила по главам. Выберите тему и прорешайте вопросы только по ней'
          : localeText(
            'Estudia las reglas por temas. Elige un tema y resuelve solo esas preguntas',
            'Estudia las reglas por temas. Elige un tema y resuelve solo esas preguntas',
            'Study the rules by topic. Pick a theme and answer only those questions.'
          ),
        icon: BookOpen,
        color: "primary",
        premium: false,
        difficulty: localeText("Средняя", "Media", "Medium"),
        route: "/test/by-topics",
        gradient: "from-blue-600 to-cyan-600",
      },
      ...(selectedCountry === 'russia' ? [
        {
          id: 8,
          title: 'Нон-стоп',
          description: 'Прорешайте все 800 вопросов базы. Прогресс сохраняется между сессиями',
          icon: Target,
          color: "primary",
          premium: false,
          difficulty: localeText("Сложная", "Difícil", "Hard"),
          route: `/test/nonstop?category=${selectedCategory}`,
          gradient: "from-amber-600 to-orange-600",
        },
      ] : []),
    ];

    if (!isGuest) return baseModes;

    return baseModes.map((mode) => {
      if (mode.id === 2) {
        return {
          ...mode,
          isLocked: false,
          description: localeText(
            'Демо-экзамен на базе 30 вопросов. Полная база и история откроются после регистрации.',
            'Simulacro demo con base limitada a 30 preguntas. La base completa y el historial se abren al registrarte.',
            'Demo exam with a 30-question limited base. Full bank and history unlock after sign-in.'
          ),
        };
      }

      if (mode.id === 5) {
        return {
          ...mode,
          title: selectedCountry === 'russia' ? 'Ошибки' : t('testsPage.challengeBank'),
          isLocked: false,
          route: `/test/challenge-bank?category=${selectedCategory}${selectedCountry === 'russia' ? '&country=russia' : ''}`,
          description: localeText(
            'Демо режима ошибок на 30 вопросах. После регистрации Skily будет сохранять твои реальные промахи.',
            'Demo del banco de errores con 30 preguntas. Al registrarte Skily guardará tus fallos reales.',
            'Mistake-bank demo with 30 questions. Sign in to save your real mistakes.'
          ),
        };
      }

      if (mode.id === 9) {
        return {
          ...mode,
          isLocked: false,
          route: `/test/favorites?category=${selectedCategory}${selectedCountry === 'russia' ? '&country=russia' : ''}`,
          description: localeText(
            'Демо избранного на той же базе. Сохранять личные вопросы можно после регистрации.',
            'Demo de favoritos sobre la misma base. Guardar preguntas personales requiere registro.',
            'Favorites demo on the same base. Personal saved questions require sign-in.'
          ),
        };
      }

      if (mode.id === 7) {
        return {
          ...mode,
          isLocked: false,
          route: `/test/practice?count=30&category=${selectedCategory}`,
          description: localeText(
            'Демо тематической тренировки из 30 вопросов. Темы и прогресс откроются после регистрации.',
            'Demo de práctica temática con 30 preguntas. Temas y progreso se desbloquean al registrarte.',
            'Topic-practice demo with 30 questions. Topics and progress unlock after sign-in.'
          ),
        };
      }

      return {
        ...mode,
        isLocked: false,
        description: `${mode.description} ${localeText(
          'Демо ограничено 30 вопросами.',
          'Demo limitado a 30 preguntas.',
          'Demo limited to 30 questions.'
        )}`,
      };
    });
  }, [selectedCountry, randomQuestionCount, selectedCategory, challengeStats, t, licensePoints, localeText, isGuest]);

  if (topicsLoading || ticketsLoading) {
    return (
      <>
        <SeoHead
          title={seoByLanguage[language]?.title || seoByLanguage.en.title}
          description={seoByLanguage[language]?.description || seoByLanguage.en.description}
          canonicalUrl="https://skilyapp.com/tests"
        />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Layout>
        <SeoHead
          title={seoByLanguage[language]?.title || seoByLanguage.en.title}
          description={seoByLanguage[language]?.description || seoByLanguage.en.description}
          canonicalUrl="https://skilyapp.com/tests"
        />

        <div className="min-h-screen bg-transparent p-6 md:p-10 font-sans pb-6 text-foreground">
          <div className="max-w-[1370px] mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fade-in">
              <div className="w-full md:w-auto">
                <div className="mb-4 flex md:hidden">
                  <ContextSwitcher className="h-9 rounded-xl bg-background/75 border-border/60 shadow-sm" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                  {selectedCountry === 'russia' ? 'Билеты ПДД' : t('testsPage.title')}
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  {selectedCountry === 'russia' ? 'Выберите билет для изучения' : t('testsPage.subtitle')}
                </p>
              </div>

              {/* Stats Badges - Style from Dashboard - Always on one line */}
              <div className="flex flex-col items-end gap-2 min-w-0">
              {!isPremium && !isGuest && selectedCountry === 'spain' && (
                <button
                  onClick={() => openModal('PAYWALL')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                >
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {localeText(
                      `${FREE_QUESTION_LIMIT} из 2157 вопросов`,
                      `${FREE_QUESTION_LIMIT} de 2157 preguntas`,
                      `${FREE_QUESTION_LIMIT} of 2157 questions`
                    )}
                  </span>
                  <span className="text-xs font-bold text-amber-500">·</span>
                  <span className="text-xs font-bold text-amber-500">
                    {localeText('Открыть', 'Desbloquear', 'Unlock')} →
                  </span>
                </button>
              )}
              <div className="flex items-center gap-1.5">
                {/* AI Insights shortcut */}
                <AIInsightsLibrary isPremium={isPremium} />

                {/* Streak */}
                <CompactStreakJewel streak={streakDays} size="sm" hasClaimedToday={false} />

                {/* Readiness % — prominent circle + number */}
                {readinessPct !== null && (
                  <div className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30 text-sm font-bold text-purple-200 flex-shrink-0 whitespace-nowrap shadow-lg shadow-purple-500/10">
                    <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90 flex-shrink-0">
                      <defs>
                        <linearGradient id="readiness-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#c084fc', stopOpacity: 0.3 }} />
                          <stop offset="100%" style={{ stopColor: '#a78bfa', stopOpacity: 0.3 }} />
                        </linearGradient>
                      </defs>
                      <circle cx="18" cy="18" r="14" fill="none" stroke="url(#readiness-grad)" strokeWidth="2.5" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#c084fc" strokeWidth="2.5"
                        strokeDasharray={`${(readinessPct / 100) * 87.96} 87.96`}
                        strokeLinecap="round" style={{ opacity: 0.9 }} />
                    </svg>
                    <span>{readinessPct}%</span>
                  </div>
                )}

                {/* Error queue — bold standout */}
                {challengeStats.errors > 0 && (
                  <div className="flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 text-sm font-bold text-amber-200 flex-shrink-0 whitespace-nowrap shadow-lg shadow-amber-500/10">
                    <span className="text-lg">⚠️</span>
                    <span>{challengeStats.errors}</span>
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* КОМАНДНЫЙ ЦЕНТР */}
            {selectedCountry !== 'russia' ? (
              /* Spain: Two banners side by side — Random + Smart */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Banner 1: Random Test */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 cursor-pointer group bg-gradient-to-b from-white to-slate-50 dark:from-[#1A1F2B] dark:to-[#11141D] backdrop-blur-xl border border-slate-200 dark:border-white/5 transition-all duration-500 shadow-lg dark:shadow-2xl hover:-translate-y-1 hover:border-blue-500/30 dark:hover:border-blue-400/20 flex flex-col min-h-[380px]"
                  onClick={handleBannerClick}
                >
                  {/* Subtle glows */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/5 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

                  {/* Watermark icon */}
                  <Shuffle className="absolute -bottom-6 -right-6 w-48 h-48 text-slate-900/[0.02] dark:text-white/[0.02] rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6 pointer-events-none" />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Crown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-current" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 tracking-wide uppercase">{localeText('Рекомендуется', 'Recomendado', 'Recommended')}</span>
                      </div>
                      
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                        <Shuffle className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight mb-3">
                        {t('testsPage.randomTest')}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[90%]">
                        {t('testsPage.randomTestDesc')}
                      </p>
                    </div>

                    {/* Controls & CTA aligned at bottom */}
                    <div className="mt-8 space-y-6">
                      {/* Count selector as segmented control */}
                      <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 w-fit backdrop-blur-sm">
                        {[10, 20, 30].map((count) => (
                          <motion.button
                            key={count}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); handleCountSelect(count); }}
                            className={cn(
                              "px-6 py-2.5 rounded-xl font-bold text-sm transition-all relative",
                              randomQuestionCount === count
                                ? "text-blue-600 dark:text-blue-400 shadow-sm bg-white dark:bg-slate-700/80 border border-slate-200/50 dark:border-white/10"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                          >
                            {count}
                          </motion.button>
                        ))}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleBannerClick(); }}
                        className="group/btn relative h-12 px-8 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 transition-all duration-200 flex items-center justify-between gap-3 overflow-hidden w-full sm:w-fit"
                      >
                        <span className="flex items-center gap-2 z-10">
                          <Play className="w-4 h-4 fill-white" />
                          <span>{t('testsPage.startButton')}</span>
                        </span>
                        <ArrowRight className="w-4 h-4 z-10" />
                        <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Banner 2: Smart Test */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.07 }}
                  className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 cursor-pointer group bg-gradient-to-b from-white to-slate-50 dark:from-[#1A1F2B] dark:to-[#11141D] backdrop-blur-xl border border-slate-200 dark:border-white/5 transition-all duration-500 shadow-lg dark:shadow-2xl hover:-translate-y-1 hover:border-indigo-500/30 dark:hover:border-indigo-400/20 flex flex-col min-h-[380px]"
                  onClick={handleSmartTestStart}
                >
                  {/* Subtle glows */}
                  <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -translate-x-1/3 -translate-y-1/3 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-cyan-400/5 blur-[60px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

                  {/* Watermark icon */}
                  <Brain className="absolute -bottom-6 -right-6 w-48 h-48 text-slate-900/[0.02] dark:text-white/[0.02] rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6 pointer-events-none" />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                          <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">{localeText('Умный тест', 'Test inteligente', 'Smart test')}</span>
                        </div>
                        {!isPremium && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wide uppercase">Premium</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
                        <Sparkles className="w-6 h-6 text-indigo-500" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight mb-3">
                        {localeText('УМНЫЙ ТЕСТ', 'TEST INTELIGENTE', 'SMART TEST')}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[90%]">
                        {localeText(
                          'ИИ анализирует ошибки и строит тест под твои слабые места.',
                          'La IA analiza errores y construye el test según tus puntos débiles.',
                          'AI analyzes mistakes and builds a test targeting your weak spots.'
                        )}
                      </p>
                    </div>

                    {/* Progress bars & CTA aligned at bottom */}
                    <div className="mt-8 space-y-6">
                      <div className="flex flex-col gap-2.5 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
                        {[
                          { pct: '40%', w: 40, label: localeText('слабые темы', 'temas débiles', 'weak topics'), color: 'bg-indigo-500' },
                          { pct: '30%', w: 30, label: localeText('давно не видел', 'repaso espaciado', 'spaced review'), color: 'bg-blue-500' },
                          { pct: '20%', w: 20, label: localeText('следующий уровень', 'siguiente nivel', 'next level'), color: 'bg-cyan-500' },
                        ].map(({ pct, w, label, color }) => (
                          <div key={pct} className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 w-8 tabular-nums">{pct}</span>
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} className={cn("h-full rounded-full", color)} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-28 text-right uppercase tracking-wider">{label}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleSmartTestStart(); }}
                        className="group/btn relative h-12 px-8 rounded-2xl font-bold text-sm shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all duration-200 flex items-center justify-between gap-3 overflow-hidden w-full sm:w-fit bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20"
                      >
                        {!isPremium ? (
                          <>
                            <span className="flex items-center gap-2 z-10">
                              <Lock className="w-4 h-4" />
                              <span>{localeText('Открыть Premium', 'Desbloquear Premium', 'Unlock Premium')}</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-2 z-10">
                              <Zap className="w-4 h-4 fill-white" />
                              <span>{localeText('Начать', 'Empezar', 'Start')}</span>
                            </span>
                            <ArrowRight className="w-4 h-4 z-10" />
                          </>
                        )}
                        <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
            /* Russia: original single banner */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative w-full overflow-hidden rounded-[2.5rem] shadow-2xl group cursor-pointer border border-white/10",
                recommendation.theme === 'warning'
                  ? 'premium-mesh-orange'
                  : recommendation.theme === 'info'
                    ? 'premium-mesh-info'
                    : 'premium-mesh-primary'
              )}
              onClick={handleBannerClick}
            >
              {/* Noise texture */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("/noise.svg")' }}></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                {/* Left Content — Russia Smart Mentor */}
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-md border shadow-lg",
                        recommendation.theme === 'warning' ? "bg-white/20 border-white/30" : "bg-white/10 border-white/20"
                      )}>
                        <recommendation.icon className={cn(
                          "w-4 h-4",
                          recommendation.theme === 'warning' ? "text-white" : "text-amber-300 fill-amber-300"
                        )} />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                          {recommendation.type === 'correction' ? 'Требуется внимание' :
                            recommendation.type === 'resume' ? 'Рекомендуем продолжить' :
                              recommendation.type === 'progress' ? 'Твой следующий шаг' : 'Твой первый шаг'}
                        </span>
                      </div>

                      <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
                        {recommendation.title.toUpperCase()}
                      </h2>

                      <p className="text-lg md:text-xl text-white/90 font-medium max-w-md leading-relaxed drop-shadow-md">
                        {recommendation.subtitle}
                      </p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleBannerClick(); }}
                      className={cn(
                        "group relative h-16 px-10 rounded-full font-black text-lg transition-all duration-300 flex items-center gap-3 overflow-hidden w-fit shadow-xl hover:scale-105 active:scale-95",
                        recommendation.theme === 'warning'
                          ? "bg-white text-orange-600 shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)]"
                          : recommendation.theme === 'info'
                            ? "bg-white text-cyan-700 shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)]"
                            : "bg-white text-blue-600 shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)]"
                      )}
                    >
                      {recommendation.theme === 'warning' ? <RotateCcw className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                      <span>{recommendation.buttonText}</span>
                      <ArrowRight className="w-6 h-6" />
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </button>
                  </div>
                </div>

                {/* Right Illustration */}
                <div className="hidden lg:flex justify-center items-center relative">
                  <motion.div
                    animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-80 h-80"
                  >
                    <div className={cn(
                      "absolute inset-0 blur-3xl opacity-60",
                      recommendation.theme === 'warning' ? "bg-orange-400" :
                        recommendation.theme === 'info' ? "bg-cyan-400" : "bg-blue-400"
                    )} />
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl rounded-[4rem] border border-white/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.2),0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                      {recommendation.type === 'correction' ? (
                        <AlertTriangle className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                      ) : recommendation.type === 'resume' ? (
                        <Clock className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                      ) : (
                        <CarFront className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                      )}
                    </div>
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/20 backdrop-blur-lg rounded-3xl border border-white/30 flex items-center justify-center shadow-xl">
                      <Target className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-xl">
                      <MapPin className="w-10 h-10 text-white/80" />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />
            </motion.div>
            )}

            {/* Other Test Modes Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {testModes.filter(m => m.id !== 1).map((mode, index) => {
                  // Логирование для отладки экзамена
                  if (mode.id === 2 && import.meta.env.DEV) {
                    console.log('[Tests] Экзамен найден:', {
                      id: mode.id,
                      title: mode.title,
                      route: mode.route,
                      selectedCountry,
                    });
                  }
                  const Icon = mode.icon;
                  const isFeatured = mode.id === 2;

                  // Map mode colors to tailwind classes
                  const colorMap: Record<string, {
                    base: string;
                    border: string;
                    shadow: string;
                    iconBg: string;
                    icon: string;
                    titleHover: string;
                    gradient: string;
                    badge: string;
                  }> = {
                    primary: {
                      base: 'indigo',
                      border: 'group-hover:border-indigo-500/20',
                      shadow: 'group-hover:shadow-indigo-500/10',
                      iconBg: 'bg-indigo-500/20 border-indigo-500/30',
                      icon: 'text-indigo-400',
                      titleHover: 'group-hover:text-indigo-400',
                      gradient: 'from-indigo-500/10',
                      badge: 'text-indigo-400 border-indigo-500/30'
                    },
                    secondary: {
                      base: 'blue',
                      border: 'group-hover:border-blue-500/20',
                      shadow: 'group-hover:shadow-blue-500/10',
                      iconBg: 'bg-blue-500/20 border-blue-500/30',
                      icon: 'text-blue-400',
                      titleHover: 'group-hover:text-blue-400',
                      gradient: 'from-blue-500/10',
                      badge: 'text-blue-400 border-blue-500/30'
                    },
                    success: {
                      base: 'emerald',
                      border: 'group-hover:border-emerald-500/20',
                      shadow: 'group-hover:shadow-emerald-500/10',
                      iconBg: 'bg-emerald-500/20 border-emerald-500/30',
                      icon: 'text-emerald-400',
                      titleHover: 'group-hover:text-emerald-400',
                      gradient: 'from-emerald-500/10',
                      badge: 'text-emerald-400 border-emerald-500/30'
                    },
                    warning: {
                      base: 'amber',
                      border: 'group-hover:border-amber-500/20',
                      shadow: 'group-hover:shadow-amber-500/10',
                      iconBg: 'bg-amber-500/20 border-amber-500/30',
                      icon: 'text-amber-400',
                      titleHover: 'group-hover:text-amber-400',
                      gradient: 'from-amber-500/10',
                      badge: 'text-amber-400 border-amber-500/30'
                    },
                    destructive: {
                      base: 'rose',
                      border: 'group-hover:border-rose-500/20',
                      shadow: 'group-hover:shadow-rose-500/10',
                      iconBg: 'bg-rose-500/20 border-rose-500/30',
                      icon: 'text-rose-400',
                      titleHover: 'group-hover:text-rose-400',
                      gradient: 'from-rose-500/10',
                      badge: 'text-rose-400 border-rose-500/30'
                    },
                    orange: {
                      base: 'orange',
                      border: 'group-hover:border-orange-500/20',
                      shadow: 'group-hover:shadow-orange-500/10',
                      iconBg: 'bg-orange-500/20 border-orange-500/30',
                      icon: 'text-orange-400',
                      titleHover: 'group-hover:text-orange-400',
                      gradient: 'from-orange-500/10',
                      badge: 'text-orange-400 border-orange-500/30'
                    },
                  };

                  const theme = colorMap[mode.color] || colorMap.primary;

                  return (
                    <motion.div
                      key={mode.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                      className={cn(
                        isFeatured ? 'md:col-span-2' : 'col-span-1',
                        "relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 cursor-pointer group",
                        "bg-white dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-white/5",
                        "transition-all duration-300 shadow-lg dark:shadow-xl",
                        !mode.isLocked && "hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl",
                        mode.isLocked ? "opacity-75 grayscale-[0.5]" : theme.border,
                        !mode.isLocked && theme.shadow
                      )}
                      style={{
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (mode.isLocked) {
                          return;
                        }

                        if (mode.premium && !isPremium) {
                          openModal('PAYWALL');
                        } else if (mode.route) {
                          if (import.meta.env.DEV && mode.id === 2) {
                            console.log('[Tests] Клик по экзамену:', {
                              route: mode.route,
                              selectedCountry,
                              title: mode.title,
                            });
                          }
                          let finalRoute = mode.route;
                          // Для экзамена добавляем уникальный ID сессии, чтобы сбросить таймер
                          if (mode.id === 2 || mode.route.includes('exam')) {
                            finalRoute += (finalRoute.includes('?') ? '&' : '?') + `session=${Date.now()}`;
                          }
                          handleStartTest(finalRoute);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {/* Ambient Glow on Hover */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                        theme.gradient,
                        "via-transparent to-transparent"
                      )} />

                      {/* Large Watermark Icon */}
                      <Icon className="absolute w-32 h-32 text-slate-200/10 dark:text-white/[0.03] group-hover:text-slate-300/20 dark:group-hover:text-white/[0.05] -bottom-6 -right-6 rotate-12 transition-all duration-500" />

                      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div className="flex justify-between items-start">
                          {/* Icon Container - Dashboard Style */}
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 mb-4",
                            !mode.isLocked && "group-hover:scale-110 group-hover:rotate-3",
                            mode.isLocked ? "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10" : theme.iconBg
                          )}>
                            {mode.isLocked ? (
                              <Lock className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                            ) : (
                              <Icon className={cn("w-7 h-7", theme.icon)} />
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className={cn(
                              "bg-transparent border-current uppercase text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full",
                              mode.isLocked ? "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/20" : theme.badge
                            )}>
                              {mode.isLocked ? localeText('ЗАБЛОКИРОВАНО', 'BLOQUEADO', 'LOCKED') : mode.difficulty}
                            </Badge>
                            {mode.badge && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                {mode.badge}
                              </Badge>
                            )}
                            {mode.id === 2 && !mode.isLocked && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex gap-1 items-center animate-pulse">
                                <CheckCircle size={10} className="fill-emerald-500/20" />
                                {localeText('Допуск открыт', 'Acceso abierto', 'Access open')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className={cn(
                            "text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors",
                            theme.titleHover,
                            mode.isLocked && "text-slate-400 dark:text-slate-500"
                          )}>
                            {mode.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed line-clamp-2 text-left">
                            {mode.isLocked
                              ? (isGuest
                                ? localeText(
                                  'Доступно после регистрации. Гостям открыт только случайный тест на 30 вопросов.',
                                  'Disponible después del registro. Para invitados solo está abierta la prueba aleatoria de 30 preguntas.',
                                  'Available after registration. Guests can only use the random 30-question test.'
                                )
                                : localeText(
                                  `Набери 10 баллов, чтобы открыть доступ к экзамену. У тебя ${licensePoints}/10.`,
                                  `Consigue 10 puntos para desbloquear el examen. Tienes ${licensePoints}/10.`,
                                  `Reach 10 points to unlock the exam. You have ${licensePoints}/10.`
                                ))
                              : mode.description
                            }
                          </p>
                        </div>

                        {/* Progress Bar for Non-stop */}
                        {mode.id === 8 && nonstopProgress && (
                          <div className="mt-2 space-y-2 animate-fade-in">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-amber-500/80">
                              <span>Пройдено: {nonstopProgress.answered} / {nonstopProgress.total}</span>
                              <span className="flex items-center gap-1">
                                {Math.round((nonstopProgress.answered / nonstopProgress.total) * 100)}%
                                <CheckCircle className="w-3 h-3" />
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden border border-amber-500/20 shadow-inner">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(nonstopProgress.answered / nonstopProgress.total) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div >

            {/* Билеты (только для России) */}
            {selectedCountry === 'russia' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                      Выбор билета
                    </span>
                  </div>
                </div>

                <div className="space-y-8 p-0 sm:p-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6">
                    {tickets.map((ticket, i) => {
                      const ticketId = typeof ticket.id === 'number' ? ticket.id : ticket.number;
                      const ticketNumber = ticket.metadata?.ticket_number || ticket.number;

                      const tStatus = ticketsStatus[ticketNumber.toString()];
                      let status: 'idle' | 'charging' | 'charged' | 'damaged' = 'idle';
                      const progress = tStatus?.score || 0;
                      const completed = tStatus?.completed || false;
                      const hasErrors = tStatus?.hasErrors || false;
                      const isStarted = tStatus?.isStarted || false;

                      if (completed || progress >= 100) {
                        status = 'charged';
                      } else if (hasErrors && isStarted) {
                        status = 'damaged';
                      } else if (isStarted || progress > 0) {
                        status = 'charging';
                      }

                      return (
                        <TicketCore
                          key={ticket.id}
                          number={ticketNumber}
                          progress={progress}
                          status={status}
                          hasErrors={hasErrors}
                          errorCount={tStatus?.errorCount}
                          isRussia={selectedCountry === 'russia'}
                          onClick={() => navigate(`/learn/${selectedCountry}/ticket/${ticketId}`)}
                        />
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-6 p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 backdrop-blur-xl shadow-xl relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5 opacity-50" />
                    <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/20 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-wrap items-center gap-6 w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                          <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                        </div>
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                          Сдано
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                        </div>
                        <span className="text-xs font-black text-orange-400 uppercase tracking-widest">
                          Прохожу
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center">
                          <AlertIcon className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-xs font-black text-red-400 uppercase tracking-widest">
                          Ошибка
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div >
        </div >
      </Layout >
    </>
  );
};

export default Tests;
