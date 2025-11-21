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
import { SystemBootScreen } from "@/components/cockpit/SystemBootScreen";
import { DigitalCockpit } from "@/components/cockpit/DigitalCockpit";
import { useExamReadiness } from "@/hooks/useExamReadiness";

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
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [bootCompleted, setBootCompleted] = useState(false);

  // Get exam readiness
  const { readiness, metrics, loading: readinessLoading } = useExamReadiness(profileId);

  useEffect(() => {
    if (isAuthenticated && profileId) {
      console.log('[Index] Loading data for profile:', profileId);
      // Reset boot screen when user logs in
      setShowBootScreen(true);
      setBootCompleted(false);
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

  // Handle boot screen completion
  const handleBootComplete = () => {
    setShowBootScreen(false);
    setBootCompleted(true);
  };

  const handleStartTest = () => {
    navigate('/tests');
  };

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

  // Show System Boot Screen
  if (showBootScreen && isAuthenticated) {
    return (
      <>
        <SystemBootScreen onComplete={handleBootComplete} />
      </>
    );
  }

  // Show Digital Cockpit after boot
  const readinessPercent = readiness?.percent || 0;
  const accuracy = metrics?.accuracy ? Math.round(metrics.accuracy * 100) : userStats.accuracy;
  const overallProgress = metrics?.topicsCovered ? Math.round(metrics.topicsCovered * 100) : Math.round(progressPercent);

  return (
    <>
      <Layout>
        <DigitalCockpit
          readinessPercent={readinessPercent}
          accuracy={accuracy}
          testsCompleted={userStats.testsCompleted}
          streak={userStats.streak}
          coins={balance || userStats.coins}
          dailyTasks={dailyTasks.map(task => ({
            id: task.id,
            title: task.title || task.description || 'Задание',
            completed: task.completed || false,
            progress: task.progress || undefined,
          }))}
          onStartTest={handleStartTest}
          currentTopic={undefined}
          progress={overallProgress}
          profileId={profileId}
        />
        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      </Layout>
    </>
  );
};

export default Index;
