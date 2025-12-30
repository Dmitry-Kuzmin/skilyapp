import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shuffle, Clock, Zap, Flame, History, AlertTriangle, AlertCircle,
  Target, TrendingUp, Crown, BookOpen, Gamepad2, Play, ArrowRight, Sparkles, CheckCircle,
  Star, AlertTriangle as AlertIcon, RotateCcw,
  CarFront, MapPin, Gauge, Check, Trophy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopics } from "@/hooks/useTopics";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useChallengeBankCount } from "@/hooks/useChallengeBankCount";
import { usePDDContext } from "@/contexts/PDDContext";
import { usePDDTickets } from "@/hooks/usePDDTickets";
import { usePDDTopics } from "@/hooks/usePDDTopics";
import { useTicketsStatus } from "@/hooks/useTicketsStatus";
import { useSmartRecommendation } from "@/hooks/useSmartRecommendation";
import { COUNTRIES_CONFIG } from "@/types/pdd";
import { motion } from "@/components/optimized/Motion";
import { getImageUrl } from "@/utils/imageUtils";
import { loadTestProgress } from "@/utils/testStorage";
import { cn } from "@/lib/utils";
import { AIInsightsLibrary } from "@/components/test-results/AIInsightsLibrary";

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
                status === 'charged' ? "bg-orange-500/10 border-orange-500/20 opacity-80" :
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
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { language, t } = useLanguage();
  const { selectedCountry, selectedCategory } = usePDDContext();

  // 1. Сначала все хуки данных (React Query)
  const { data: dbTopics = [], isLoading: topicsLoading } = useTopics();
  const { data: tickets = [], isLoading: ticketsLoading } = usePDDTickets(selectedCountry);
  const { data: userProgress = [] } = useUserProgress(profileId, selectedCountry, selectedCategory);
  const ticketsStatus = useTicketsStatus(profileId, selectedCountry, selectedCategory);
  const { data: challengeBankCount = 0 } = useChallengeBankCount(profileId, selectedCountry, selectedCategory);
  const { data: pddTopics = [] } = usePDDTopics(selectedCountry);

  // 2. Умные рекомендации
  const recommendation = useSmartRecommendation(profileId);

  // 3. Состояние UI
  const [randomQuestionCount, setRandomQuestionCount] = useState(20);
  const [hasSelectedCount, setHasSelectedCount] = useState(false);
  const [nonstopProgress, setNonstopProgress] = useState<{ answered: number; total: number } | null>(null);

  const countryData = COUNTRIES_CONFIG[selectedCountry];

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
    navigate(path);
  };

  const handleTopicClick = (topicId: string) => {
    handleStartTest(`/test/practice?topic=${topicId}&count=30`);
  };

  const handleCountSelect = (count: number) => {
    setRandomQuestionCount(count);
    setHasSelectedCount(true);
  };

  const handleRandomTestStart = () => {
    handleStartTest(`/test/practice?count=${randomQuestionCount}${selectedCountry === 'russia' ? '&country=russia' : ''}`);
  };

  const handleBannerClick = () => {
    if (selectedCountry !== 'russia') {
      handleRandomTestStart();
      return;
    }
    navigate(recommendation.route);
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
        difficulty: "Средняя",
        route: `/test/practice?count=${randomQuestionCount}${selectedCountry === 'russia' ? '&country=russia' : ''}`,
        featured: true,
        gradient: "from-indigo-600 via-purple-600 to-pink-600",
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
        difficulty: "Сложная",
        route: selectedCountry === 'russia' ? "/test/exam-russia" : "/test/exam",
        featured: false,
        gradient: "from-emerald-600 to-teal-600",
        badge: selectedCountry === 'russia' ? 'Регламент 2025' : undefined,
      },
      {
        id: 3,
        title: t('testsPage.blitz'),
        description: t('testsPage.blitzDesc'),
        icon: Zap,
        color: "warning",
        premium: false,
        difficulty: "Лёгкая",
        route: `/test/blitz?count=20&timer=300${selectedCountry === 'russia' ? '&country=russia' : ''}`,
        gradient: "from-orange-600 to-amber-600",
      },
      {
        id: 4,
        title: t('testsPage.marathon'),
        description: t('testsPage.marathonDesc'),
        icon: Flame,
        color: "destructive",
        premium: false,
        difficulty: "Сложная",
        route: selectedCountry === 'russia' ? '/test/marathon?country=russia' : '/test/mastery',
        gradient: "from-pink-600 to-rose-600",
      },
      {
        id: 5,
        title: challengeBankCount === 0 ? 'Ошибок нет!' : t('testsPage.challengeBank'),
        description: challengeBankCount === 0
          ? 'Идеальный результат! Все ошибки разобраны. Так держать!'
          : t('testsPage.challengeBankDesc', { count: challengeBankCount }),
        icon: challengeBankCount === 0 ? Trophy : History,
        color: challengeBankCount === 0 ? "success" : "orange",
        premium: false,
        difficulty: challengeBankCount === 0 ? "Мастер" : "Средняя",
        route: challengeBankCount === 0 ? "#" : `/test/challenge-bank${selectedCountry === 'russia' ? '?country=russia' : ''}`,
        gradient: challengeBankCount === 0
          ? "from-emerald-500 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          : "from-purple-600 to-violet-600",
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
        difficulty: "Сложная",
        route: selectedCountry === 'russia' ? '/test/traps?country=russia' : `/test/hardest`,
        gradient: selectedCountry === 'russia' ? "from-purple-600 to-pink-600" : "from-slate-600 to-gray-600",
        featured: selectedCountry === 'russia',
      },
      ...(selectedCountry === 'russia' ? [
        {
          id: 7,
          title: 'По Темам',
          description: 'Изучайте правила по главам. Выберите тему и прорешайте вопросы только по ней',
          icon: BookOpen,
          color: "primary",
          premium: false,
          difficulty: "Средняя",
          route: "/test/by-topics",
          gradient: "from-blue-600 to-cyan-600",
        },
        {
          id: 8,
          title: 'Нон-стоп',
          description: 'Прорешайте все 800 вопросов базы. Прогресс сохраняется между сессиями',
          icon: Target,
          color: "primary",
          premium: false,
          difficulty: "Сложная",
          route: "/test/nonstop",
          gradient: "from-amber-600 to-orange-600",
        },
      ] : []),
    ];

    return baseModes;
  }, [selectedCountry, randomQuestionCount, challengeBankCount, t, nonstopProgress]);

  const difficultyColors = {
    "Лёгкая": "success",
    "Средняя": "warning",
    "Сложная": "destructive",
  };

  return (
    <>
      <Layout>
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans pb-6 text-foreground">
          <div className="max-w-[1370px] mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fade-in">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                  {selectedCountry === 'russia' ? 'Билеты ПДД' : t('testsPage.title')}
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  {selectedCountry === 'russia' ? 'Выберите билет для изучения' : t('testsPage.subtitle')}
                </p>
              </div>

              {/* Stats Badges - Style from Dashboard - Always on one line */}
              <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
                {/* Accuracy Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 backdrop-blur-sm shadow-lg shadow-blue-500/10 flex-shrink-0 whitespace-nowrap">
                  <Target className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-blue-700 dark:text-blue-100">
                    {safeStats.accuracy}% <span className="text-blue-600/70 dark:text-blue-300/70 font-normal">точн.</span>
                  </span>
                </div>

                {/* Answered Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm shadow-lg shadow-emerald-500/10 flex-shrink-0 whitespace-nowrap">
                  <TrendingUp className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-emerald-700 dark:text-emerald-100">
                    {safeStats.totalAnswered} <span className="text-emerald-600/70 dark:text-emerald-300/70 font-normal">отв.</span>
                  </span>
                </div>

                {/* Errors Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-sm shadow-lg shadow-amber-500/10 flex-shrink-0 whitespace-nowrap">
                  <AlertTriangle className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-amber-700 dark:text-amber-100">
                    {challengeBankCount} <span className="text-amber-600/70 dark:text-amber-300/70 font-normal">ошиб.</span>
                  </span>
                </div>
              </div>
            </div>

            {/* КОМАНДНЫЙ ЦЕНТР (Умный Инструктор или Конфигуратор теста) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative w-full overflow-hidden rounded-[2.5rem] shadow-2xl group cursor-pointer border border-white/10",
                selectedCountry === 'russia'
                  ? (recommendation.theme === 'warning'
                    ? 'premium-mesh-orange'
                    : recommendation.theme === 'info'
                      ? 'premium-mesh-info'
                      : 'premium-mesh-primary')
                  : 'premium-mesh-primary'
              )}
              onClick={handleBannerClick}
            >
              {/* Noise texture */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("/noise.svg")' }}></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                  {selectedCountry === 'russia' ? (
                    /* Smart Mentor Mode (Russia) */
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBannerClick();
                        }}
                        className={cn(
                          "group relative h-16 px-10 rounded-full font-black text-lg transition-all duration-300 flex items-center gap-3 overflow-hidden w-fit shadow-xl hover:scale-105 active:scale-95",
                          recommendation.theme === 'warning'
                            ? "bg-white text-orange-600 shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)]"
                            : recommendation.theme === 'info'
                              ? "bg-white text-cyan-700 shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)]"
                              : "bg-white text-indigo-600 shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)]"
                        )}
                      >
                        {recommendation.theme === 'warning' ? <RotateCcw className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                        <span>{recommendation.buttonText}</span>
                        <ArrowRight className="w-6 h-6" />
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      </button>
                    </div>
                  ) : (
                    /* Random Test Configurator (Default for Other Countries) */
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                          <Crown className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                          <span className="text-sm font-bold text-white">Рекомендуется</span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
                          {t('testsPage.randomTest').toUpperCase()}
                        </h2>
                        <p className="text-lg md:text-xl text-white/90 font-medium max-w-md leading-relaxed drop-shadow-md">
                          {t('testsPage.randomTestDesc')}
                        </p>

                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-white/80 font-semibold mb-3">
                              {t('testsPage.questionCount')}
                            </p>
                            <div className="flex gap-3">
                              {[10, 20, 30].map((count) => (
                                <motion.button
                                  key={count}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCountSelect(count);
                                  }}
                                  className={cn(
                                    "flex-1 px-6 py-3 rounded-xl font-bold text-base transition-all",
                                    randomQuestionCount === count
                                      ? "bg-white text-indigo-600 shadow-lg shadow-white/30"
                                      : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                                  )}
                                >
                                  {count}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {hasSelectedCount && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBannerClick();
                            }}
                            className="group relative h-16 px-10 rounded-full bg-white text-indigo-600 font-black text-lg shadow-[0_0_15px_-3px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_-3px_rgba(255,255,255,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden w-fit"
                          >
                            <Play className="w-6 h-6 fill-indigo-600 font-black" />
                            <span>{t('testsPage.startButton')}</span>
                            <ArrowRight className="w-6 h-6" />
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-indigo-100/50 to-transparent" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Illustration - Abstract Cyber-Core Shape */}
                <div className="hidden lg:flex justify-center items-center relative">
                  <motion.div
                    animate={{
                      y: [0, -20, 0],
                      rotate: [0, 5, 0]
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative w-80 h-80"
                  >
                    {/* Glowing Orbs based on theme */}
                    <div className={cn(
                      "absolute inset-0 blur-3xl opacity-60",
                      selectedCountry === 'russia'
                        ? (recommendation.theme === 'warning' ? "bg-orange-400" :
                          recommendation.theme === 'info' ? "bg-cyan-400" : "bg-purple-400")
                        : "bg-pink-400"
                    )} />

                    {/* Glass Shape */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl rounded-[4rem] border border-white/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.2),0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />

                      {/* Icon based on state */}
                      {selectedCountry === 'russia' ? (
                        recommendation.type === 'correction' ? (
                          <AlertTriangle className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                        ) : recommendation.type === 'resume' ? (
                          <Clock className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                        ) : (
                          <CarFront className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                        )
                      ) : (
                        <Shuffle className="w-40 h-40 text-white opacity-90 drop-shadow-2xl" />
                      )}
                    </div>

                    {/* Smaller Floating Elements */}
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

            {/* Other Test Modes Grid - Dashboard Style */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-card border border-border">
                    <Gamepad2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  Другие режимы
                </h3>

                {/* AI Insights Library (Always visible shortcut) */}
                <AIInsightsLibrary isPremium={isPremium} />
              </div>

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
                        "hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl",
                        theme.border,
                        theme.shadow
                      )}
                      style={{
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (mode.premium && !isPremium) {
                          // Handle premium
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
                            "group-hover:scale-110 group-hover:rotate-3",
                            theme.iconBg
                          )}>
                            <Icon className={cn("w-7 h-7", theme.icon)} />
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className={cn("bg-transparent border-current uppercase text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full", theme.badge)}>
                              {mode.difficulty}
                            </Badge>
                            {mode.badge && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                {mode.badge}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className={cn("text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors", theme.titleHover)}>
                            {mode.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed line-clamp-2">
                            {mode.description}
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

            {/* Topics Section (для Испании) или Билеты (для России) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {selectedCountry === 'russia' ? (
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
              ) : (
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-card border border-border">
                      <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    {t('testsPage.topicsTitle')}
                  </h3>
                  <Badge className="text-sm md:text-base px-3 md:px-4 py-1 md:py-2 font-bold bg-card border border-border">
                    {topics.length}
                  </Badge>
                </div>
              )}

              {/* Для России: показываем билеты в Cyber-Core Grid */}
              {
                selectedCountry === 'russia' ? (
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
                    <div className="flex flex-wrap items-center gap-6 p-6 rounded-[2rem] bg-slate-950/20 border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                          <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                        </div>
                        <span className="text-xs font-black text-emerald-100/70 uppercase tracking-widest">
                          {selectedCountry === 'russia' ? 'Сдано' : 'Charged'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                        </div>
                        <span className="text-xs font-black text-orange-100/70 uppercase tracking-widest">
                          {selectedCountry === 'russia' ? 'Прохожу' : 'Charging'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center">
                          <AlertIcon className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-xs font-black text-red-100/70 uppercase tracking-widest">
                          {selectedCountry === 'russia' ? 'Ошибка' : 'Damaged'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {topics.map((topic, i) => {
                      const coverImageUrl = topic.cover_image ? getImageUrl(topic.cover_image, 'test-covers') || topic.cover_image : null;
                      const hasCoverImage = !!coverImageUrl;

                      return (
                        <motion.div
                          key={topic.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTopicClick(topic.id)}
                          className="group relative overflow-hidden rounded-[2rem] p-6 cursor-pointer border border-border bg-card/60 dark:bg-card/40 backdrop-blur-sm hover:bg-card/80 dark:hover:bg-card/60 shadow-lg hover:shadow-xl transition-all duration-150 h-[180px]"
                          style={{
                            backgroundImage: hasCoverImage ? `url(${coverImageUrl})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                          }}
                        >
                          {/* Background gradient overlay for readability */}
                          <div className={`
                        absolute inset-0 transition-all duration-500
                        ${hasCoverImage
                              ? "bg-gradient-to-br from-black/70 via-black/60 to-black/70 group-hover:from-black/60 group-hover:via-black/50 group-hover:to-black/60"
                              : "bg-card/60 dark:bg-card/40 group-hover:bg-card/80 dark:group-hover:bg-card/60"
                            }
                      `} />

                          {/* Accent gradient on hover */}
                          {!hasCoverImage && (
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
                          )}

                          <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex items-start justify-between">
                              <motion.div
                                whileHover={{ rotate: 12, scale: 1.1 }}
                                className={`
                              w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-xl
                              ${hasCoverImage
                                    ? "bg-white/25 backdrop-blur-lg text-white border-2 border-white/40"
                                    : "bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-foreground border border-border"
                                  }
                            `}
                              >
                                {topic.number}
                              </motion.div>
                              {topic.is_premium && !isPremium && (
                                <motion.div
                                  animate={{ rotate: [0, 10, -10, 0] }}
                                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                  className="relative"
                                >
                                  <Sparkles className="w-5 h-5 text-amber-400 drop-shadow-lg" />
                                  <div className="absolute inset-0 bg-amber-400/30 blur-md rounded-full" />
                                </motion.div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className={`
                            font-black text-lg line-clamp-2 leading-tight
                            ${hasCoverImage ? "text-white drop-shadow-lg" : "text-foreground"}
                          `}>
                                {topic.name}
                              </div>
                              {topic.questions > 0 && (
                                <div className={`
                              text-sm font-bold flex items-center gap-1.5
                              ${hasCoverImage ? "text-white/90" : "text-muted-foreground"}
                            `}>
                                  <BookOpen className="w-3 h-3" />
                                  <span>{topic.questions} {t('testsPage.questions')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              }
            </motion.div >

          </div >
        </div >
      </Layout >
    </>
  );
};

export default Tests;
