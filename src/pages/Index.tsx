import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense, useCallback, useContext, memo } from "react";
import { UserContext, useUserContext } from "@/contexts/UserContext";
// ОПТИМИЗАЦИЯ: Index.tsx lazy loaded, но делаем динамический импорт для чистоты
// Supabase будет загружаться только когда нужен (в handleClaimBonus)
import { toast } from 'sonner';
import Landing from "./Landing";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { PageLoader } from "@/components/PageLoader";
import { useExamReadiness } from "@/hooks/useExamReadiness";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDailyBonusDefinitions } from "@/hooks/useStaticData";
// ОПТИМИЗАЦИЯ: Layout lazy-loaded - содержит UserContext, SettingsDrawer, NotificationsPanel, UserProfilePopover
// Все эти компоненты тянут Supabase/Radix, поэтому Layout не должен быть в initial bundle
import { Dashboard } from "@/components/dashboard-new/Dashboard";
import { StartupCurtain } from "@/components/StartupCurtain";
const Layout = lazy(() => import("@/components/Layout").then(m => ({ default: m.default })));
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
  const readinessPercent = Math.min(100, readiness?.percent || 0);
  const accuracy = metrics?.accuracy
    ? Math.min(100, Math.round(metrics.accuracy * 100))
    : Math.min(100, (dashboardData?.stats.accuracy || 0));
  const averageScore = Math.min(100, readinessPercent || accuracy);



  // Правильная логика: hasClaimedToday = !can_claim (если can_claim false, значит уже получено)
  const hasClaimedToday = dashboardData?.daily_bonus ? !dashboardData.daily_bonus.can_claim : false;

  // Determine effective error state
  const hasError = !!error;

  return (
    <>
      {showWelcome && !hasError && (
        <Suspense fallback={null}>
          <WelcomeOverlay
            onComplete={handleWelcomeComplete}
            isLoading={loading}
            isPremium={isPremium}
          />
        </Suspense>
      )}
      <Suspense fallback={<PageLoader />}>
        <Layout hideNavigation={showWelcome}>
          <div className={`w-full pb-6 ${(showWelcome && !hasError) || (loading && !!dashboardData) ? 'blur-sm pointer-events-none' : ''} transition-all duration-700`}>
            {hasError ? (
              <div className="min-h-[60vh] bg-[#0f172a] p-6 md:p-10 font-sans text-white flex items-center justify-center rounded-[2.5rem] border border-slate-800/50">
                <div className="text-center max-w-md space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 text-indigo-400">Ошибка инициализации</h2>
                    <p className="text-slate-400 text-sm">{error?.message || 'Не удалось загрузить данные профиля. Попробуйте обновить страницу.'}</p>
                    {import.meta.env.DEV && (
                      <div className="mt-4 p-3 bg-red-900/20 rounded-xl text-left overflow-auto max-h-40">
                        <code className="text-[10px] text-red-400 whitespace-pre-wrap">
                          Debug: profileId={profileId || 'NULL'}
                          {JSON.stringify(error, null, 2)}
                        </code>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => refreshDashboard(true)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all font-medium text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    >
                      Повторить запуск
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all font-medium text-sm"
                    >
                      Перезагрузить
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
                  licenseHistory={dashboardData.license_history}
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
              <PageLoader />
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
  const [redirecting, setRedirecting] = useState(false);

  // КРИТИЧНО: Если не авторизован, редиректим на главную (где Landing рендерится напрямую)
  useEffect(() => {
    const isInTelegram = typeof window !== 'undefined' &&
      window.Telegram?.WebApp &&
      window.Telegram.WebApp.initData &&
      window.Telegram.WebApp.initData !== '' &&
      !window.Telegram.WebApp.initData.startsWith('mock_');

    if (!isLoading && userContext && !isAuthenticated && !isInTelegram) {
      console.log('[Index] Not authenticated, redirecting to landing...');
      setRedirecting(true);
      navigate('/', { replace: true });
    }
  }, [isLoading, userContext, isAuthenticated, navigate]);

  // SAFETY NET: Если загрузка авторизации висит дольше 5 секунд — принудительно редиректим
  useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      console.warn('[Index] ⚠️ Auth loading timeout (5s), force redirect to landing');
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Показываем loader пока идет загрузка авторизации
  if (isLoading || !userContext) {
    if (import.meta.env.DEV) console.debug('[Index] Loading auth...', { isLoading, hasContext: !!userContext });
    return <PageLoader />;
  }

  // Если не авторизован и не был запущен редирект (например, сбой авторизации внутри Telegram)
  if (!isAuthenticated && !redirecting && !isLoading) {
    if (import.meta.env.DEV) console.debug('[Index] Auth failed in Telegram, showing error state');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white bg-zinc-950 p-6 text-center font-sans">
        <StartupCurtain />
        <div className="w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-2xl mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Ошибка доступа</h2>
        <p className="text-zinc-400 mb-8 max-w-sm">
          Не удалось верифицировать вашу сессию. Авторизация отклонена сервером или сессия устарела.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="w-full px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-xl font-bold uppercase tracking-widest text-xs"
          >
            Попробовать снова
          </button>
          <button
            onClick={async () => {
              // НОЯБРЬСКАЯ ЗАЩИТА: Полная очистка всего, что может мешать
              console.log("[Index] Nuclear session reset...");
              localStorage.removeItem('sb-yffjnqegeiorunyvcxkn-auth-token');
              localStorage.removeItem('telegram_token');
              localStorage.removeItem('puzzle_user');

              // Очищаем куки
              document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
              });

              // Пытаемся выйти через Supabase если клиент жив
              try {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
              } catch (e) {
                console.warn("Supabase signOut failed, continuing with reload");
              }

              window.location.replace('/');
            }}
            className="w-full px-8 py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl font-bold uppercase tracking-widest text-xs text-zinc-400"
          >
            Сбросить сессию и выйти
          </button>
        </div>
      </div>
    );
  }

  // Если редирект запущен - оставляем null, Landing отрисует шторку
  if (redirecting) {
    if (import.meta.env.DEV) console.debug('[Index] Redirecting to landing...');
    return null;
  }

  return (
    <>
      <StartupCurtain />
      <DashboardContent />
    </>
  );
});

export default Index;
