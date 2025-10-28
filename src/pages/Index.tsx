import { Target, Zap, Trophy, Gift, BookOpen, Clock, Flame, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import RankProgress from "@/components/RankProgress";
import StatsCard from "@/components/StatsCard";
import AchievementCard from "@/components/AchievementCard";
import { AISearchWidget } from "@/components/AISearchWidget";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Landing from "./Landing";

const Index = () => {
  const { isAuthenticated, profileId } = useUserContext();
  const { toast } = useToast();
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

  useEffect(() => {
    if (isAuthenticated && profileId) {
      console.log('[Index] Loading data for profile:', profileId);
      loadUserData();
    } else {
      console.log('[Index] Not loading data - authenticated:', isAuthenticated, 'profileId:', profileId);
      setLoading(false);
    }
  }, [isAuthenticated, profileId]);

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

        // Загружаем еженедельные награды
        const { data: rewards } = await (supabase as any)
          .from('daily_bonus_def')
          .select('*')
          .order('day_number', { ascending: true });

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
      
      // Вычисляем новый стрик
      let newStreak = 1;
      if (dailyBonus.last_claimed_date === yesterday) {
        newStreak = (dailyBonus.current_streak % 7) + 1;
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

      // Обновляем профиль с наградами
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          xp: userStats.xp + currentReward.reward.xp,
          coins: userStats.coins + currentReward.reward.coins,
        })
        .eq('id', profileId);

      if (profileError) throw profileError;

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

      if (newStreak === 7) {
        setTimeout(() => {
          toast({
            title: "🏆 Недельный герой!",
            description: "Ты завершил недельную серию! Так держать!",
            duration: 5000,
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

        {/* AI Search Widget */}
        <AISearchWidget />

        {/* Rank Progress */}
        {!loading && (
          <RankProgress
            currentRank={userStats.rank}
            currentXP={userStats.xp}
            nextRankXP={userStats.nextRankXP}
            coins={userStats.coins}
          />
        )}

        {/* Daily Bonus - Compact & Modern */}
        {!loading && dailyBonus && (
          <Card className="p-4 md:p-5 gradient-card border-2 border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-all">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-gold/5 pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative space-y-4">
              {/* Header with streak */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    <Gift className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Ежедневный бонус</h3>
                    <p className="text-xs text-muted-foreground">
                      {canClaimBonus ? 'Забери награду сегодня!' : 'Возвращайся завтра'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-bold text-sm">{dailyBonus.current_streak || 0}</span>
                </div>
              </div>

              {/* Mini calendar with rewards */}
              <div className="grid grid-cols-7 gap-1.5">
                {weeklyRewards.map((reward) => {
                  const isCompleted = (dailyBonus.current_streak || 0) >= reward.day_number;
                  const isCurrent = canClaimBonus && ((dailyBonus.current_streak % 7) + 1) === reward.day_number;
                  
                  return (
                    <div
                      key={reward.day_number}
                      className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all ${
                        isCompleted ? 'bg-primary/20 border-primary shadow-sm' :
                        isCurrent ? 'bg-gradient-to-br from-primary/30 to-gold/20 border-primary shadow-md animate-pulse' :
                        'bg-muted/30 border-border/30'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-muted-foreground mb-0.5">
                        {reward.day_number}
                      </div>
                      {isCompleted ? (
                        <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                      ) : isCurrent ? (
                        <Gift className="w-3 h-3 text-primary animate-bounce" />
                      ) : (
                        <div className="text-[8px] text-center leading-tight">
                          {reward.reward.xp > 0 && <div className="text-primary">+{reward.reward.xp}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Claim button */}
              <Button
                onClick={handleClaimBonus}
                disabled={!canClaimBonus || claimingBonus}
                className="w-full h-11 font-bold relative overflow-hidden group"
                variant={canClaimBonus ? "default" : "secondary"}
              >
                {claimingBonus ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Получение...
                  </>
                ) : canClaimBonus ? (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Забрать +{weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak % 7) + 1))?.reward.xp || 0} XP
                    {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak % 7) + 1))?.reward.coins > 0 && (
                      <span className="ml-1">+ {weeklyRewards.find(r => r.day_number === ((dailyBonus.current_streak % 7) + 1))?.reward.coins} 🪙</span>
                    )}
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Возвращайся завтра
                  </>
                )}
              </Button>
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
  );
};

export default Index;
