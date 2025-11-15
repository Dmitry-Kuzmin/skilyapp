import { Target, Zap, Trophy, Gift, BookOpen, Clock, Flame, Sparkles, Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { DuelPassProgress } from "@/components/monetization/DuelPassProgress";

const Index = () => {
  const { isAuthenticated, profileId } = useUserContext();
  const { toast } = useToast();
  const { isPremium, isTrial, daysRemaining } = usePremium();
  const { balance } = useCoins();
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

  return (
    <>
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Welcome Section */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse-slow">
            Добро пожаловать в Sdadim!
          </h1>
          <p className="text-muted-foreground text-lg">
            Готовься к экзамену DGT с удовольствием
          </p>
        </div>

        {/* Lumi Search Widget */}
        <LumiSearchWidget />

        {/* Rank Progress */}
        {!loading && (
          <RankProgress
            currentRank={userStats.rank}
            currentXP={userStats.xp}
            nextRankXP={userStats.nextRankXP}
            coins={balance}
          />
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Статус</p>
                <p className="text-lg font-semibold">
                  {isPremium ? "Premium активен" : isTrial ? "Пробный период" : "Бесплатный доступ"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setPaywallOpen(true)}>
                <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                Получить Premium
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Premium открывает все режимы тестов, ускоряет монеты и отключает рекламу.
            </p>
          </Card>
          <DuelPassProgress />
        </div>

        {/* Exam Readiness Widget */}
        {!loading && profileId && (
          <ExamReadinessWidget />
        )}

        {/* Daily Bonus - Road Journey */}
        {!loading && dailyBonus && (
          <Card className="p-4 md:p-6 gradient-card border-2 border-primary/20 relative overflow-hidden group hover:border-primary/30 transition-all">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            
            <div className="relative space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-slow">
                    <Zap className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Путь водителя 🚗
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
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
              <Link to="/daily-bonus" className="block">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary">
                  Посмотреть все награды →
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            icon={<Target className="w-6 h-6 text-primary-foreground" />}
            label="Точность"
            value={`${userStats.accuracy}%`}
            trend="+3% за неделю"
          />
          <StatsCard
            icon={<BookOpen className="w-6 h-6 text-primary-foreground" />}
            label="Тестов пройдено"
            value={userStats.testsCompleted}
            trend="+2 за сегодня"
          />
          <StatsCard
            icon={<Clock className="w-6 h-6 text-primary-foreground" />}
            label="Серия дней"
            value={`${userStats.streak} дней`}
            trend="Продолжай!"
          />
        </div>

        {/* Daily Tasks */}
        {!loading && dailyTasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Ежедневные задания</h2>
              <span className="text-sm text-muted-foreground">
                {dailyTasks.filter(t => t.completed).length} / {dailyTasks.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dailyTasks.map((task) => {
                const isCompleted = task.completed;
                const progressPercent = (task.progress / task.max_progress) * 100;

              return (
                <Card
                  key={task.id}
                  className={`p-4 gradient-card border transition-all duration-300 hover:scale-105 ${
                    isCompleted ? "border-success/50" : "border-border/50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold">{task.title}</h4>
                      {isCompleted && (
                        <Trophy className="w-5 h-5 text-success animate-bounce-slow" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {task.progress} / {task.max_progress}
                        </span>
                        <span className="text-gold font-semibold">+{task.reward} 💰</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? "bg-success" : "gradient-primary"
                          }`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue Learning */}
        <Card className="p-6 gradient-card border-primary/30 hover:border-primary/50 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                Продолжить обучение
              </h3>
              <p className="text-muted-foreground">
                Тест: Скорость и дистанция • Вопрос 7/30
              </p>
              <div className="h-2 bg-muted rounded-full overflow-hidden w-64">
                <div className="h-full gradient-primary w-1/4" />
              </div>
            </div>
            <Button size="lg" className="shadow-primary">
              Продолжить
            </Button>
          </div>
        </Card>

        {/* Achievements */}
        {!loading && recentAchievements.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Достижения</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/achievements">Все достижения →</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentAchievements.map((achievement) => (
                <AchievementCard 
                  key={achievement.id}
                  title={achievement.title}
                  description={achievement.description}
                  unlocked={achievement.unlocked}
                  progress={achievement.progress}
                  maxProgress={achievement.max_progress}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
    <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
};

export default Index;
