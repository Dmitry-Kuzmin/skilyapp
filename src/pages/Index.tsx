import { Target, Zap, Trophy, Gift, BookOpen, Clock, Flame, Sparkles, Check, Crown, Infinity, Play, TrendingUp, Award, ArrowRight, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { WelcomeOverlay } from "@/components/dashboard-new/WelcomeOverlay";
import { Dashboard } from "@/components/dashboard-new/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard-new/DashboardSkeleton";
import { useExamReadiness } from "@/hooks/useExamReadiness";
import { useDashboardData } from "@/hooks/useDashboardData";

const Index = () => {
  const { isAuthenticated, profileId } = useUserContext();
  const { toast } = useToast();
  const { isPremium, isTrial, daysRemaining } = usePremium();
  const { balance } = useCoins();
  const navigate = useNavigate();
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  
  // Показываем прелоадер только при первом открытии приложения
  const [showWelcome, setShowWelcome] = useState(() => {
    // Проверяем, был ли уже показан прелоадер
    if (typeof window !== 'undefined') {
      const hasSeenWelcome = localStorage.getItem('has_seen_welcome');
      return !hasSeenWelcome; // Показываем только если еще не видели
    }
    return true;
  });

  // Get dashboard data with caching
  const { data: dashboardData, loading, error, refresh: refreshDashboard, invalidateCache } = useDashboardData();
  
  // Get exam readiness
  const { readiness, metrics, loading: readinessLoading } = useExamReadiness(profileId);

  useEffect(() => {
    if (isTrial && daysRemaining <= 1) {
      setPaywallOpen(true);
    }
  }, [isTrial, daysRemaining]);


  const handleClaimBonus = async () => {
    if (!dashboardData?.daily_bonus || !profileId) {
      console.error('[handleClaimBonus] Missing data:', { 
        hasDailyBonus: !!dashboardData?.daily_bonus, 
        profileId 
      });
      return;
    }

    try {
      setClaimingBonus(true);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const dailyBonus = dashboardData.daily_bonus;
      
      // Проверяем, можно ли получить награду
      if (!dailyBonus.can_claim) {
        toast({
          title: "Уже получено",
          description: "Сегодняшняя награда уже получена",
          variant: "default",
        });
        return;
      }
      
      // Вычисляем новый стрик (без ограничения, циклический расчет)
      let newStreak = 1;
      if (dailyBonus.last_claimed_date === yesterday) {
        // Продолжаем streak (без ограничения)
        newStreak = (dailyBonus.current_streak || 0) + 1;
      } else if (dailyBonus.last_claimed_date === today) {
        // Уже получено сегодня
        toast({
          title: "Уже получено",
          description: "Сегодняшняя награда уже получена",
          variant: "default",
        });
        return;
      }

      // Циклический расчет: день недели (1-7)
      // Если streak кратен 7, то день 7, иначе остаток от деления
      const weekDay = newStreak % 7 || 7;
      const weekNumber = Math.ceil(newStreak / 7);

      // Получаем награду по дню недели (циклический)
      const currentReward = dashboardData.weeklyRewards.find(r => r.day_number === weekDay);
      if (!currentReward) {
        console.error('[handleClaimBonus] Reward not found for streak:', newStreak);
        throw new Error('Reward not found');
      }

      // Обновляем или создаём user_daily_bonus
      let bonusUpdateError = null;
      if (dailyBonus.id) {
      const { error: bonusError } = await (supabase as any)
        .from('user_daily_bonus')
        .update({
          current_streak: newStreak,
          last_claimed_date: today,
            total_claims: (dailyBonus.total_claims || 0) + 1,
        })
        .eq('id', dailyBonus.id);

        bonusUpdateError = bonusError;
      } else {
        const { error: bonusError } = await (supabase as any)
          .from('user_daily_bonus')
          .insert({
            user_id: profileId,
            current_streak: newStreak,
            last_claimed_date: today,
            total_claims: 1,
          });

        bonusUpdateError = bonusError;
      }

      if (bonusUpdateError) {
        console.error('[handleClaimBonus] Error updating daily_bonus:', bonusUpdateError);
        throw bonusUpdateError;
      }

      // Обновляем XP и монеты сразу (без ожидания Edge Functions)
      const updateData: { xp?: number; coins?: number } = {};
      
      if (currentReward.reward.xp && currentReward.reward.xp > 0) {
        updateData.xp = (dashboardData.profile.xp || 0) + currentReward.reward.xp;
      }
      
      if (currentReward.reward.coins && currentReward.reward.coins > 0) {
        updateData.coins = (dashboardData.profile.coins || 0) + currentReward.reward.coins;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
        .from('profiles')
          .update(updateData)
        .eq('id', profileId);

        if (updateError) {
          console.error('[handleClaimBonus] Error updating profile:', updateError);
        // Не прерываем выполнение, продолжаем
        }
      }

      // Вызываем Edge Functions асинхронно (без ожидания - они могут быть медленными)
      // Продолжаем выполнение даже если функции не ответили
      Promise.allSettled([
        // УБРАНО: coins-earn - монеты теперь начисляются напрямую из daily_bonus_def
        // УБРАНО: duel-pass-xp - используем новую систему season-sp вместо старой
        supabase.functions.invoke('season-sp', {
        body: { 
          user_id: profileId, 
          source_type: 'daily_login',
          metadata: { streak_days: newStreak }
        },
        }).then(({ data: spData }) => {
          // Если был level up в Duel Pass, показываем уведомление
          if (spData?.level_up) {
            supabase.functions.invoke('assistant-suggest', {
          body: { trigger: 'duel_pass_level_up' },
            }).then(({ data: suggestion }) => {
        const message = suggestion?.suggestion?.message;
        if (message) {
          toast({
            title: "Duel Pass",
            description: message,
          });
        }
            }).catch(err => {
              console.warn('[handleClaimBonus] assistant-suggest error:', err);
            });
          }
        }).catch(err => {
          console.warn('[handleClaimBonus] season-sp error (non-blocking):', err);
        }),
      ]);

      // Инвалидируем кэш и обновляем данные
      invalidateCache();

      // Показываем успешное сообщение сразу
      const rewardText = [];
      if (currentReward.reward.xp > 0) rewardText.push(`+${currentReward.reward.xp} XP`);
      if (currentReward.reward.coins > 0) rewardText.push(`+${currentReward.reward.coins} монет`);
      if (currentReward.reward.boost) rewardText.push('Boost активирован!');
      if (currentReward.reward.badge) rewardText.push('Бейдж получен!');

      toast({
        title: "🎉 Награда получена!",
        description: rewardText.join(', '),
      });

      // Обновляем данные в фоне (не блокируем UI)
      refreshDashboard(true).catch(err => {
        console.error('[handleClaimBonus] Error refreshing dashboard:', err);
      });

      // Специальное уведомление для дня 7 (завершение недели)
      if (weekDay === 7) {
        setTimeout(() => {
          toast({
            title: "🏆 Неделя завершена!",
            description: `Неделя ${weekNumber} завершена! Начинается новая! Общий streak: ${newStreak} дней`,
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

  // Handle welcome screen completion
  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    // Сохраняем флаг, что прелоадер уже был показан
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_welcome', 'true');
    }
  };

  const handleStartTest = () => {
    navigate('/tests');
  };

  // Show Welcome Overlay
  const readinessPercent = readiness?.percent || 0;
  const accuracy = metrics?.accuracy 
    ? Math.round(metrics.accuracy * 100) 
    : (dashboardData?.stats.accuracy || 0);
  const averageScore = readinessPercent || accuracy;
  
  const hasClaimedToday = dashboardData?.daily_bonus.can_claim === false;

  // Show loading state
  if (loading && !dashboardData) {
  return (
    <>
        {showWelcome && isAuthenticated && (
          <WelcomeOverlay onComplete={handleWelcomeComplete} />
        )}
        <div className={`min-h-screen ${showWelcome ? 'blur-sm pointer-events-none' : ''} transition-all duration-700`}>
          <DashboardSkeleton />
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    console.error('[Index] Dashboard error:', error);
    return (
      <div className="min-h-screen bg-[#0f172a] p-6 md:p-10 font-sans text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Ошибка загрузки</h2>
          <p className="text-slate-400 mb-2">{error.message}</p>
          {error.message.includes('RLS') && (
            <p className="text-xs text-yellow-400 mb-4">
              Возможна проблема с правами доступа. Проверьте RLS политики в Supabase.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => refreshDashboard(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Повторить
            </button>
            <button
              onClick={() => {
                console.log('[Index] Current state:', {
                  profileId,
                  isAuthenticated,
                  error: error.message,
                  dashboardData: !!dashboardData,
                });
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              Логи
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard
  if (!dashboardData) {
    return null;
  }

              return (
    <>
      {showWelcome && isAuthenticated && (
        <WelcomeOverlay onComplete={handleWelcomeComplete} />
      )}
      
      <div className={`min-h-screen ${showWelcome ? 'blur-sm pointer-events-none' : ''} transition-all duration-700`}>
        <Dashboard
          stats={{
            averageScore: averageScore || dashboardData.stats.accuracy,
            currentStreak: dashboardData.daily_bonus.current_streak || 0,
            testsCompleted: dashboardData.stats.tests_completed || 0,
            accuracy: accuracy,
            coins: balance || dashboardData.profile.coins || 0,
            xp: dashboardData.profile.xp || 0,
            level: Math.floor((dashboardData.profile.xp || 0) / 5000) + 1 || 1,
          }}
          onStartQuiz={handleStartTest}
          onClaimReward={handleClaimBonus}
          hasClaimedToday={hasClaimedToday}
          onGetPremium={() => setPaywallOpen(true)}
          profileId={profileId}
          readinessStatus={readiness ? {
            status: readiness.status,
            statusText: readiness.statusText,
            shortText: readiness.shortText,
            description: readiness.description,
          } : undefined}
        />
        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      </div>
    </>
  );
};

export default Index;
