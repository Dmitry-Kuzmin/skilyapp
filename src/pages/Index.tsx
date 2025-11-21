import { Target, Zap, Trophy, Gift, BookOpen, Clock, Flame, Sparkles, Check, Crown, Infinity, Play, TrendingUp, Award, ArrowRight, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import RankProgress from "@/components/RankProgress";
import StatsCard from "@/components/StatsCard";
import AchievementCard from "@/components/AchievementCard";
import { LumiSearchWidget } from "@/components/lumi/LumiSearchWidget";
import { ExamReadinessWidget } from "@/components/ExamReadinessWidget";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Landing from "./Landing";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { PaywallModal } from "@/components/monetization/PaywallModal";

const Index = () => {
  const { isAuthenticated, profileId } = useUserContext();
  const { toast } = useToast();
  const { isPremium, isTrial, daysRemaining } = usePremium();
  const { balance } = useCoins();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    rank: "Ученик",
    xp: 0,
    nextRankXP: 5000,
    coins: 0,
    boosts: 0,
    testsCompleted: 0,
    accuracy: 0,
    streak: 0,
  });
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [dailyBonus, setDailyBonus] = useState<any>(null);
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [weeklyRewards, setWeeklyRewards] = useState<any[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && profileId) {
      console.log('[Index] Loading data for profile:', profileId);
      loadUserData();
    } else {
      console.log('[Index] Not loading data - authenticated:', isAuthenticated, 'profileId:', profileId);
      setLoading(false);
    }
  }, [isAuthenticated, profileId]);

  useEffect(() => {
    if (isTrial && daysRemaining <= 1) {
      setPaywallOpen(true);
    }
  }, [isTrial, daysRemaining]);

  const loadUserData = async () => {
    if (!profileId) {
      console.log('[Index] No profileId available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Index] Fetching profile data for ID:', profileId);

      // Получаем профиль пользователя
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError) {
        console.error('[Index] Profile fetch error:', profileError);
        throw profileError;
      }

      console.log('[Index] Profile loaded:', profile);

      if (profile) {
        // Получаем статистику тестов
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('user_id', profile.id);

        console.log('[Index] Sessions loaded:', sessions?.length);

        const testsCompleted = sessions?.length || 0;
        const totalQuestions = sessions?.reduce((acc, s) => acc + s.total_questions, 0) || 0;
        const correctAnswers = sessions?.reduce((acc, s) => acc + s.score, 0) || 0;
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        setUserStats({
          rank: profile.rank || "Ученик",
          xp: profile.xp || 0,
          nextRankXP: 5000,
          coins: profile.coins || 0,
          boosts: profile.boosts || 0,
          testsCompleted,
          accuracy,
          streak: profile.streak_days || 0,
        });

        // Получаем ежедневные задания
        const { data: tasks } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('user_id', profile.id)
          .eq('date', new Date().toISOString().split('T')[0]);

        console.log('[Index] Tasks loaded:', tasks?.length);
        setDailyTasks(tasks || []);

        // Получаем достижения
        const { data: achievements } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(4);

        console.log('[Index] Achievements loaded:', achievements?.length);
        setRecentAchievements(achievements || []);

        // Загружаем награды (первые 90 дней для отображения)
        const { data: rewards } = await (supabase as any)
          .from('daily_bonus_def')
          .select('*')
          .order('day_number', { ascending: true })
          .limit(90);

        if (rewards) {
          setWeeklyRewards(rewards);
        }

        // Загружаем данные ежедневного бонуса пользователя
        const { data: bonus } = await (supabase as any)
          .from('user_daily_bonus')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (bonus) {
          setDailyBonus(bonus);
          setCanClaimBonus(checkCanClaim(bonus.last_claimed_date));
        } else {
          // Создаем запись если её нет
          const { data: newBonus } = await (supabase as any)
            .from('user_daily_bonus')
            .insert({
              user_id: profile.id,
              current_streak: 0,
              total_claims: 0,
            })
            .select()
            .single();

          setDailyBonus(newBonus);
          setCanClaimBonus(true);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные пользователя",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCanClaim = (lastClaimedDate: string | null): boolean => {
    if (!lastClaimedDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return lastClaimedDate !== today;
  };

  const handleClaimBonus = async () => {
    if (!dailyBonus || !profileId) return;

    try {
      setClaimingBonus(true);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Вычисляем новый стрик (до 90 дней)
      let newStreak = 1;
      if (dailyBonus.last_claimed_date === yesterday) {
        newStreak = Math.min((dailyBonus.current_streak || 0) + 1, 90);
      }

      // Получаем награду текущего дня
      const currentReward = weeklyRewards.find(r => r.day_number === newStreak);
      if (!currentReward) throw new Error('Reward not found');

      // Обновляем user_daily_bonus
      const { error: bonusError } = await (supabase as any)
        .from('user_daily_bonus')
        .update({
          current_streak: newStreak,
          last_claimed_date: today,
          total_claims: dailyBonus.total_claims + 1,
        })
        .eq('id', dailyBonus.id);

      if (bonusError) throw bonusError;

      await supabase.functions.invoke('coins-earn', {
        body: { user_id: profileId, reward_type: 'daily_login' },
      });

      // Начисляем Season Points за ежедневный вход
      await supabase.functions.invoke('season-sp', {
        body: { 
          user_id: profileId, 
          source_type: 'daily_login',
          metadata: { streak_days: newStreak }
        },
      });

      const { data: xpData } = await supabase.functions.invoke('duel-pass-xp', {
        body: { user_id: profileId, source_type: 'daily_login' },
      });
      if (xpData?.level_up) {
        const { data: suggestion } = await supabase.functions.invoke('assistant-suggest', {
          body: { trigger: 'duel_pass_level_up' },
        });
        const message = suggestion?.suggestion?.message;
        if (message) {
          toast({
            title: "Duel Pass",
            description: message,
          });
        }
      }

      await supabase
        .from('profiles')
        .update({
          xp: userStats.xp + currentReward.reward.xp,
        })
        .eq('id', profileId);

      // Обновляем локальное состояние
      setDailyBonus({
        ...dailyBonus,
        current_streak: newStreak,
        last_claimed_date: today,
        total_claims: dailyBonus.total_claims + 1,
      });

      setUserStats({
        ...userStats,
        xp: userStats.xp + currentReward.reward.xp,
        coins: userStats.coins + currentReward.reward.coins,
      });

      setCanClaimBonus(false);

      toast({
        title: "🎉 Награда получена!",
        description: `+${currentReward.reward.xp} XP${currentReward.reward.coins > 0 ? `, +${currentReward.reward.coins} монет` : ""}`,
      });

      // Специальные уведомления для вех
      if (newStreak === 7) {
        setTimeout(() => {
          toast({
            title: "🏆 Недельный герой!",
            description: "Первая неделя позади! Так держать!",
            duration: 5000,
          });
        }, 2000);
      } else if (newStreak === 30) {
        setTimeout(() => {
          toast({
            title: "🔥 Месяц подряд!",
            description: "Невероятная настойчивость! Продолжай в том же духе!",
            duration: 5000,
          });
        }, 2000);
      } else if (newStreak === 60) {
        setTimeout(() => {
          toast({
            title: "⭐ Два месяца!",
            description: "Ты неостановим! Осталось совсем немного!",
            duration: 5000,
          });
        }, 2000);
      } else if (newStreak === 90) {
        setTimeout(() => {
          toast({
            title: "🏆 ЖЕЛЕЗНАЯ ВОЛЯ!",
            description: "90 дней подряд! Ты настоящий чемпион!",
            duration: 7000,
          });
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить награду",
        variant: "destructive",
      });
    } finally {
      setClaimingBonus(false);
    }
  };

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Calculate user segment for personalization
  const getUserSegment = () => {
    if (userStats.testsCompleted < 5) return 'beginner';
    if (userStats.testsCompleted < 20 || userStats.accuracy < 70) return 'intermediate';
    return 'advanced';
  };

  const userSegment = getUserSegment();
  const progressPercent = userStats.nextRankXP > 0 
    ? Math.min((userStats.xp / userStats.nextRankXP) * 100, 100) 
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <>
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 md:space-y-8"
          >
            {/* Ultra Modern Hero Banner - Full Width */}
            <motion.div variants={itemVariants}>
              <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-secondary/10 backdrop-blur-xl shadow-2xl">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
                
                <div className="relative p-6 md:p-10">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left: Welcome & Stats */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
                            {userSegment === 'beginner' && "Начни путь к успеху! 🚀"}
                            {userSegment === 'intermediate' && "Продолжай движение! 💪"}
                            {userSegment === 'advanced' && "Становись мастером! ⭐"}
                          </h1>
                          {isPremium && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-none px-3 py-1 text-sm shadow-lg">
                              <Crown className="w-4 h-4 mr-1.5" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm md:text-base">
                          {userSegment === 'beginner' && "Каждый тест приближает тебя к цели"}
                          {userSegment === 'intermediate' && "Твоя настойчивость окупается"}
                          {userSegment === 'advanced' && "Ты на пути к совершенству"}
                        </p>
                      </div>
                      
                      {/* Compact Stats */}
                      <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">{userStats.testsCompleted}</span>
                          <span className="text-xs text-muted-foreground">тестов</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold">{userStats.streak}</span>
                          <span className="text-xs text-muted-foreground">дней</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-semibold">{Math.round(progressPercent)}%</span>
                          <span className="text-xs text-muted-foreground">прогресс</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Main CTA */}
                    <div className="flex-shrink-0">
                      <Button
                        size="lg"
                        onClick={() => navigate('/tests')}
                        className="group relative w-full lg:w-auto px-8 py-6 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
                      >
                        <Play className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                        Начать тест
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Priority Section: Tasks + Daily Bonus + Progress (3 columns) */}
            {!loading && (
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  {/* Daily Tasks - Priority 1 */}
                  {dailyTasks.length > 0 && (
                    <Card className="p-5 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Target className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="text-lg font-bold">Задания</h3>
                        </div>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length}
                        </Badge>
                      </div>
                      <div className="space-y-2.5">
                        {dailyTasks.slice(0, 3).map((task, idx) => {
                          const isCompleted = task.completed;
                          const progressPercent = Math.min((task.progress / task.max_progress) * 100, 100);
                          
                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${
                                isCompleted 
                                  ? "bg-green-500/10 border-green-500/30 shadow-sm" 
                                  : "bg-card/50 border-border/50 hover:border-primary/30"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-sm font-semibold line-clamp-1 flex-1">{task.title}</p>
                                {isCompleted ? (
                                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                                ) : (
                                  <span className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">+{task.reward}💰</span>
                                )}
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPercent}%` }}
                                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                                  className={`h-full ${
                                    isCompleted ? "bg-green-500" : "bg-gradient-to-r from-primary to-secondary"
                                  }`}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                                <span>{task.progress}/{task.max_progress}</span>
                                <span className="font-medium">{Math.round(progressPercent)}%</span>
                              </div>
                            </motion.div>
                          );
                        })}
                        {dailyTasks.length > 3 && (
                          <Link to="/tasks">
                            <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                              Все задания <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Daily Bonus - Priority 2 */}
                  {dailyBonus && (
                    <Card className="p-5 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 backdrop-blur-xl border border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
                      <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg ${(dailyBonus.current_streak || 0) >= 7 ? 'animate-pulse' : ''}`}>
                              <Flame className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">Бонус</h3>
                              <p className="text-xs text-muted-foreground">Серия: {dailyBonus.current_streak || 0} дней</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`${
                            (dailyBonus.current_streak || 0) >= 7 ? 'border-orange-500/40 bg-orange-500/10' : ''
                          }`}>
                            <Flame className={`w-3 h-3 mr-1 ${(dailyBonus.current_streak || 0) >= 7 ? 'text-orange-500' : ''}`} />
                            {dailyBonus.current_streak || 0}
                          </Badge>
                        </div>

                        {canClaimBonus && weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1)) && (
                          <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                            <div className="text-xs text-muted-foreground mb-1.5">Награда сегодня:</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.xp > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  +{weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.xp} XP
                                </Badge>
                              )}
                              {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.coins > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.coins} 🪙
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={handleClaimBonus}
                            disabled={!canClaimBonus || claimingBonus}
                            size="lg"
                            className="w-full h-11 font-semibold"
                            variant={canClaimBonus ? "default" : "secondary"}
                          >
                            {claimingBonus ? (
                              <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Получение...
                              </>
                            ) : canClaimBonus ? (
                              <>
                                <Gift className="w-4 h-4 mr-2" />
                                Забрать награду
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 mr-2" />
                                Завтра
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </Card>
                  )}

                  {/* Progress Summary - Priority 3 */}
                  <Card className="p-5 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold">Прогресс</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Ранг</span>
                          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {userStats.rank}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-primary to-secondary"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                          <span>{userStats.xp.toLocaleString()} XP</span>
                          <span>До {userStats.nextRankXP.toLocaleString()} XP</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Монеты</span>
                          <span className="text-lg font-bold text-yellow-600 dark:text-yellow-500">
                            {balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Stats Overview - Compact Modern */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Точность</p>
                          <p className="text-xl font-bold">{userStats.accuracy}%</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">+3%</Badge>
                    </div>
                  </Card>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Тестов</p>
                          <p className="text-xl font-bold">{userStats.testsCompleted}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">+2</Badge>
                    </div>
                  </Card>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Flame className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Серия</p>
                          <p className="text-xl font-bold">{userStats.streak} дней</p>
                        </div>
                      </div>
                      <Star className="w-4 h-4 text-yellow-500" />
                    </div>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Progress Hub - Rank + Exam Readiness */}
            {!loading && (
              <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <RankProgress
                    currentRank={userStats.rank}
                    currentXP={userStats.xp}
                    nextRankXP={userStats.nextRankXP}
                    coins={balance}
                  />
                </motion.div>
                {profileId && (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExamReadinessWidget />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* AI Assistant */}
            <motion.div variants={itemVariants}>
              <LumiSearchWidget />
            </motion.div>

            {/* Weekly Road - Full Version */}
            {!loading && dailyBonus && (
              <motion.div variants={itemVariants}>
                <Card className="p-5 md:p-8 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl border-2 border-primary/20 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 shadow-2xl">
                  {/* Animated background elements */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
                  <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                  
                  <div className="relative space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform ${(dailyBonus.current_streak || 0) >= 7 ? 'animate-pulse' : ''}`}>
                          <Zap className="w-8 h-8 text-primary-foreground" strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                            Путь водителя 🚗
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Flame className={`w-4 h-4 ${(dailyBonus.current_streak || 0) >= 7 ? 'text-orange-500 animate-pulse' : 'text-orange-400'}`} />
                            <span className="font-semibold">{dailyBonus.current_streak || 0}</span> 
                            <span>из 90 дней</span>
                          </p>
                        </div>
                      </div>
                
                {/* Streak Badge */}
                <div className={`px-4 py-2 rounded-full border-2 ${
                  (dailyBonus.current_streak || 0) >= 30 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40' :
                  (dailyBonus.current_streak || 0) >= 7 ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/40' :
                  'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center gap-2">
                    <Flame className={`w-5 h-5 ${
                      (dailyBonus.current_streak || 0) >= 30 ? 'text-yellow-500' :
                      (dailyBonus.current_streak || 0) >= 7 ? 'text-orange-500' :
                      'text-muted-foreground'
                    } ${(dailyBonus.current_streak || 0) >= 7 ? 'animate-pulse' : ''}`} />
                    <span className="font-bold text-lg">{dailyBonus.current_streak || 0}</span>
                  </div>
                </div>
              </div>

              {/* Road Progress - Horizontal Scroll */}
              <div className="relative">
                <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                  <div className="flex gap-2 min-w-max px-1">
                    {weeklyRewards.slice(0, Math.min(14, weeklyRewards.length)).map((reward, idx) => {
                      const dayNum = reward.day_number;
                      const isCompleted = (dailyBonus.current_streak || 0) >= dayNum;
                      const isCurrent = canClaimBonus && ((dailyBonus.current_streak || 0) + 1) === dayNum;
                      const isSpecial = dayNum % 7 === 0;
                      const hasBoost = reward.reward.boost;
                      const hasBadge = reward.reward.badge;
                      
                      return (
                        <div
                          key={dayNum}
                          className={`relative flex flex-col items-center gap-1.5 ${isSpecial ? 'w-20' : 'w-16'}`}
                        >
                          {/* Day marker */}
                          <div className={`
                            ${isSpecial ? 'w-16 h-16' : 'w-12 h-12'}
                            rounded-2xl border-2 flex items-center justify-center relative transition-all duration-300
                            ${isCompleted ? 
                              'bg-gradient-to-br from-primary to-secondary border-primary shadow-lg shadow-primary/30 scale-105' :
                              isCurrent ? 
                              'bg-gradient-to-br from-primary/30 to-secondary/30 border-primary animate-pulse shadow-md' :
                              'bg-muted/30 border-border/50'
                            }
                          `}>
                            {/* Icon */}
                            {isCompleted ? (
                              <Check className={`${isSpecial ? 'w-8 h-8' : 'w-6 h-6'} text-primary-foreground`} strokeWidth={3} />
                            ) : isCurrent ? (
                              <>
                                {hasBadge ? (
                                  <Trophy className={`${isSpecial ? 'w-8 h-8' : 'w-6 h-6'} text-primary animate-bounce`} />
                                ) : hasBoost ? (
                                  <Zap className={`${isSpecial ? 'w-8 h-8' : 'w-6 h-6'} text-primary animate-pulse`} />
                                ) : (
                                  <Gift className={`${isSpecial ? 'w-8 h-8' : 'w-6 h-6'} text-primary animate-bounce`} />
                                )}
                              </>
                            ) : (
                              <div className={`text-center ${isSpecial ? 'text-xs' : 'text-[10px]'}`}>
                                {reward.reward.xp > 0 && <div className="font-bold text-primary">+{reward.reward.xp}</div>}
                                {reward.reward.coins > 0 && <div className="text-[8px] text-gold">+{reward.reward.coins}💰</div>}
                              </div>
                            )}
                            
                            {/* Special badge indicator */}
                            {hasBadge && !isCompleted && !isCurrent && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                                <Trophy className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          
                          {/* Day number */}
                          <div className={`text-[10px] font-bold ${isCompleted || isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                            День {dayNum}
                          </div>
                          
                          {/* Connecting line */}
                          {idx < Math.min(13, weeklyRewards.length - 1) && (
                            <div className={`absolute top-6 left-full w-2 h-0.5 ${
                              (dailyBonus.current_streak || 0) >= dayNum ? 'bg-primary' : 'bg-border'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Прогресс</span>
                    <span className="font-bold text-primary">{Math.round(((dailyBonus.current_streak || 0) / 90) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-500"
                      style={{ width: `${Math.min(((dailyBonus.current_streak || 0) / 90) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Reward preview & Claim button */}
              <div className="flex gap-3">
                <div className="flex-1 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-3 border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-1">Награда сегодня</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {canClaimBonus && weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1)) && (
                      <>
                        {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.xp > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-lg">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-sm font-bold">+{weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.xp} XP</span>
                          </div>
                        )}
                        {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.coins > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gold/20 rounded-lg">
                            <span className="text-sm font-bold">+{weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.coins} 🪙</span>
                          </div>
                        )}
                        {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.boost && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary/20 rounded-lg">
                            <Zap className="w-3 h-3 text-secondary" />
                            <span className="text-sm font-bold">Boost</span>
                          </div>
                        )}
                        {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak || 0) + 1))?.reward.badge && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gold/20 rounded-lg">
                            <Trophy className="w-3 h-3 text-gold" />
                            <span className="text-sm font-bold">Бейдж</span>
                          </div>
                        )}
                      </>
                    )}
                    {!canClaimBonus && <span className="text-sm text-muted-foreground">Возвращайся завтра</span>}
                  </div>
                </div>

                <Button
                  onClick={handleClaimBonus}
                  disabled={!canClaimBonus || claimingBonus}
                  size="lg"
                  className={`px-6 font-bold shadow-lg transition-all ${
                    canClaimBonus ? 'shadow-primary/30 hover:shadow-primary/50' : ''
                  }`}
                  variant={canClaimBonus ? "default" : "secondary"}
                >
                  {claimingBonus ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                      Получение...
                    </>
                  ) : canClaimBonus ? (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Забрать
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 mr-2" />
                      Завтра
                    </>
                  )}
                </Button>
              </div>

                      {/* Link to full page */}
                      <Link to="/daily-bonus" className="block mt-4">
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary">
                          Посмотреть все награды →
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              )}

            {/* Premium Benefits - Modern Design */}
            {!isPremium && (
              <motion.div variants={itemVariants}>
                <Card className="p-6 md:p-8 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-500/10 border-2 border-yellow-500/20 shadow-xl relative overflow-hidden">
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none" />
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
                  
                  <div className="relative space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                          <Crown className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                          <h3 className="text-xl md:text-2xl font-bold">Преимущества Premium</h3>
                          <p className="text-sm text-muted-foreground">Открой все возможности</p>
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button onClick={() => setPaywallOpen(true)} size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-500/90 hover:to-orange-500/90 text-white shadow-lg">
                          Получить Premium
                        </Button>
                      </motion.div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon: Infinity, title: "Безлимитный доступ", desc: "Ко всем тестам и играм", color: "text-primary" },
                        { icon: Zap, title: "Удвоенные награды", desc: "+50% монет за обучение", color: "text-yellow-500" },
                        { icon: Trophy, title: "Эксклюзивные награды", desc: "Дополнительные бонусы", color: "text-orange-500" },
                        { icon: Sparkles, title: "Без рекламы", desc: "Мгновенные подсказки", color: "text-blue-500" }
                      ].map((benefit, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.05, y: -4 }}
                          className="flex flex-col items-start gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-yellow-500/30 transition-all"
                        >
                          <benefit.icon className={`w-6 h-6 ${benefit.color} flex-shrink-0`} />
                          <div>
                            <p className="font-semibold text-sm mb-1">{benefit.title}</p>
                            <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Achievements - Modern Design */}
            {!loading && recentAchievements.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Достижения
                  </h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/achievements">Все достижения <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentAchievements.map((achievement, idx) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                    >
                      <AchievementCard 
                        title={achievement.title}
                        description={achievement.description}
                        unlocked={achievement.unlocked}
                        progress={achievement.progress}
                        maxProgress={achievement.max_progress}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
    <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
};

export default Index;
