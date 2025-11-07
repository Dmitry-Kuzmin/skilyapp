import { useState, useEffect } from "react";
import { Swords, Zap, CreditCard, Puzzle, Languages, Shield, Flag, ShoppingBag, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { getStudiedTermsCount } from "@/lib/termProgress";
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

      sessions.forEach(session => {
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
    },
    {
      id: 3,
      title: "Флэш-карточки",
      description: "Классический метод изучения с карточками",
      icon: CreditCard,
      color: "success",
      premium: false,
      difficulty: "Лёгкая",
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
    },
  ];

  const difficultyColors = {
    "Лёгкая": "success",
    "Средняя": "warning",
    "Сложная": "destructive",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-2 relative">
          <h1 className="text-4xl font-bold">Игры</h1>
          <p className="text-muted-foreground text-lg">
            Учись играя! Закрепляй термины в увлекательном формате
          </p>
        </div>

        {/* Premium Notice */}
        <Card className="p-4 md:p-6 gradient-card border-gold/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl gradient-gold shrink-0">
                <Swords className="w-6 h-6 md:w-7 md:h-7 text-gold-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-bold">Безлимитный доступ к играм</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  В бесплатном режиме доступно 3 игры в день
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button 
                variant="outline" 
                size="lg" 
                className="shadow-sm w-full sm:w-auto"
                onClick={() => setIsBoostShopOpen(true)}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Магазин бустов
              </Button>
              <Button variant="gold" size="lg" className="shadow-glow w-full sm:w-auto shrink-0">
                Премиум за €9.99/мес
              </Button>
            </div>
          </div>
        </Card>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card
              key={game.id}
              className="p-6 gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-pointer group relative overflow-hidden"
            >
              {game.premium && (
                <Badge className="absolute top-4 right-4 gradient-gold border-none">
                  Premium
                </Badge>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-${game.color}/20 group-hover:bg-${game.color}/30 transition-colors`}>
                    <game.icon className={`w-7 h-7 text-${game.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                      {game.title}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs mt-1 border-${difficultyColors[game.difficulty as keyof typeof difficultyColors]}/50`}
                    >
                      {game.difficulty}
                    </Badge>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm min-h-[40px]">
                  {game.description}
                </p>

                <Button
                  className="w-full group-hover:shadow-primary"
                  variant={game.premium ? "outline" : "default"}
                  onClick={() => game.route ? navigate(game.route) : null}
                  disabled={!game.route}
                >
                  {game.premium ? "Разблокировать" : game.route ? "Играть" : "Скоро"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <Card className="p-6 gradient-card border-border/50 hover:border-primary/30 transition-all duration-300">
          {isLoadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-8 bg-muted/50 rounded-lg animate-pulse mx-auto w-16" />
                  <div className="h-4 bg-muted/30 rounded animate-pulse mx-auto w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Игр сыграно */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center p-4 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Swords className="w-5 h-5 text-primary" />
                  <motion.p
                    key={stats.gamesPlayed}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-3xl font-bold text-primary"
                  >
                    {stats.gamesPlayed}
                  </motion.p>
                </div>
                <p className="text-sm text-muted-foreground">Игр сыграно</p>
              </motion.div>

              {/* Терминов изучено */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer group text-center p-4 rounded-lg hover:bg-muted/50 transition-colors relative"
                onClick={() => setIsProgressModalOpen(true)}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-gold" />
                  <motion.p
                    key={stats.studiedTerms}
                    initial={{ scale: 1.2, color: "#fbbf24" }}
                    animate={{ scale: 1, color: "#fbbf24" }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-3xl font-bold text-gold"
                  >
                    {stats.studiedTerms}
                  </motion.p>
                </div>
                <p className="text-sm text-muted-foreground">Терминов изучено</p>
                <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Нажмите для деталей
                </p>
              </motion.div>

              {/* Средний результат */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center p-4 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    stats.averageResult >= 80 ? 'bg-success' : 
                    stats.averageResult >= 60 ? 'bg-warning' : 
                    'bg-destructive'
                  }`} />
                  <motion.p
                    key={stats.averageResult}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className={`text-3xl font-bold ${
                      stats.averageResult >= 80 ? 'text-success' : 
                      stats.averageResult >= 60 ? 'text-warning' : 
                      'text-destructive'
                    }`}
                  >
                    {stats.averageResult}%
                  </motion.p>
                </div>
                <p className="text-sm text-muted-foreground">Средний результат</p>
                {stats.averageResult > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.averageResult >= 80 ? 'Отлично!' : 
                     stats.averageResult >= 60 ? 'Хорошо' : 
                     'Продолжай тренироваться'}
                  </p>
                )}
              </motion.div>
            </div>
          )}
        </Card>

        {/* Daily Limit Info for Free Users */}
        <Card className="p-4 gradient-card border-primary/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Сегодня доступно: 2 / 3 игры</p>
              <p className="text-xs text-muted-foreground">
                Лимит обновится через 18 часов
              </p>
            </div>
          </div>
        </Card>
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
  );
};

export default Games;
