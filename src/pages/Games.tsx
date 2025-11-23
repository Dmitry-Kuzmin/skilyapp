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
        <div className="container mx-auto px-4 py-4 md:py-8 space-y-8 pb-20 md:pb-4">

          {/* Page Header - Compact */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Игровая зона
              </h1>
              <p className="text-slate-400 font-medium">
                Выбирай режим и прокачивай навыки
              </p>
            </div>

            {/* Stats Compact */}
            <div className="flex items-center gap-4 bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-white">{stats.gamesPlayed}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-500" />
                <span className="font-bold text-white">{stats.studiedTerms}</span>
              </div>
            </div>
          </div>

          {/* DUEL HERO CARD - MAIN FEATURE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 shadow-[0_0_60px_rgba(139,92,246,0.4)] border border-violet-400/30 group cursor-pointer"
            onClick={() => navigate('/games/duel')}
          >
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

            {/* Animated Background Gradients */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/30 to-blue-600/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 px-4 py-1.5 text-sm font-bold shadow-lg">
                    👑 Главный режим
                  </Badge>
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.9]">
                    ДУЭЛЬ
                  </h2>
                  <p className="text-lg md:text-xl text-violet-100 font-medium max-w-md leading-relaxed">
                    Сразись с другом или случайным соперником в битве знаний. Ставки, рейтинг и слава ждут!
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="h-14 px-8 rounded-2xl bg-white text-violet-700 hover:bg-white/90 font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300 group/btn relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Swords className="w-6 h-6" />
                      ИГРАТЬ СЕЙЧАС
                    </span>
                    {/* Shimmer */}
                    <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-violet-200/50 to-transparent" />
                  </Button>

                  <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 border-2 border-purple-600" />
                      ))}
                    </div>
                    <span className="text-white font-bold text-sm">
                      124 игрока онлайн
                    </span>
                  </div>
                </div>
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
                  <div className="w-80 h-80 rounded-[3rem] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl transform rotate-6 group-hover:rotate-12 transition-transform duration-700">
                    <Swords className="w-40 h-40 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
                  </div>

                  {/* Floating elements */}
                  <div className="absolute -top-10 -right-10 p-4 rounded-2xl bg-yellow-500/20 backdrop-blur-xl border border-yellow-500/30 shadow-xl animate-bounce delay-700">
                    <Trophy className="w-12 h-12 text-yellow-400" />
                  </div>
                  <div className="absolute -bottom-5 -left-10 p-4 rounded-2xl bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30 shadow-xl animate-bounce delay-1000">
                    <Zap className="w-10 h-10 text-cyan-400" />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Other Games Grid */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-slate-400" />
              Другие режимы
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {games.filter(g => g.id !== 1).map((game, index) => {
                const Icon = game.icon;
                // Race is still featured but smaller than Duel
                const isFeatured = game.id === 2;

                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                    className={`
                      ${isFeatured ? 'md:col-span-2' : 'col-span-1'}
                      relative overflow-hidden rounded-3xl p-6 md:p-8 cursor-pointer group
                      bg-gradient-to-br ${game.gradient}
                      shadow-lg hover:shadow-2xl hover:shadow-${game.color}-500/20
                      transition-all duration-500
                      hover:scale-[1.02] active:scale-[0.98]
                      border border-white/10
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
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Premium badge */}
                    {game.premium && (
                      <div className="absolute top-4 right-4 z-20">
                        <Badge className="bg-black/50 backdrop-blur-md text-white border-none font-bold">
                          Premium
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                      <div className="flex justify-between items-start">
                        <div className={`
                            p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20
                            group-hover:scale-110 transition-transform duration-500
                         `}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white/90 bg-black/20 backdrop-blur-sm">
                          {game.difficulty}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                          {game.title}
                        </h3>
                        <p className="text-white/80 font-medium text-sm leading-relaxed">
                          {game.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </Layout>

      {/* Modals */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />

      <TermProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
      />

      <BoostShopModal
        isOpen={isBoostShopOpen}
        onClose={() => setIsBoostShopOpen(false)}
      />
    </>
  );
};

export default Games;
