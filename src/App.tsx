// Force Reload Trigger: 2025-12-29 23:59:00
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { TelegramProvider } from "@/contexts/TelegramContext";
import { AdCleanup } from "@/components/AdCleanup";
import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { useOfflineAnalytics } from "@/utils/offlineAnalytics";
import { useSession } from "@/hooks/useSession";
import { validateEnv } from "@/utils/envValidation";
import { isTelegramMiniApp } from "@/lib/telegram";
import { StartupCurtain } from "@/components/StartupCurtain";
import { ThemeColorManager } from "@/components/ThemeColorManager";

// ОПТИМИЗАЦИЯ: Toaster, Sonner, TooltipProvider перемещены в AppProviders
// Они тянут Radix UI (@radix-ui/react-toast, @radix-ui/react-tooltip), поэтому не должны грузиться на лендинге
import { Motion } from "@/components/optimized/Motion";
import { ScrollToTop } from "@/components/ScrollToTop";
// ОПТИМИЗАЦИЯ: ReferralRedirect и PartnerRedirect используют UserContext - делаем lazy
// Они используются только в AppRoutes, который уже lazy, но для чистоты делаем их lazy здесь тоже
const ReferralRedirect = lazy(() => import("@/components/ReferralRedirect").then(m => ({ default: m.ReferralRedirect })));
const PartnerRedirect = lazy(() => import("@/components/PartnerRedirect").then(m => ({ default: m.PartnerRedirect })));
import { OfflineBanner } from "@/components/OfflineBanner";
// ⚠️ ОТКЛЮЧЕНО: Service Worker отключен
// import { ServiceWorkerDebug } from "@/components/ServiceWorkerDebug";
import { OfflineQueueIndicator } from "@/components/OfflineQueueIndicator";
// ⚠️ ОТКЛЮЧЕНО: Service Worker отключен
// import { ReloadPrompt } from "@/components/ReloadPrompt";

// Lazy load только тяжелые компоненты
const DeepLinkHandler = lazy(() => import("@/components/DeepLinkHandler").then(m => ({ default: m.DeepLinkHandler })));
// КРИТИЧНО: OAuthCallbackHandler НЕ lazy - должен загружаться сразу для обработки OAuth токенов
// Иначе при ошибках lazy loading OAuth callback не обработается
import { Toaster, toast } from "@/components/ui/sonner";
const CosmeticsPreviewProvider = lazy(() => import("@/contexts/CosmeticsPreviewContext").then(m => ({ default: m.CosmeticsPreviewProvider })));

// ОПТИМИЗАЦИЯ: Lazy load некритичных компонентов для уменьшения initial bundle
const PerformanceMonitor = lazy(() => import("@/components/PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor })));
const GlobalModalManager = lazy(() => import("@/components/GlobalModalManager").then(m => ({ default: m.GlobalModalManager })));
const PasskeyOnboardingWrapper = lazy(() => import("@/components/PasskeyOnboardingWrapper").then(m => ({ default: m.PasskeyOnboardingWrapper })));
const AIChatWidget = lazy(() => import("@/components/ai/AIChatWidget").then(m => ({ default: m.AIChatWidget })));
const PWAInstallBanner = lazy(() => import("@/components/pwa").then(m => ({ default: m.PWAInstallBanner })));

// ОПТИМИЗАЦИЯ: AppProviders lazy - НЕ попадает в initial bundle для лендинга
// Это критично для производительности - Supabase/Query грузятся только для /app/*
const AppProviders = lazy(() => import("@/components/providers/AppProviders").then(m => ({ default: m.AppProviders })));
const AppRoutes = lazy(() => import("@/components/AppRoutes").then(m => ({ default: m.AppRoutes })));

// ОПТИМИЗАЦИЯ: Landing теперь lazy для уменьшения initial bundle
const Landing = lazy(() => import("./pages/Landing"));
// AuthCallback - страница для обработки OAuth callback
// Должна быть доступна без AppProviders, так как обрабатывает сессию сама
import { AuthCallback } from "./pages/AuthCallback";
// Purchase - страница для обработки Paddle checkout
// Должна быть доступна без AppProviders, так как Paddle редиректит туда до оплаты
const Purchase = lazy(() => import("./pages/Purchase").then(m => ({ default: m.default })));
const Login = lazy(() => import("./pages/Login"));

// Обработка ошибок для lazy loading Index (dashboard)
const IndexErrorFallback = () => {
  useEffect(() => {
    console.error("[App] Index (dashboard) module failed to load");
    // КРИТИЧНО: НЕ делаем автоматическую перезагрузку - это вызывает спонтанные релоады
    // Вместо этого показываем ошибку и позволяем пользователю решить
    console.warn("[App] Dashboard module failed - user can manually reload if needed");
  }, []);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-white">Ошибка загрузки</h1>
        <p className="text-sm text-zinc-400">
          Не удалось загрузить модуль дашборда. Попробуйте обновить страницу.
        </p>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          className="w-full h-12 px-4 bg-white text-black font-semibold rounded-xl hover:shadow-lg transition-shadow"
        >
          Обновить страницу
        </button>
      </div>
    </div>
  );
};

const Index = lazy(() =>
  import("./pages/Index").catch((error) => {
    console.error("[App] Failed to load Index (dashboard) module:", error);
    if (error?.message?.includes('MIME type') || error?.message?.includes('text/html')) {
      console.error("[App] MIME type error detected for Index");
      return { default: IndexErrorFallback };
    }
    return { default: IndexErrorFallback };
  })
);
const LearningMap = lazy(() => import("./pages/LearningMap"));
const TopicDetail = lazy(() => import("./pages/TopicDetail"));
const SubtopicDetail = lazy(() => import("./pages/SubtopicDetail"));

// Обработка ошибок для lazy loading Tests
const TestsErrorFallback = () => {
  useEffect(() => {
    console.error("[App] Tests module failed to load");
  }, []);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-white">Ошибка загрузки</h1>
        <p className="text-sm text-zinc-400">
          Не удалось загрузить модуль тестов. Попробуйте обновить страницу.
        </p>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          className="w-full h-12 px-4 bg-white text-black font-semibold rounded-xl hover:shadow-lg transition-shadow"
        >
          Обновить страницу
        </button>
      </div>
    </div>
  );
};

const Tests = lazy(() =>
  import("./pages/Tests").catch((error) => {
    console.error("[App] Failed to load Tests module:", error);
    if (error?.message?.includes('MIME type') || error?.message?.includes('text/html')) {
      console.error("[App] MIME type error detected for Tests");
      return { default: TestsErrorFallback };
    }
    return { default: TestsErrorFallback };
  })
);

const Learning = lazy(() => import("./pages/Learning"));
const Games = lazy(() => import("./pages/Games"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() =>
  import("./components/admin/AdminLayout").then((module) => ({ default: module.AdminLayout }))
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard }))
);



const AdminSeasonsManagement = lazy(() =>
  import("./pages/admin/AdminSeasonsManagement").then((module) => ({ default: module.AdminSeasonsManagement }))
);
const AdminSecurityMonitoring = lazy(() =>
  import("./pages/admin/AdminSecurityMonitoring").then((module) => ({ default: module.AdminSecurityMonitoring }))
);
const AdminPartners = lazy(() =>
  import("./pages/admin/AdminPartners").then((module) => ({ default: module.AdminPartners }))
);
const AdminMarketingMaterials = lazy(() =>
  import("./pages/admin/AdminMarketingMaterials").then((module) => ({ default: module.AdminMarketingMaterials }))
);
const AdminRewardReports = lazy(() =>
  import("./pages/admin/AdminRewardReports").then((module) => ({ default: module.AdminRewardReports }))
);
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const ModernPartnerDashboard = lazy(() => import("./pages/ModernPartnerDashboard"));
const PartnerLinkRedirect = lazy(() => import("./pages/PartnerLinkRedirect"));
const AdminEditor = lazy(() => import("./pages/AdminEditor"));
const AdminQuestionReports = lazy(() => import("./pages/AdminQuestionReports"));
const RaceGame = lazy(() => import("./pages/games/RaceGame"));
const GuessTheSign = lazy(() => import("./pages/games/GuessTheSign"));
const MatchingGame = lazy(() => import("./pages/games/MatchingGame"));
const Duel = lazy(() => import("./pages/games/Duel"));
const FourVariantsGame = lazy(() => import("./pages/games/FourVariantsGame"));
const RoadRace = lazy(() => import("./pages/games/RoadRace"));
const FlashCardsGame = lazy(() => import("./pages/games/FlashCardsGame"));
const TestSession = lazy(() => import("./pages/TestSession"));
const TestResults = lazy(() => import("./pages/TestResults"));
const SequentialTests = lazy(() => import("./pages/SequentialTests"));
const RoadSigns = lazy(() => import("./pages/RoadSigns"));
const Dictionary = lazy(() => import("./pages/Dictionary"));

const DailyBonus = lazy(() => import("./pages/DailyBonus"));
const DGTTestsSimple = lazy(() => import("./pages/DGTTestsSimple"));
const ChallengeBank = lazy(() => import("./pages/ChallengeBank"));
const Referrals = lazy(() => import("./pages/Referrals"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));
const Settings = lazy(() => import("./pages/Settings"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const SubscriptionTerms = lazy(() => import("./pages/SubscriptionTerms"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
// Компонент для обработки ошибок загрузки RefundPolicy
function RefundPolicyErrorFallback() {
  useEffect(() => {
    console.error("[App] RefundPolicy module failed to load");
    // КРИТИЧНО: НЕ делаем автоматическую перезагрузку - это вызывает спонтанные релоады
    // Вместо этого показываем ошибку и позволяем пользователю решить
    console.warn("[App] RefundPolicy module failed - user can manually reload if needed");
  }, []);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-white">Ошибка загрузки</h1>
        <p className="text-sm text-zinc-400">
          Не удалось загрузить модуль. Попробуйте обновить страницу.
        </p>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          className="w-full h-12 px-4 bg-white text-black font-semibold rounded-xl hover:shadow-lg transition-shadow"
        >
          Обновить страницу
        </button>
      </div>
    </div>
  );
}

// Обработка ошибок для lazy loading RefundPolicy
const RefundPolicy = lazy(() =>
  import("./pages/RefundPolicy").catch((error) => {
    console.error("[App] Failed to load RefundPolicy module:", error);
    // Если ошибка связана с MIME type, это проблема с сервером/Vercel
    if (error?.message?.includes('MIME type') || error?.message?.includes('text/html')) {
      console.error("[App] MIME type error detected - likely server routing issue");
      return { default: RefundPolicyErrorFallback };
    }
    // Для других ошибок тоже возвращаем fallback
    return { default: RefundPolicyErrorFallback };
  })
);
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Partners = lazy(() => import("./pages/Partners"));
// DuelStats is handled in AppRoutes.tsx
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Blog = lazy(() => import("./pages/Blog"));
const Article = lazy(() => import("./pages/Article"));



// Лёгкий редирект: если есть supabase-сессия в localStorage — сразу в дашборд
const LandingRedirect = () => {
  const navigate = useNavigate();

  // Ключ supabase auth в localStorage (sb-<project-ref>-auth-token)
  const authStorageKey = useMemo(() => {
    const fallbackRef = "yffjnqegeiorunyvcxkn";
    const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || "";
    const ref = url.startsWith("https://") ? url.replace("https://", "").split(".")[0] : fallbackRef;
    return `sb-${ref}-auth-token`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(authStorageKey);
      if (!raw || raw === "null") return;
      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession ?? parsed?.currentSession?.user ? parsed.currentSession : parsed?.session ?? parsed;
      const hasToken = session?.access_token || session?.currentSession?.access_token;
      if (hasToken) {
        navigate("/dashboard" + window.location.search, { replace: true });
      }
    } catch (error) {
      console.warn("[LandingRedirect] Failed to parse supabase auth token", error);
    }
  }, [authStorageKey, navigate]);

  return <Landing />;
};

const App = () => {
  // КРИТИЧНО: Проверяем Telegram WebApp только если мы действительно в Telegram Mini App
  // В браузере window.Telegram может быть моком или заглушкой
  if (typeof window !== 'undefined' && window.Telegram?.WebApp && isTelegramMiniApp()) {
    const tg = window.Telegram.WebApp;

    // Вызываем ready() один раз
    if (typeof tg.ready === 'function') {
      tg.ready();
    }

    // ============================================================================
    // GOLDEN RULES v3.0 - RULE 3: The "Chameleon" Protocol
    // @see ThemeColorManager.tsx
    // ============================================================================
    // КРИТИЧНО: Цвета теперь автоматически синхронизируются в ThemeColorManager.tsx
    // Это обеспечивает плавную смену цветов при навигации между страницами с разным фоном.

    try {
      // Enable closing confirmation (recommended for better UX)
      if (typeof tg.enableClosingConfirmation === 'function') {
        tg.enableClosingConfirmation();
      }
    } catch (error) {
      console.warn('[App] Error enabling closing confirmation:', error);
    }

    // ============================================================================
    // GOLDEN RULES v3.0 - RULE 3.5: requestFullscreen() (Mini Apps 8.0+)
    // Иммерсивный режим — приложение занимает весь экран, как у BotFather
    // ============================================================================

    // 1. Сначала вызываем старый expand() для совместимости
    const callExpand = () => {
      try {
        if (typeof tg.expand === 'function' && !tg.isExpanded) {
          tg.expand();
          console.debug('[App] ✅ expand() called');
        }
      } catch (error) {
        console.warn('[App] Error calling expand():', error);
      }
    };

    callExpand();

    // 2. МАГИЯ Mini Apps 8.0+ — иммерсивный режим на полный экран
    // requestFullscreen() переводит в режим без шторки
    try {
      // @ts-expect-error — requestFullscreen добавлен в Mini Apps 8.0, типы могут быть устаревшими
      if (typeof tg.requestFullscreen === 'function') {
        // @ts-expect-error
        tg.requestFullscreen();
        if (import.meta.env.DEV) console.debug('[App] ✅ requestFullscreen() called - immersive mode enabled');
      } else {
        if (import.meta.env.DEV) console.debug('[App] ℹ️ requestFullscreen not available (Mini Apps < 8.0)');
      }
    } catch (error) {
      console.warn('[App] Error calling requestFullscreen():', error);
    }

    // Слушаем события viewport (fallback)
    if (typeof tg.onEvent === 'function') {
      tg.onEvent('viewport_changed', () => {
        if (!tg.isExpanded) {
          callExpand();
        }
      });

      tg.onEvent('safeAreaChanged', () => {
        if (!tg.isExpanded) {
          callExpand();
        }
      });
    }
  }

  // Валидация переменных окружения при старте
  useEffect(() => {
    try {
      validateEnv();
    } catch (error) {
      console.error('[App] Environment validation failed:', error);
      // В production можно показать ошибку пользователю
    }
  }, []);

  // OFFLINE-FIRST: Детектор первого запуска
  const [isFirstRun, setIsFirstRun] = useState(false);

  // OFFLINE-FIRST: Инициализация analytics
  useOfflineAnalytics();

  // Обработка сессии с фильтрацией ошибок
  useSession();

  useEffect(() => {
    // Проверяем, есть ли кэш (это не первый запуск)
    const checkFirstRun = async () => {
      try {
        // Проверяем IndexedDB
        const { get } = await import('idb-keyval');
        const cache = await get('SDADIM_REACT_QUERY_OFFLINE_CACHE');

        // ОПТИМИЗАЦИЯ SSG: Проверка navigator для безопасности
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        // Если кэша нет И мы offline - это первый запуск без интернета
        if (!cache && !isOnline) {
          console.warn('[App] First run without internet - cache not available');
          setIsFirstRun(true);
        } else {
          setIsFirstRun(false);
        }
      } catch (error) {
        console.error('[App] Failed to check first run:', error);
        setIsFirstRun(false);
      }
    };

    checkFirstRun();
  }, []);

  // ОПТИМИЗАЦИЯ: QueryClient и persister вынесены в AppProviders для lazy loading

  // ОПТИМИЗАЦИЯ: Фоновые задачи (не блокируют рендеринг)
  useBackgroundTasks();

  // ОПТИМИЗАЦИЯ SSG: Определяем basename для GitHub Pages безопасно
  // Используем useState + useEffect чтобы избежать проблем с window в SSG билде
  const [basename, setBasename] = useState('/');
  const [isGitHubPages, setIsGitHubPages] = useState(false);

  useEffect(() => {
    // Этот код выполнится ТОЛЬКО в браузере (не в SSG билде)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      const isGH = hostname === 'dmitry-kuzmin.github.io' || pathname.startsWith('/sdadim-dgt-prep');
      setIsGitHubPages(isGH);
      setBasename(isGH ? '/sdadim-dgt-prep' : '/');
    }
  }, []);

  // Обработка редиректа из 404.html для GitHub Pages
  useEffect(() => {
    if (typeof window !== 'undefined' && isGitHubPages) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('p');
      if (redirectPath) {
        // Удаляем query параметр и перенаправляем на правильный путь
        window.history.replaceState({}, '', basename + redirectPath);
      }
    }
  }, [basename, isGitHubPages]);

  // КРИТИЧНО: Обработка ошибок аутентификации из URL hash (например, expired OTP)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && (hash.includes('error=') || hash.includes('error_code='))) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description') || params.get('error');

        if (errorCode || errorDescription) {
          console.error('[App] Auth error detected in hash:', { errorCode, errorDescription });

          // Формируем понятное сообщение для пользователя
          let message = 'Ошибка аутентификации';
          if (errorCode === 'otp_expired') {
            message = 'Срок действия ссылки истек. Пожалуйста, запросите новую ссылку.';
          } else if (errorDescription) {
            message = decodeURIComponent(errorDescription).replace(/\+/g, ' ');
          }

          // Показываем уведомление
          // ВАЖНО: На лендинге теперь есть Toaster (глобальный)
          setTimeout(() => {
            toast.error(message, {
              duration: 10000, // Показываем долго, так как это важно
              id: 'auth-error-hash',
            });
          }, 1000);

          // Очищаем hash
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.error('[App] Failed to parse auth error from hash:', err);
      }
    }
  }, []);

  // КРИТИЧНО: Очистка URL от ~and~ паттернов (проблема с 404.html на Vercel)
  // ОПТИМИЗАЦИЯ SSG: Все обращения к window.location обёрнуты в проверку
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    // Проверяем наличие ~and~ в URL (признак проблемы с 404.html на Vercel)
    if (currentPath.includes('~and~') || currentSearch.includes('~and~')) {
      console.warn('[App] Detected ~and~ pattern in URL, cleaning up...');

      // Очищаем путь от ~and~
      const cleanPath = currentPath.replace(/~and~/g, '&');
      // Очищаем query параметры от ~and~
      const cleanSearch = currentSearch.replace(/~and~/g, '&');

      // Восстанавливаем правильный URL
      const cleanUrl = cleanPath + cleanSearch + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);

      // КРИТИЧНО: НЕ делаем автоматическую перезагрузку - это вызывает спонтанные релоады
      // React Router сам обработает изменение URL без перезагрузки страницы
      // window.location.reload(); // УДАЛЕНО - вызывает спонтанные перезагрузки
    }
  }, []);

  // Показываем сообщение при первом запуске без интернета

  if (isFirstRun) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              Welcome to Sdadim
            </h1>
            <p className="text-sm text-zinc-400">
              Please connect to the internet for the first launch
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-500 font-medium">
              After the first launch, the app will work offline with cached data.
            </p>
          </div>
          <button
            onClick={() => {
              // ОПТИМИЗАЦИЯ SSG: Проверка window для безопасности
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="w-full h-12 px-4 bg-white text-black font-semibold rounded-xl hover:shadow-lg transition-shadow"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <TelegramProvider>
      <AdCleanup />
      <Toaster />
      <Motion>
        <OfflineBanner />
        <OfflineQueueIndicator />
        <Suspense fallback={null}>
          <PWAInstallBanner />
        </Suspense>
        {/* ⚠️ ОТКЛЮЧЕНО: Service Worker отключен */}
        {/* КРИТИЧНО: Компонент для ручного обновления PWA при registerType: 'prompt' */}
        {/* <ReloadPrompt /> */}
        <Suspense fallback={null}>
          <BrowserRouter basename={basename}>
            <ScrollToTop />
            <ThemeColorManager />
            {/* ОПТИМИЗАЦИЯ: Landing рендерится БЕЗ AppProviders (без Supabase/Query) */}
            <Routes>
              <Route path="/" element={
                <Suspense fallback={null}>
                  <LandingRedirect />
                </Suspense>
              } />
              {/* OAuth callback - обрабатывает сессию сам, не требует AppProviders */}
              <Route path="/auth/callback" element={
                <>
                  <StartupCurtain />
                  <AuthCallback />
                </>
              } />
              {/* Paddle purchase - обрабатывает редирект от Paddle, не требует AppProviders */}
              <Route path="/purchase" element={
                <Suspense fallback={null}>
                  <StartupCurtain />
                  <Purchase />
                </Suspense>
              } />
              {/* Login page for mobile - standalone */}
              <Route path="/login" element={
                <Suspense fallback={null}>
                  <AppProviders>
                    <StartupCurtain />
                    <Login />
                  </AppProviders>
                </Suspense>
              } />
              {/* Все остальные роуты - внутри AppProviders (с Supabase/Query) */}
              {/* ОПТИМИЗАЦИЯ: AppProviders lazy - НЕ попадает в initial bundle для лендинга */}
              {/* Это критично для производительности - Supabase/Query грузятся только для /app/* */}
              <Route path="/*" element={
                <Suspense fallback={null}>
                  <AppProviders>
                    <Suspense fallback={null}>
                      <CosmeticsPreviewProvider>
                        <Suspense fallback={null}>
                          <DeepLinkHandler />
                          {/* OAuthCallbackHandler отключен - используем /auth/callback маршрут для OAuth */}
                          {/* Если нужно обрабатывать токены на других страницах - можно включить с проверкой pathname */}
                          {/* <OAuthCallbackHandler /> */}
                        </Suspense>
                        <AppRoutes />
                        {/* Глобальный менеджер модалок должен быть внутри провайдеров,
                          чтобы работали UserContext и QueryClient */}
                        <Suspense fallback={null}>
                          <GlobalModalManager />
                          <PerformanceMonitor />
                          <PasskeyOnboardingWrapper />
                          <AIChatWidget />
                          {/* UnifiedSettingsDrawer рендерится в AppProviders через GlobalSettingsManager */}
                        </Suspense>
                      </CosmeticsPreviewProvider>
                    </Suspense>
                  </AppProviders>
                </Suspense>
              } />
            </Routes>
            {/* ⚠️ ОТКЛЮЧЕНО: Service Worker отключен */}
            {/* Debug панель Service Worker (только в dev или с localStorage.debug_sw) */}
            {/* <ServiceWorkerDebug /> */}
          </BrowserRouter>
        </Suspense>
      </Motion>
      <Analytics />
    </TelegramProvider>
  );
};

export default App;
