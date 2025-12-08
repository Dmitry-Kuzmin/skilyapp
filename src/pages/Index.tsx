import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense, useCallback, useContext } from "react";
import { UserContext, useUserContext } from "@/contexts/UserContext";
// ОПТИМИЗАЦИЯ: Index.tsx lazy loaded, но делаем динамический импорт для чистоты
// Supabase будет загружаться только когда нужен (в handleClaimBonus)
import { useToast } from "@/hooks/use-toast";
import Landing from "./Landing";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { DashboardSkeleton } from "@/components/dashboard-new/DashboardSkeleton";
import { useExamReadiness } from "@/hooks/useExamReadiness";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDailyBonusDefinitions } from "@/hooks/useStaticData";
// ОПТИМИЗАЦИЯ: Layout lazy-loaded - содержит UserContext, SettingsDrawer, NotificationsPanel, UserProfilePopover
// Все эти компоненты тянут Supabase/Radix, поэтому Layout не должен быть в initial bundle
const Layout = lazy(() => import("@/components/Layout").then(m => ({ default: m.default })));
import { PageLoader } from "@/components/PageLoader";

// КРИТИЧНО: Dashboard НЕ lazy load, так как содержит LCP элемент (hero section)
// Lazy loading Dashboard ухудшает LCP, так как hero section появляется поздно
// Вместо этого оптимизируем сам Dashboard компонент (framer-motion уже lazy внутри)
import { Dashboard } from "@/components/dashboard-new/Dashboard";

// ОПТИМИЗАЦИЯ: Lazy load некритичных компонентов (не нужны для первого рендера)
const PaywallModal = lazy(() => import("@/components/monetization/PaywallModal").then(m => ({ default: m.PaywallModal })));
const WelcomeOverlay = lazy(() => import("@/components/dashboard-new/WelcomeOverlay").then(m => ({ default: m.WelcomeOverlay })));

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
  
  // Fallback для weeklyRewards если их нет в dashboardData
  const { data: dailyBonusDefinitions = [] } = useDailyBonusDefinitions();
  
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

    try {
      setClaimingBonus(true);
      
      // ОПТИМИЗАЦИЯ: Динамический импорт Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      
      // КРИТИЧНО: Используем Edge Function для безопасной обработки на сервере
      // Все логика (UTC время, идемпотентность, начисление наград) теперь на сервере
      const { data, error } = await supabase.functions.invoke('claim-daily-bonus', {
        body: { user_id: profileId }
      });

      if (error) {
        console.error('[handleClaimBonus] Edge Function error:', error);
        throw error;
      }

      // Проверяем ответ
      if (!data) {
        throw new Error('No data received from server');
      }

      // Проверяем, не был ли уже получен бонус сегодня
      if (data.already_claimed) {
        toast({
          title: "Уже получено",
          description: "Сегодняшняя награда уже получена",
          variant: "default",
        });
        // Обновляем данные для отображения актуального состояния
        invalidateCache();
        setClaimingBonus(false);
        return;
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to claim daily bonus');
      }

      const { streak, reward, date } = data;
      
      if (typeof streak !== 'number' || !reward || typeof reward !== 'object') {
        console.error('[handleClaimBonus] Invalid response:', data);
        throw new Error('Invalid response from server: missing or invalid streak/reward');
      }
      
      const weekDay = (streak % 7) || 7;
      const weekNumber = Math.ceil(streak / 7);

      console.log('[handleClaimBonus] Claim successful:', { streak, reward, weekDay, date });

      // Формируем текст награды
      const rewardText: string[] = [];
      if (reward?.xp > 0) rewardText.push(`+${reward.xp} XP`);
      if (reward?.coins > 0) rewardText.push(`+${reward.coins} монет`);
      if (reward?.boost) rewardText.push('⚡ Boost получен!');

      // Обработка рандомного лута (если есть в награде)
      // TODO: Это можно перенести в Edge Function позже для полной безопасности
      if (reward?.random_loot) {
        try {
          const lootType = reward.random_loot.type;
          const lootPool = reward.random_loot.pool || 'common';
          
          if (lootType === 'sticker') {
            const { data: stickerId, error: stickerError } = await supabase.rpc('get_random_sticker_from_pool', {
              p_pool: lootPool
            });
            
            if (!stickerError && stickerId) {
              const { data: lootResult } = await supabase.rpc('grant_random_loot', {
                p_user_id: profileId,
                p_loot_data: { type: 'sticker', id: stickerId, quantity: 1 }
              });
              
              if (lootResult?.success) {
                rewardText.push('🎁 Стикер получен!');
              }
            }
          }
        } catch (lootError) {
          console.error('[handleClaimBonus] Error granting random loot:', lootError);
        }
      }

      // Обработка сезонного бейджа (день 7)
      if (reward?.badge === 'seasonal' && weekDay === 7) {
        try {
          const { data: badgeId } = await supabase.rpc('get_seasonal_weekly_badge');
          if (badgeId) {
            await supabase.from('user_badges').insert({
              user_id: profileId,
              badge_id: badgeId,
              is_displayed: false,
              obtained_from: 'daily_bonus',
              obtained_metadata: {
                week_number: weekNumber,
                streak: streak,
                obtained_at: new Date().toISOString()
              }
            });
            rewardText.push('🏆 Сезонный бейдж получен!');
          }
        } catch (badgeError) {
          console.error('[handleClaimBonus] Error granting badge:', badgeError);
        }
      }

      toast({
        title: "🎉 Награда получена!",
        description: rewardText.join(', '),
      });

      // Инвалидируем кэш и обновляем данные
      invalidateCache();
      
      // Обновляем данные в фоне
      refreshDashboard(true).catch(err => {
        console.error('[handleClaimBonus] Error refreshing dashboard:', err);
      });

      // Специальное уведомление для дня 7 (завершение недели)
      if (weekDay === 7) {
        setTimeout(() => {
          toast({
            title: "🏆 Неделя завершена!",
            description: `Неделя ${weekNumber} завершена! Начинается новая! Общий streak: ${streak} дней`,
            duration: 5000,
          });
        }, 2000);
      }
    } catch (error: any) {
      console.error('[handleClaimBonus] Error:', error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось получить награду",
        variant: "destructive",
      });
    } finally {
      setClaimingBonus(false);
    }
  };

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики событий для предотвращения лишних ре-рендеров
  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    // Сохраняем флаг, что прелоадер уже был показан
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_welcome', 'true');
    }
  }, []);

  const handleStartTest = useCallback(() => {
    navigate('/tests');
  }, [navigate]);

  // Show Welcome Overlay
  const readinessPercent = readiness?.percent || 0;
  const accuracy = metrics?.accuracy 
    ? Math.round(metrics.accuracy * 100) 
    : (dashboardData?.stats.accuracy || 0);
  const averageScore = readinessPercent || accuracy;
  
  // Правильная логика: hasClaimedToday = !can_claim (если can_claim false, значит уже получено)
  const hasClaimedToday = dashboardData?.daily_bonus ? !dashboardData.daily_bonus.can_claim : false;

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
        <Suspense fallback={null}>
          <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
        </Suspense>
      </>
    );
  }

  return (
    <>
      {showWelcome && (
        <WelcomeOverlay onComplete={handleWelcomeComplete} />
      )}
      <Suspense fallback={<PageLoader />}>
        <Layout hideNavigation={showWelcome}>
          <div className={`w-full pb-6 ${showWelcome ? 'blur-sm pointer-events-none' : ''} transition-all duration-700`}>
            {pageContent}
          </div>
        </Layout>
      </Suspense>
    </>
  );
};

// Основной компонент Index - проверяет авторизацию и рендерит нужный контент
const Index = () => {
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  // Это позволяет Index работать даже если UserProvider еще не загрузился
  const userContext = useContext(UserContext);
  const isAuthenticated = userContext?.isAuthenticated ?? false;
  const isLoading = userContext?.isLoading ?? true;
  const navigate = useNavigate();
  
  // КРИТИЧНО: Если не авторизован, редиректим на главную (где Landing рендерится напрямую)
  // НЕ рендерим Landing здесь, чтобы избежать бесконечного цикла
  useEffect(() => {
    if (!isLoading && userContext && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isLoading, userContext, isAuthenticated, navigate]);
  
  // КРИТИЧНО: Показываем loader пока идет загрузка авторизации или пока UserProvider не готов
  // Это предотвращает белый экран при перезагрузке страницы
  if (isLoading || !userContext) {
    return <PageLoader />;
  }
  
  // КРИТИЧНО: Проверяем авторизацию и рендерим нужный компонент
  // Все хуки вызываются внутри DashboardContent, что соблюдает правила хуков
  if (!isAuthenticated) {
    return <PageLoader />; // Показываем loader пока идет редирект
  }

  return <DashboardContent />;
};

export default Index;
