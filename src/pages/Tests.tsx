import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shuffle, Clock, Zap, Flame, History, AlertTriangle,
  Target, TrendingUp, Crown, BookOpen, Gamepad2, Play, ArrowRight, Sparkles, CheckCircle,
  Star, AlertTriangle as AlertIcon, RotateCcw,
  CarFront, MapPin, Gauge, Check
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
import { COUNTRIES_CONFIG } from "@/types/pdd";
import { motion } from "framer-motion";
import { getImageUrl } from "@/utils/imageUtils";
import { loadTestProgress } from "@/utils/testStorage";
import { cn } from "@/lib/utils";

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
  status = 'idle',
  onClick
}: {
  number: number;
  status?: 'idle' | 'charging' | 'charged' | 'damaged';
  onClick: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 group shadow-lg",
        "border border-white/20 backdrop-blur-xl",
        "before:absolute before:inset-0 before:bg-[url('https://grainy-gradients.vercel.app/noise.svg')] before:opacity-[0.05] before:pointer-events-none",
        // Idle (Empty Plate)
        status === 'idle' && "bg-white/5 hover:bg-white/10 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
        // In Progress (Blue Infusion)
        status === 'charging' && "bg-blue-500/20 border-blue-500/40 animate-[pulse_4s_ease-in-out_infinite]",
        // Charged (Emerald Infusion)
        status === 'charged' && "bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]",
        // Damaged (Red/Warning Infusion)
        status === 'damaged' && "bg-rose-500/20 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-thin text-white tracking-tighter drop-shadow-sm select-none">
          {number}
        </span>
      </div>

      {/* Done Indicator */}
      {status === 'charged' && (
        <div className="absolute top-3 right-3 opacity-60">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
    </motion.div>
  );
};

const Tests = () => {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { language, t } = useLanguage();

  // Получаем выбранную страну из контекста
  const { selectedCountry } = usePDDContext();
  const countryData = COUNTRIES_CONFIG[selectedCountry];

  // Логирование для отладки
  if (import.meta.env.DEV) {
    console.log('[Tests] Страница загружена:', {
      selectedCountry,
      profileId,
    });
  }

  // ОПТИМИЗАЦИЯ: Используем React Query хуки вместо прямых запросов
  const { data: dbTopics = [], isLoading: topicsLoading } = useTopics();
  const { data: tickets = [], isLoading: ticketsLoading } = usePDDTickets(selectedCountry);
  const { data: userProgress = [] } = useUserProgress(profileId);
  const { data: challengeBankCount = 0 } = useChallengeBankCount(profileId);
  const { data: pddTopics = [] } = usePDDTopics(selectedCountry);

  const [randomQuestionCount, setRandomQuestionCount] = useState(20);
  const [hasSelectedCount, setHasSelectedCount] = useState(false);
  const [nonstopProgress, setNonstopProgress] = useState<{ answered: number; total: number } | null>(null);

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

  // --- Умный трекер для России ---
  const recommendedTicket = useMemo(() => {
    if (selectedCountry !== 'russia' || tickets.length === 0) return null;

    // 1. Ищем билет в процессе (не завершен, прогресс > 0)
    // Сортируем так, чтобы взять тот, где прогресс больше (последний активный)
    const inProgress = [...tickets].filter(t => !t.completed && t.progress > 0)
      .sort((a, b) => b.progress - a.progress)[0];

    if (inProgress) return { ...inProgress, type: 'continue' as const };

    // 2. Если нет в процессе, ищем первый не начатый
    const nextNew = tickets.find(t => !t.completed && t.progress === 0);
    if (nextNew) return { ...nextNew, type: 'next' as const };

    // 3. Если все билеты решены
    return { type: 'exam' as const, number: 0 };
  }, [tickets, selectedCountry]);

  const handleBannerClick = () => {
    if (selectedCountry !== 'russia') return;
    if (!recommendedTicket) return;

    if (recommendedTicket.type === 'exam') {
      navigate('/test/exam-russia');
    } else {
      const ticketId = (recommendedTicket as any).id || (recommendedTicket as any).number;
      navigate(`/learn/russia/ticket/${ticketId}`);
    }
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
        route: `/test/mastery${selectedCountry === 'russia' ? '?country=russia' : ''}`,
        gradient: "from-pink-600 to-rose-600",
      },
      {
        id: 5,
        title: t('testsPage.challengeBank'),
        description: t('testsPage.challengeBankDesc', { count: challengeBankCount }),
        icon: History,
        color: "primary",
        premium: false,
        difficulty: "Средняя",
        route: `/test/challenge-bank${selectedCountry === 'russia' ? '?country=russia' : ''}`,
        gradient: "from-purple-600 to-violet-600",
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
        route: `/test/hardest${selectedCountry === 'russia' ? '?country=russia' : ''}`,
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
          color: "warning",
          premium: false,
          difficulty: "Сложная",
          route: "/test/nonstop",
          gradient: "from-amber-600 to-orange-600",
        },
      ] : []),
    ];

    return baseModes;
  }, [selectedCountry, randomQuestionCount, challengeBankCount, t]);

  const difficultyColors = {
    "Лёгкая": "success",
    "Средняя": "warning",
    "Сложная": "destructive",
  };

  return (
    <>
      <Layout>
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans pb-24 text-foreground">
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
                    {safeStats.errors} <span className="text-amber-600/70 dark:text-amber-300/70 font-normal">ошиб.</span>
                  </span>
                </div>
              </div>
            </div>

            {/* КОМАНДНЫЙ ЦЕНТР (Россия) или СЛУЧАЙНЫЙ ТЕСТ (Другие) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full overflow-hidden rounded-[2.5rem] shadow-2xl group cursor-pointer border border-white/10"
              style={{
                background: selectedCountry === 'russia'
                  ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                pointerEvents: 'auto',
                touchAction: 'manipulation'
              }}
              onClick={selectedCountry === 'russia' ? handleBannerClick : undefined}
            >
              {/* Noise texture */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                  {selectedCountry === 'russia' && recommendedTicket ? (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                          <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                          <span className="text-sm font-bold text-white uppercase tracking-wider">
                            {recommendedTicket.type === 'continue' ? 'Рекомендуем продолжить' :
                              recommendedTicket.type === 'next' ? 'Твой следующий шаг' : 'Время экзамена'}
                          </span>
                        </div>

                        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.9] drop-shadow-lg">
                          {recommendedTicket.type === 'continue' ? `БИЛЕТ №${recommendedTicket.number}` :
                            recommendedTicket.type === 'next' ? `БИЛЕТ №${recommendedTicket.number}` :
                              'ЭКЗАМЕН ГИБДД'}
                        </h2>

                        <p className="text-lg md:text-xl text-white/90 font-medium max-w-md leading-relaxed">
                          {recommendedTicket.type === 'continue' ?
                            `Вы остановились на середине пути. Пора дожать оставшиеся вопросы и закрыть этот билет!` :
                            recommendedTicket.type === 'next' ?
                              `Новый рубеж! Начните изучение следующего билета, чтобы стать еще на шаг ближе к правам.` :
                              `Вы изучили все билеты! Самое время проверить себя в условиях реального экзамена.`}
                        </p>
                      </div>

                      <button
                        className="group relative h-16 px-10 rounded-full bg-white text-indigo-600 font-black text-lg shadow-[0_10px_30px_rgba(255,255,255,0.3)] hover:shadow-[0_20px_40px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden w-fit"
                      >
                        <Play className="w-6 h-6 fill-indigo-600" />
                        <span>
                          {recommendedTicket.type === 'continue' ? 'Продолжить' :
                            recommendedTicket.type === 'next' ? 'Начать билет' : 'Начать экзамен'}
                        </span>
                        <ArrowRight className="w-6 h-6" />
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-indigo-100/50 to-transparent" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                        <Crown className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        <span className="text-sm font-bold text-white">Рекомендуется</span>
                      </div>
                      <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.9] drop-shadow-lg">
                        {t('testsPage.randomTest').toUpperCase()}
                      </h2>
                      <p className="text-lg md:text-xl text-white/90 font-medium max-w-md leading-relaxed">
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
                                className={`
                                  flex-1 px-6 py-3 rounded-xl font-bold text-base transition-all
                                  ${randomQuestionCount === count
                                    ? "bg-white text-indigo-600 shadow-lg shadow-white/30"
                                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                                  }
                                `}
                              >
                                {count}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {hasSelectedCount && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRandomTestStart();
                              }}
                              className="group relative h-16 px-10 rounded-full bg-white text-indigo-600 font-black text-lg shadow-[0_10px_30px_rgba(255,255,255,0.3)] hover:shadow-[0_20px_40px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden w-full"
                            >
                              <Play className="w-6 h-6 fill-indigo-600" />
                              <span>{t('testsPage.startButton')}</span>
                              <ArrowRight className="w-6 h-6" />
                              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-indigo-100/50 to-transparent" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Visual */}
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
                    className="relative z-10"
                  >
                    <div className="w-80 h-80 rounded-[3rem] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border border-white/30 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] transform rotate-6 group-hover:rotate-12 transition-transform duration-700">
                      {selectedCountry === 'russia' ? (
                        <CarFront className="w-40 h-40 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]" />
                      ) : (
                        <Shuffle className="w-40 h-40 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]" />
                      )}
                    </div>

                    {/* Floating elements */}
                    <div className="absolute -top-10 -right-10 p-5 rounded-3xl bg-gradient-to-br from-yellow-400/30 to-orange-500/30 backdrop-blur-xl border border-yellow-400/40 shadow-xl animate-bounce delay-700">
                      {selectedCountry === 'russia' ? (
                        <Gauge className="w-10 h-10 text-yellow-200" />
                      ) : (
                        <Target className="w-10 h-10 text-yellow-200" />
                      )}
                    </div>
                    <div className="absolute -bottom-5 -left-10 p-5 rounded-3xl bg-gradient-to-br from-cyan-400/30 to-blue-500/30 backdrop-blur-xl border border-cyan-400/40 shadow-xl animate-bounce delay-1000">
                      {selectedCountry === 'russia' ? (
                        <MapPin className="w-10 h-10 text-cyan-200" />
                      ) : (
                        <Zap className="w-10 h-10 text-cyan-200" />
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Other Test Modes Grid - Dashboard Style */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-card border border-border">
                  <Gamepad2 className="w-6 h-6 text-indigo-400" />
                </div>
                Другие режимы
              </h3>

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
                  }> = {
                    primary: {
                      base: 'violet',
                      border: 'hover:border-violet-500/50',
                      shadow: 'hover:shadow-violet-500/10',
                      iconBg: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30 shadow-violet-500/10',
                      icon: 'text-violet-400',
                      titleHover: 'group-hover:text-violet-300',
                      gradient: 'from-violet-500/5'
                    },
                    secondary: {
                      base: 'blue',
                      border: 'hover:border-blue-500/50',
                      shadow: 'hover:shadow-blue-500/10',
                      iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 shadow-blue-500/10',
                      icon: 'text-blue-400',
                      titleHover: 'group-hover:text-blue-300',
                      gradient: 'from-blue-500/5'
                    },
                    success: {
                      base: 'emerald',
                      border: 'hover:border-emerald-500/50',
                      shadow: 'hover:shadow-emerald-500/10',
                      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 shadow-emerald-500/10',
                      icon: 'text-emerald-400',
                      titleHover: 'group-hover:text-emerald-300',
                      gradient: 'from-emerald-500/5'
                    },
                    warning: {
                      base: 'amber',
                      border: 'hover:border-amber-500/50',
                      shadow: 'hover:shadow-amber-500/10',
                      iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 shadow-amber-500/10',
                      icon: 'text-amber-400',
                      titleHover: 'group-hover:text-amber-300',
                      gradient: 'from-amber-500/5'
                    },
                    destructive: {
                      base: 'red',
                      border: 'hover:border-red-500/50',
                      shadow: 'hover:shadow-red-500/10',
                      iconBg: 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 shadow-red-500/10',
                      icon: 'text-red-400',
                      titleHover: 'group-hover:text-red-300',
                      gradient: 'from-red-500/5'
                    },
                  };

                  const theme = colorMap[mode.color] || colorMap.primary;

                  return (
                    <motion.div
                      key={mode.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                      className={`
                        ${isFeatured ? 'md:col-span-2' : 'col-span-1'}
                        relative overflow-hidden rounded-[2rem] p-6 md:p-8 cursor-pointer group
                        bg-card/60 dark:bg-card/40 backdrop-blur-sm border border-border
                        ${theme.border} hover:bg-card/80 dark:hover:bg-card/60
                        shadow-lg hover:shadow-xl ${theme.shadow}
                        transition-colors duration-150
                        hover:-translate-y-1
                      `}
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
                          handleStartTest(mode.route);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {/* Subtle Gradient Background on Hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div className="flex justify-between items-start">
                          {/* Icon Container - Dashboard Style */}
                          <div className={`
                              w-14 h-14 rounded-2xl 
                              ${theme.iconBg}
                              flex items-center justify-center
                              group-hover:scale-110 transition-transform duration-300
                           `}>
                            <Icon className={`w-7 h-7 ${theme.icon}`} />
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="border-border text-muted-foreground bg-card/50">
                              {mode.difficulty}
                            </Badge>
                            {mode.badge && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-semibold">
                                {mode.badge}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className={`text-2xl font-bold text-foreground mb-2 tracking-tight ${theme.titleHover} transition-colors`}>
                            {mode.title}
                          </h3>
                          <p className="text-muted-foreground font-medium text-sm leading-relaxed">
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
            </div>

            {/* Topics Section (для Испании) или Билеты (для России) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-card border border-border">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                  </div>
                  {selectedCountry === 'russia' ? 'Билеты ПДД' : t('testsPage.topicsTitle')}
                </h3>
                <Badge className="text-sm md:text-base px-3 md:px-4 py-1 md:py-2 font-bold bg-card border border-border">
                  {selectedCountry === 'russia' ? tickets.length : topics.length}
                </Badge>
              </div>

              {/* Для России: показываем билеты в Vision OS Grid */}
              {selectedCountry === 'russia' ? (
                <div className="space-y-8 p-0">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
                    {tickets.map((ticket, i) => {
                      const ticketId = typeof ticket.id === 'number' ? ticket.id : ticket.number;
                      const ticketNumber = ticket.metadata?.ticket_number || ticket.number;

                      // Расширенная логика статусов
                      let status: 'idle' | 'charging' | 'charged' | 'damaged' = 'idle';
                      const progress = ticket.progress || 0;

                      if (ticket.completed) {
                        status = (ticket.score && ticket.score >= 100) ? 'charged' : 'damaged';
                      } else if (progress > 0) {
                        status = 'charging';
                      }

                      return (
                        <TicketCore
                          key={ticket.id}
                          number={ticketNumber}
                          status={status}
                          onClick={() => navigate(`/learn/${selectedCountry}/ticket/${ticketId}`)}
                        />
                      );
                    })}
                  </div>

                  {/* Legend - Vision OS Style */}
                  <div className="flex flex-wrap items-center gap-8 p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl mx-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-sm font-light text-white/70 tracking-wide">Сдано идеально</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      </div>
                      <span className="text-sm font-light text-white/70 tracking-wide">В процессе</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                      <span className="text-sm font-light text-white/70 tracking-wide">Не начато</span>
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
              )}
            </motion.div>

          </div>
        </div>
      </Layout>
    </>
  );
};

export default Tests;
