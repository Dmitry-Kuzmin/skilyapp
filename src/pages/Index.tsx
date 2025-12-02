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
import Layout from "@/components/Layout";
import { PageLoader } from "@/components/PageLoader";

// Внутренний компонент для авторизованных пользователей
// Это позволяет вызывать все хуки в правильном порядке
const DashboardContent = () => {
  const { profileId } = useUserContext();
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
    console.log('[handleClaimBonus] Called', { 
      hasDailyBonus: !!dashboardData?.daily_bonus, 
      profileId,
      canClaim: dashboardData?.daily_bonus?.can_claim,
      claimingBonus
    });
    
    if (!dashboardData?.daily_bonus || !profileId) {
      console.error('[handleClaimBonus] Missing data:', { 
        hasDailyBonus: !!dashboardData?.daily_bonus, 
        profileId 
      });
      return;
    }

    const dailyBonus = dashboardData.daily_bonus;
    
    // Проверяем, можно ли получить награду
    if (!dailyBonus.can_claim) {
      console.log('[handleClaimBonus] Already claimed today');
      toast({
        title: "Уже получено",
        description: "Сегодняшняя награда уже получена",
        variant: "default",
      });
      return;
    }

    try {
      setClaimingBonus(true);
      
      // ✅ OPTIMISTIC UPDATE: мгновенно обновляем UI
      const optimisticStreak = (dailyBonus.current_streak || 0) + 1;
      const optimisticWeekDay = optimisticStreak % 7 || 7;
      const optimisticReward = dashboardData.weeklyRewards.find(r => r.day_number === optimisticWeekDay);
      
      console.log('[handleClaimBonus] Optimistic update:', { optimisticStreak, weekDay: optimisticWeekDay });

      // Сохраняем предыдущее состояние для отката
      const previousDashboardData = dashboardData;
      
      // ✅ ПОПЫТКА 1: Использовать новый Edge Function (безопасный метод)
      let useNewMethod = true;
      let edgeFunctionData = null;
      
      try {
        console.log('[handleClaimBonus] Attempting Edge Function method...');
        const { data: efData, error: efError } = await supabase.functions.invoke('claim-daily-bonus', {
          body: { user_id: profileId }
        });

        if (efError) {
          console.warn('[handleClaimBonus] Edge Function error:', efError);
          // ❌ В production НЕ fallback
          if (import.meta.env.PROD) {
            toast({
              title: "Ошибка сервера",
              description: "Не удалось получить бонус. Попробуйте позже.",
              variant: "destructive",
            });
            setClaimingBonus(false);
            return;
          }
          useNewMethod = false;
        } else if (!efData?.success) {
          if (efData?.error === 'already_claimed_today') {
            toast({
              title: "Уже получено",
              description: "Сегодняшняя награда уже получена (серверное время)",
              variant: "default",
            });
            setClaimingBonus(false);
            return;
          }
          if (efData?.error === 'concurrent_claim') {
            toast({
              title: "Повтори попытку",
              description: "Подожди секунду и попробуй снова",
              variant: "default",
            });
            setClaimingBonus(false);
            return;
          }
          console.warn('[handleClaimBonus] Edge Function returned error:', efData);
          if (import.meta.env.PROD) {
            toast({
              title: "Ошибка",
              description: efData?.message || "Не удалось получить бонус",
              variant: "destructive",
            });
            setClaimingBonus(false);
            return;
          }
          useNewMethod = false;
        } else {
          edgeFunctionData = efData;
          console.log('[handleClaimBonus] Edge Function success:', efData);
        }
      } catch (efCatchError) {
        console.error('[handleClaimBonus] Edge Function exception:', efCatchError);
        if (import.meta.env.PROD) {
          toast({
            title: "Ошибка",
            description: "Попробуйте позже",
            variant: "destructive",
          });
          setClaimingBonus(false);
          return;
        }
        useNewMethod = false;
      }

      // Определяем награду и streak для дальнейшей обработки
      let newStreak: number;
      let weekDay: number;
      let currentReward: any;

      // ✅ МЕТОД 1: Edge Function (безопасно, с серверным временем)
      if (useNewMethod && edgeFunctionData) {
        console.log('[handleClaimBonus] Using Edge Function method');
        
        newStreak = edgeFunctionData.new_streak;
        weekDay = edgeFunctionData.week_day;
        currentReward = dashboardData.weeklyRewards.find(r => r.day_number === weekDay);
        
        // ✅ Используем данные из response (без лишнего запроса)
        if (dashboardData) {
          dashboardData.daily_bonus.current_streak = newStreak;
          dashboardData.daily_bonus.last_claimed_date = edgeFunctionData.server_time;
          dashboardData.profile.xp = edgeFunctionData.new_xp;
          dashboardData.profile.coins = edgeFunctionData.new_coins;
        }
        
        // ❄️ Показать уведомление о Freeze
        if (edgeFunctionData.freeze_used) {
          toast({
            title: "❄️ Streak спасён!",
            description: "Заморозка автоматически использована",
          });
        }
        
        // 🎁 Mystery Box анимация для дня 7
        if (edgeFunctionData.mystery_reward && weekDay === 7) {
          // Показываем Mystery Box ПОСЛЕ основной celebration
          setTimeout(() => {
            setShowMysteryBox(true);
            setMysteryBoxReward(edgeFunctionData.mystery_reward);
            
            setTimeout(() => {
              setShowMysteryBox(false);
              // Отложенный invalidate (экономия bandwidth)
              invalidateCache();
            }, 8000);
          }, 3000);
        } else {
          // Для дней 1-6 - отложенный invalidate
          setTimeout(() => invalidateCache(), 2000);
        }
        
        console.log('[handleClaimBonus] Claim successful (server), streak:', newStreak);

      } else {
        // ✅ МЕТОД 2: Fallback на старый метод (с клиентским временем)
        console.log('[handleClaimBonus] Using fallback (legacy) method');
        
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // Вычисляем новый стрик
        newStreak = 1;
        if (dailyBonus.last_claimed_date === yesterday) {
          newStreak = (dailyBonus.current_streak || 0) + 1;
        } else if (dailyBonus.last_claimed_date === today) {
          console.log('[handleClaimBonus] Already claimed today (date check)');
          toast({
            title: "Уже получено",
            description: "Сегодняшняя награда уже получена",
            variant: "default",
          });
          setClaimingBonus(false);
          return;
        }

        // Циклический расчет: день недели (1-7)
        weekDay = newStreak % 7 || 7;
        currentReward = dashboardData.weeklyRewards.find(r => r.day_number === weekDay);
        
        if (!currentReward) {
          console.error('[handleClaimBonus] Reward not found for streak:', newStreak);
          throw new Error('Reward not found');
        }

        // Обновляем user_daily_bonus
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

        // Обновляем XP и монеты
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
          }
        }

        invalidateCache();
      }

      // ✅ Проверка награды после определения метода
      if (!currentReward) {
        console.error('[handleClaimBonus] Reward not found for day:', weekDay);
        setClaimingBonus(false);
        return;
      }

      // Вызываем Edge Functions асинхронно (без ожидания)
      Promise.allSettled([
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
      
      console.log('[handleClaimBonus] Claim successful, streak:', newStreak, 'weekDay:', weekDay);

      // Показываем успешное сообщение сразу
      const rewardText: string[] = [];
      if (currentReward.reward.xp > 0) rewardText.push(`+${currentReward.reward.xp} XP`);
      if (currentReward.reward.coins > 0) rewardText.push(`+${currentReward.reward.coins} монет`);
      
      // Обработка рандомного лута (день 2, 3, 6)
      let randomLootGranted = false;
      if (currentReward.reward.random_loot) {
        try {
          const lootType = currentReward.reward.random_loot.type;
          const lootPool = currentReward.reward.random_loot.pool || 'common';
          
          if (lootType === 'sticker') {
            // Получаем рандомный стикер
            const { data: stickerId, error: stickerError } = await supabase.rpc('get_random_sticker_from_pool', {
              p_pool: lootPool
            });
            
            if (stickerError) {
              console.error('[handleClaimBonus] Error getting random sticker:', stickerError);
            } else if (stickerId) {
              const { data: lootResult, error: lootError } = await supabase.rpc('grant_random_loot', {
                p_user_id: profileId,
                p_loot_data: {
                  type: 'sticker',
                  id: stickerId,
                  quantity: 1
                }
              });
              
              if (lootError) {
                console.error('[handleClaimBonus] Error granting sticker:', lootError);
              } else if (lootResult?.success) {
                console.log('[handleClaimBonus] Sticker granted:', lootResult);
                rewardText.push('🎁 Стикер получен!');
                randomLootGranted = true;
              } else {
                console.warn('[handleClaimBonus] Sticker grant failed:', lootResult);
              }
            }
          } else if (lootType === 'surprise') {
            // Сюрпризный лут: 60% монеты (уже в награде), 40% косметика
            const { data: lootData, error: lootDataError } = await supabase.rpc('get_random_loot', {
              p_loot_type: 'surprise',
              p_pool: lootPool
            });
            
            if (lootDataError) {
              console.error('[handleClaimBonus] Error getting random loot:', lootDataError);
            } else if (lootData && lootData.type !== 'coins_only' && lootData.type !== 'none') {
              const { data: lootResult, error: lootError } = await supabase.rpc('grant_random_loot', {
                p_user_id: profileId,
                p_loot_data: lootData
              });
              
              if (lootError) {
                console.error('[handleClaimBonus] Error granting surprise loot:', lootError);
              } else if (lootResult?.success) {
                console.log('[handleClaimBonus] Surprise loot granted:', lootResult);
                randomLootGranted = true;
                if (lootResult.type === 'sticker') {
                  rewardText.push('🎁 Стикер получен!');
                } else if (lootResult.type === 'skin') {
                  rewardText.push('🎨 Скин получен!');
                }
              } else {
                console.warn('[handleClaimBonus] Surprise loot grant failed:', lootResult);
              }
            }
          }
        } catch (lootError) {
          console.error('[handleClaimBonus] Error granting random loot:', lootError);
          // Не прерываем выполнение, но логируем ошибку
        }
      }

      // Обработка Boost (день 4, 7)
      if (currentReward.reward.boost) {
        try {
          // Даем Double SP boost (полезный для дуэлей)
          const { data: boostData, error: boostError } = await supabase.rpc('modify_boost_inventory', {
            p_user_id: profileId,
            p_boost_type: 'double_sp',
            p_change: 1
          });
          
          if (boostError) {
            console.error('[handleClaimBonus] Error granting boost:', boostError);
            // Пробуем альтернативный способ - прямой insert через service role
            // Но это не сработает из клиента, поэтому просто логируем
          } else {
            console.log('[handleClaimBonus] Boost granted: double_sp', boostData);
            rewardText.push('⚡ Boost получен!');
          }
        } catch (boostError) {
          console.error('[handleClaimBonus] Error granting boost:', boostError);
        }
      }

      // Обработка сезонного бейджа (день 7)
      if (currentReward.reward.badge === 'seasonal' && weekDay === 7) {
        try {
          const { data: badgeId, error: badgeIdError } = await supabase.rpc('get_seasonal_weekly_badge');
          
          if (badgeIdError) {
            console.error('[handleClaimBonus] Error getting seasonal badge:', badgeIdError);
          } else if (badgeId) {
            const { data: badgeData, error: badgeError } = await supabase
              .from('user_badges')
              .insert({
                user_id: profileId,
                badge_id: badgeId,
                is_displayed: false,
                obtained_from: 'daily_bonus',
                obtained_metadata: {
                  week_number: weekNumber,
                  streak: newStreak,
                  obtained_at: new Date().toISOString()
                }
              })
              .select();
            
            if (badgeError && badgeError.code !== '23505') {
              // 23505 = unique violation (бейдж уже есть) - это нормально
              console.error('[handleClaimBonus] Error granting badge:', badgeError);
            } else {
              console.log('[handleClaimBonus] Seasonal badge granted:', badgeId, badgeData);
              rewardText.push('🏆 Сезонный бейдж получен!');
            }
          }
        } catch (badgeError) {
          console.error('[handleClaimBonus] Error granting badge:', badgeError);
        }
      }

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

  let pageContent: React.ReactNode = null;

  if (loading && !dashboardData) {
    pageContent = <DashboardSkeleton />;
  } else if (error) {
    console.error('[Index] Dashboard error:', error);
    pageContent = (
      <div className="min-h-[60vh] bg-[#0f172a] p-6 md:p-10 font-sans text-white flex items-center justify-center rounded-3xl border border-slate-800">
        <div className="text-center max-w-md space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Ошибка загрузки</h2>
            <p className="text-slate-400">{error.message}</p>
          </div>
          {error.message.includes('RLS') && (
            <p className="text-xs text-yellow-400">
              Возможна проблема с правами доступа. Проверьте RLS политики в Supabase.
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => refreshDashboard(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Повторить
            </button>
            <button
              onClick={() => {
                console.log('[DashboardContent] Current state:', {
                  profileId,
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
  } else if (dashboardData) {
    pageContent = (
    <>
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
      </>
    );
  }

  return (
    <>
      {showWelcome && (
        <WelcomeOverlay onComplete={handleWelcomeComplete} />
      )}
      <Layout hideNavigation={showWelcome}>
        <div className={`w-full pb-6 ${showWelcome ? 'blur-sm pointer-events-none' : ''} transition-all duration-700`}>
          {pageContent}
        </div>
      </Layout>
    </>
  );
};

// Основной компонент Index - проверяет авторизацию и рендерит нужный контент
const Index = () => {
  const { isAuthenticated, isLoading } = useUserContext();
  
  // КРИТИЧНО: Показываем loader пока идет загрузка авторизации
  // Это предотвращает белый экран при перезагрузке страницы
  if (isLoading) {
    return <PageLoader />;
  }
  
  // КРИТИЧНО: Проверяем авторизацию и рендерим нужный компонент
  // Все хуки вызываются внутри DashboardContent, что соблюдает правила хуков
  if (!isAuthenticated) {
    return <Landing />;
  }

  return <DashboardContent />;
};

export default Index;
