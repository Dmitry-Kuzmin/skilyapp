import { useState, useEffect } from "react";
import { Swords, Zap, CreditCard, Puzzle, Languages, Shield, Flag, TrendingUp, Crown, Trophy, Brain, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { getStudiedTermsCount } from "@/lib/termProgress";
import { usePremium } from "@/hooks/usePremium";
import { PaywallModal } from "@/components/monetization/PaywallModal";
import { TermProgressModal } from "@/components/TermProgressModal";
import { BoostShopModal } from "@/components/shop/BoostShopModal";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface GamesStats {
  gamesPlayed: number;
  studiedTerms: number;
  averageResult: number;
}

const Games = () => {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [stats, setStats] = useState<GamesStats>({
    gamesPlayed: 0,
    studiedTerms: 0,
    averageResult: 0,
  });
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isBoostShopOpen, setIsBoostShopOpen] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (profileId) {
      // Добавляем небольшую задержку, чтобы избежать частых запросов
      const timer = setTimeout(() => {
        loadStats();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsLoadingStats(false);
    }
  }, [profileId]);

  // Обновляем статистику при возврате на страницу (visibility change)
  useEffect(() => {
    if (!profileId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const loadStats = async () => {
    if (!profileId) return;
    try {
      setIsLoadingStats(true);

      // Загружаем данные параллельно
      const [gamesPlayed, studiedTermsCount, averageResult] = await Promise.all([
        loadGamesPlayed(),
        loadStudiedTermsCount(),
        loadAverageResult(),
      ]);

      setStats({
        gamesPlayed,
        studiedTerms: studiedTermsCount,
        averageResult,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadGamesPlayed = async (): Promise<number> => {
    if (!profileId) return 0;
    try {
      const { count, error } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId);

      if (error) {
        console.error('Error loading games played:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error loading games played:', error);
      return 0;
    }
  };

  const loadStudiedTermsCount = async (): Promise<number> => {
    if (!profileId) return 0;
    try {
      const count = await getStudiedTermsCount(profileId);
      return count;
    } catch (error) {
      console.error('Error loading studied terms count:', error);
      return 0;
    }
  };

  const loadAverageResult = async (): Promise<number> => {
    if (!profileId) return 0;
    try {
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('score, total_questions')
        .eq('user_id', profileId)
        .not('total_questions', 'is', null)
        .gt('total_questions', 0);

      if (error) {
        console.error('Error loading average result:', error);
        return 0;
      }

      if (!sessions || sessions.length === 0) {
        return 0;
      }

      // Вычисляем средний процент правильных ответов
      let totalPercentage = 0;
      let validSessions = 0;

      (sessions as Array<{ score: number; total_questions: number }>).forEach((session) => {
        if (session.total_questions > 0) {
          const percentage = (session.score / session.total_questions) * 100;
          totalPercentage += percentage;
          validSessions++;
        }
      });

      return validSessions > 0 ? Math.round(totalPercentage / validSessions) : 0;
    } catch (error) {
      console.error('Error loading average result:', error);
      return 0;
    }
  };

  const games = [
    {
      id: 1,
      title: "Дуэль с другом",
      description: "Соревнуйся с другом или ботом на знание ПДД",
      icon: Swords,
      color: "primary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/duel",
      featured: true,
      gradient: "from-violet-600 via-purple-600 to-indigo-600",
    },
    {
      id: 2,
      title: "Гонка",
      description: "Переведи максимум слов за ограниченное время",
      icon: Zap,
      color: "secondary",
      premium: false,
      difficulty: "Лёгкая",
      route: "/games/race",
      featured: true,
      gradient: "from-cyan-600 via-blue-600 to-indigo-600",
    },
    {
      id: 3,
      title: "Флэш-карточки",
      description: "Классический метод изучения с карточками",
      icon: CreditCard,
      color: "success",
      premium: false,
      difficulty: "Лёгкая",
      route: "/games/flashcards",
      gradient: "from-emerald-600 to-teal-600",
    },
    {
      id: 4,
      title: "Сопоставление",
      description: "Соедини испанские термины с русскими переводами",
      icon: Puzzle,
      color: "primary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/matching",
      gradient: "from-orange-600 to-pink-600",
    },
    {
      id: 6,
      title: "Четыре варианта",
      description: "Выбери правильный перевод термина из четырех вариантов",
      icon: Languages,
      color: "success",
      premium: false,
      difficulty: "Средняя",
      route: "/games/four-variants",
      gradient: "from-yellow-600 to-orange-600",
    },
    {
      id: 8,
      title: "Угадай Знак",
      description: "Проверь свои знания дорожных знаков в премиум игре",
      icon: Shield,
      color: "secondary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/guess-sign",
      gradient: "from-rose-600 to-red-600",
    },
    {
      id: 9,
      title: "Дорожная Гонка",
      description: "Марафон тестов в формате гонки по трассе Испании",
      icon: Flag,
      color: "primary",
      premium: false,
      difficulty: "Сложная",
      route: "/games/road-race",
      gradient: "from-blue-600 to-cyan-600",
    },
  ];

  const difficultyColors = {
    "Лёгкая": "success",
    "Средняя": "warning",
    "Сложная": "destructive",
  };

  return (
    <>
      <Layout>
        <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
          {/* Hero Section - Компактный лаконичный баннер */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border px-6 py-8 md:px-10 md:py-10 text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.4)]"
          >
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                {/* Левая часть */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 backdrop-blur-sm">
                      <Gamepad2 className="w-7 h-7 md:w-8 md:h-8 text-cyan-400" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">
                        Игры
                      </h1>
                      <p className="text-sm md:text-base text-slate-300 mt-1 font-medium">
                        Учись играя, побеждай знаниями
                      </p>
                    </div>
                  </div>

                  {/* Статистика в одну строку */}
                  <div className="flex items-center gap-5 md:gap-8 text-sm md:text-base">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white">{stats.gamesPlayed}</span>
                      <span className="text-slate-400">игр</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white">{stats.studiedTerms}</span>
                      <span className="text-slate-400">терминов</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white">{stats.averageResult}%</span>
                      <span className="text-slate-400">результат</span>
                    </div>
                  </div>
                </div>

                {/* Правая часть: Premium кнопка */}
                {!isPremium && (
                  <Button
                    size="lg"
                    onClick={() => setPaywallOpen(true)}
                    className="w-full md:w-auto relative group bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 active:scale-95 text-white font-bold px-8 py-6 text-base overflow-hidden"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <Crown className="w-5 h-5 mr-2 relative z-10" />
                    <span className="relative z-10">Получить Premium</span>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {games.map((game, index) => {
              const isFeatured = game.featured;
              const Icon = game.icon;

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className={`
                  ${isFeatured ? 'md:col-span-1 lg:col-span-2 lg:row-span-2' : 'md:col-span-1 lg:col-span-1'}
                  relative overflow - hidden rounded - 3xl p - 6 md: p - 8 cursor - pointer group
bg - gradient - to - br ${game.gradient}
shadow - 2xl hover: shadow - 3xl
transition - all duration - 500
hover: scale - [1.02] active: scale - [0.98]
                  border border - white / 10
  `}
                  onClick={() => {
                    if (game.premium && !isPremium) {
                      setPaywallOpen(true);
                    } else if (game.route) {
                      navigate(game.route);
                    }
                  }}
                >
                  {/* Noise texture */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  {/* Premium badge */}
                  {game.premium && (
                    <div className="absolute top-4 right-4 z-20">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none font-bold shadow-lg">
                        Premium
                      </Badge>
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    {/* Top: Icon and badge */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className={`
                        ${isFeatured ? 'w-16 h-16 md:w-20 md:h-20' : 'w-14 h-14'}
flex - shrink - 0 rounded - 2xl bg - white / 20 backdrop - blur - sm border border - white / 30
                        flex items - center justify - center
group - hover: scale - 110 group - hover: rotate - 6
transition - all duration - 500
shadow - xl
  `}>
                          <Icon className={`${isFeatured ? 'w-8 h-8 md:w-10 md:h-10' : 'w-7 h-7'} text - white`} />
                        </div>

                        <Badge
                          variant="outline"
                          className="bg-white/10 backdrop-blur-sm border-white/30 text-white text-xs font-bold"
                        >
                          {game.difficulty}
                        </Badge>
                      </div>

                      {/* Title and description */}
                      <div className="space-y-2">
                        <h3 className={`
                        ${isFeatured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}
font - black text - white tracking - tight
group - hover: text - white / 90
transition - colors duration - 300
  `}>
                          {game.title}
                        </h3>
                        <p className={`
                        ${isFeatured ? 'text-base' : 'text-sm'}
text - white / 80 font - medium
                        ${isFeatured ? 'line-clamp-3' : 'line-clamp-2'}
`}>
                          {game.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Button */}
                    <div className="mt-6">
                      <Button
                        className={`
w - full
bg - white / 20 hover: bg - white / 30
backdrop - blur - sm
border - 2 border - white / 40 hover: border - white / 60
text - white font - bold
shadow - xl hover: shadow - 2xl
transition - all duration - 300
group - hover: scale - 105
                        ${isFeatured ? 'py-6 text-base' : 'py-5 text-sm'}
`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (game.premium && !isPremium) {
                            setPaywallOpen(true);
                          } else if (game.route) {
                            navigate(game.route);
                          }
                        }}
                      >
                        {game.premium && !isPremium ? "Разблокировать Premium" : "Играть"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Stats Card - переработанная */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 md:p-8 shadow-2xl"
          >
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

            <div className="relative z-10">
              {isLoadingStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-12 bg-slate-700/30 rounded-xl animate-pulse mx-auto w-20" />
                      <div className="h-4 bg-slate-700/20 rounded animate-pulse mx-auto w-28" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Игр сыграно */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/20"
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Swords className="w-6 h-6 text-violet-400" />
                      <motion.p
                        key={stats.gamesPlayed}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-4xl font-black text-violet-400"
                      >
                        {stats.gamesPlayed}
                      </motion.p>
                    </div>
                    <p className="text-sm text-slate-300 font-semibold">Игр сыграно</p>
                  </motion.div>

                  {/* Терминов изучено */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer text-center p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 group"
                    onClick={() => setIsProgressModalOpen(true)}
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <TrendingUp className="w-6 h-6 text-amber-400" />
                      <motion.p
                        key={stats.studiedTerms}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-4xl font-black text-amber-400"
                      >
                        {stats.studiedTerms}
                      </motion.p>
                    </div>
                    <p className="text-sm text-slate-300 font-semibold">Терминов изучено</p>
                    <p className="text-xs text-cyan-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Нажмите для деталей
                    </p>
                  </motion.div>

                  {/* Средний результат */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className={`w-4 h-4 rounded-full ${stats.averageResult >= 80 ? 'bg-emerald-500' :
                          stats.averageResult >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                        }`} />
                      <motion.p
                        key={stats.averageResult}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className={`text-4xl font-black ${stats.averageResult >= 80 ? 'text-emerald-400' :
                            stats.averageResult >= 60 ? 'text-yellow-400' :
                              'text-red-400'
                          }`}
                      >
                        {stats.averageResult}%
                      </motion.p>
                    </div>
                    <p className="text-sm text-slate-300 font-semibold">Средний результат</p>
                    {stats.averageResult > 0 && (
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        {stats.averageResult >= 80 ? 'Отлично!' :
                          stats.averageResult >= 60 ? 'Хорошо' :
                            'Продолжай тренироваться'}
                      </p>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Term Progress Modal */}
        <TermProgressModal
          open={isProgressModalOpen}
          onOpenChange={setIsProgressModalOpen}
        />

        {/* Boost Shop Modal */}
        <BoostShopModal
          open={isBoostShopOpen}
          onOpenChange={setIsBoostShopOpen}
        />
      </Layout>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
};

export default Games;
