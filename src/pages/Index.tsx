import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense, useCallback, useContext, memo } from "react";
import { UserContext, useUserContext } from "@/contexts/UserContext";
// ОПТИМИЗАЦИЯ: Index.tsx lazy loaded, но делаем динамический импорт для чистоты
// Supabase будет загружаться только когда нужен (в handleClaimBonus)
import { toast } from 'sonner';
import Landing from "./Landing";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { DashboardSkeleton } from "@/components/dashboard-new/DashboardSkeleton";
import { useExamReadiness } from "@/hooks/useExamReadiness";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
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
// ОПТИМИЗАЦИЯ: Мемоизирован для предотвращения лишних ре-рендеров
const DashboardContent = memo(function DashboardContent() {
  const { profileId } = useUserContext();


  const { isPremium, isTrial, daysRemaining } = usePremium();
  const { balance } = useCoins();
  const navigate = useNavigate();
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Показываем прелоадер при первом входе каждый день
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== 'undefined') {
      const lastWelcomeDate = localStorage.getItem('welcome_shown_date');
      const today = new Date().toDateString(); // "Mon Dec 22 2024"

      // Показываем если дата не сегодняшняя или отсутствует
      return lastWelcomeDate !== today;
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

    if (!dashboardData?.daily_bonus || !profileId) {
      return;
    }

    try {
      setClaimingBonus(true);

      const supabase = await getSupabaseClient();

      // КРИТИЧНО: Используем Edge Function для безопасной обработки на сервере
      // Все логика (UTC время, идемпотентность, начисление наград) теперь на сервере
      const { data, error } = await supabase.functions.invoke('claim-daily-bonus', {
        body: { user_id: profileId }
      });

      if (error) {

        // Более детальное сообщение об ошибке
        if ((error as any).status === 503) {
          throw new Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
        } else if ((error as any).status === 400) {
          throw new Error('Неверный запрос. Проверьте данные и попробуйте снова.');
        } else {
          throw error;
        }
      }

      if (!data) throw new Error('No data received from server');

      // Проверяем, не был ли уже получен бонус сегодня
      if (data.already_claimed) {
        toast.info('Уже получено', { description: 'Сегодняшняя награда уже получена' });
        // Обновляем данные для отображения актуального состояния
        invalidateCache();
        setClaimingBonus(false);
        return;
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to claim daily bonus');
      }

      const { streak, reward } = data;

      if (typeof streak !== 'number' || !reward || typeof reward !== 'object') {
        throw new Error('Invalid response from server: missing or invalid streak/reward');
      }

      const weekDay = (streak % 7) || 7;
      const weekNumber = Math.ceil(streak / 7);

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

      toast.success('🎉 Награда получена!', { description: rewardText.join(', ') });

      // Инвалидируем кэш и обновляем данные
      invalidateCache();

      // Обновляем данные в фоне
      refreshDashboard(true).catch(err => {
        console.error('[handleClaimBonus] Error refreshing dashboard:', err);
      });

      // Специальное уведомление для дня 7 (завершение недели)
      if (weekDay === 7) {
        setTimeout(() => {
          toast.success('🏆 Неделя завершена!', {
            description: `Неделя ${weekNumber} завершена! Начинается новая! Общий streak: ${streak} дней`,
            duration: 5000,
          });
        }, 2000);
      }
    } catch (error: any) {
      toast.error('Ошибка', { description: error?.message || 'Не удалось получить награду' });
    } finally {
      setClaimingBonus(false);
    }
  };

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики событий для предотвращения лишних ре-рендеров
  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    // Сохраняем сегодняшнюю дату, чтобы не показывать прелоадер повторно сегодня
    if (typeof window !== 'undefined') {
      const today = new Date().toDateString();
      localStorage.setItem('welcome_shown_date', today);
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

  console.log('[Index] 🔍 Render state:', {
    loading,
    hasDashboardData: !!dashboardData,
    showWelcome,
    profileId,
    accuracy,
    averageScore
  });

  // Правильная логика: hasClaimedToday = !can_claim (если can_claim false, значит уже получено)
  const hasClaimedToday = dashboardData?.daily_bonus ? !dashboardData.daily_bonus.can_claim : false;

  return (
    <>
      {showWelcome && (
        <WelcomeOverlay
          onComplete={handleWelcomeComplete}
          isLoading={loading || !dashboardData}
          isPremium={isPremium}
        />
      )}
      <Suspense fallback={<PageLoader />}>
        <Layout hideNavigation={showWelcome}>
          <div className={`w-full pb-6 ${(showWelcome && !dashboardData) || (loading && !dashboardData) ? 'blur-sm pointer-events-none' : ''} transition-all duration-700`}>
            {error ? (
              <div className="min-h-[60vh] bg-[#0f172a] p-6 md:p-10 font-sans text-white flex items-center justify-center rounded-[2.5rem] border border-slate-800/50">
                <div className="text-center max-w-md space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 text-indigo-400">Ошибка инициализации</h2>
                    <p className="text-slate-400 text-sm">{error.message}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => refreshDashboard(true)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all font-medium text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    >
                      Повторить запуск
                    </button>
                  </div>
                </div>
              </div>
            ) : dashboardData ? (
              <>
                <Dashboard
                  stats={{
                    averageScore: averageScore || dashboardData.stats.accuracy,
                    currentStreak: dashboardData.daily_bonus?.current_streak || 0,
                    testsCompleted: dashboardData.stats.tests_completed || 0,
                    accuracy: accuracy,
                    coins: balance || dashboardData.profile.coins || 0,
                    xp: dashboardData.profile.xp || 0,
                    level: Math.floor((dashboardData.profile.xp || 0) / 5000) + 1 || 1,
                  }}
                  onStartQuiz={handleStartTest}
                  onClaimReward={handleClaimBonus}
                  hasClaimedToday={hasClaimedToday}
                  isClaiming={claimingBonus}
                  onGetPremium={() => setPaywallOpen(true)}
                  profileId={profileId}
                  userProfile={dashboardData.profile}
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
            ) : (
              <DashboardSkeleton />
            )}
          </div>
        </Layout>
      </Suspense>
    </>
  );
});

// Основной компонент Index - проверяет авторизацию и рендерит нужный контент
const Index = memo(function Index() {
  // КРИТИЧНО: Безопасное получение UserContext
  const userContext = useContext(UserContext);
  const isAuthenticated = userContext?.isAuthenticated ?? false;
  const isLoading = userContext?.isLoading ?? true;
  const navigate = useNavigate();

  // КРИТИЧНО: Если не авторизован, редиректим на главную (где Landing рендерится напрямую)
  // НО: НЕ редиректим если мы в Telegram Mini App - там авторизация может появиться позже
  // Это предотвращает бесконечный цикл редиректов между Landing и Index
  useEffect(() => {
    // Проверяем, что мы не в Telegram Mini App
    const isInTelegram = typeof window !== 'undefined' &&
      window.Telegram?.WebApp &&
      window.Telegram.WebApp.initData &&
      window.Telegram.WebApp.initData !== '' &&
      !window.Telegram.WebApp.initData.startsWith('mock_');

    // Редиректим только если НЕ в Telegram Mini App
    if (!isLoading && userContext && !isAuthenticated && !isInTelegram) {
      // КРИТИЧНО: Проверяем, что мы не на главной странице, чтобы избежать бесконечного цикла
      if (window.location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, userContext, isAuthenticated, navigate]);

  // Показываем loader пока идет загрузка авторизации
  if (isLoading || !userContext) {
    return <PageLoader />;
  }

  // Проверяем авторизацию
  if (!isAuthenticated) {
    return <PageLoader />;
  }

  return <DashboardContent />;
});

export default Index;
