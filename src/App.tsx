import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useInitTelegram } from "@/hooks/useInitTelegram";
import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Lazy load UI components - только тяжелые компоненты
// Легкие компоненты (Toaster, Sonner, TooltipProvider) оставляем синхронными для мгновенного отображения
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { ReferralRedirect } from "@/components/ReferralRedirect";
import { PartnerRedirect } from "@/components/PartnerRedirect";

// Lazy load только тяжелые компоненты
const DeepLinkHandler = lazy(() => import("@/components/DeepLinkHandler").then(m => ({ default: m.DeepLinkHandler })));
const CosmeticsPreviewProvider = lazy(() => import("@/contexts/CosmeticsPreviewContext").then(m => ({ default: m.CosmeticsPreviewProvider })));
const HallOfFameModal = lazy(() => import("@/components/HallOfFameModal").then(m => ({ default: m.HallOfFameModal })));
const DuelPassLeaderboardModal = lazy(() => import("@/components/leaderboard/DuelPassLeaderboardModal").then(m => ({ default: m.DuelPassLeaderboardModal })));
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { GlobalModalManager } from "@/components/GlobalModalManager";

// Обработка ошибок для lazy loading Index (dashboard)
const IndexErrorFallback = () => {
  useEffect(() => {
    console.error("[App] Index (dashboard) module failed to load");
    const timer = setTimeout(() => {
      window.location.reload();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  return <PageLoader />;
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
const Tests = lazy(() => import("./pages/Tests"));
const Learning = lazy(() => import("./pages/Learning"));
const Games = lazy(() => import("./pages/Games"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() =>
  import("./components/admin/AdminLayout").then((module) => ({ default: module.AdminLayout }))
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard }))
);
const AdminSync = lazy(() =>
  import("./pages/admin/AdminSync").then((module) => ({ default: module.AdminSync }))
);
const AdminImport = lazy(() =>
  import("./pages/admin/AdminImport").then((module) => ({ default: module.AdminImport }))
);
const AdminTestCovers = lazy(() =>
  import("./pages/admin/AdminTestCovers").then((module) => ({ default: module.AdminTestCovers }))
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
const DataImport = lazy(() => import("./pages/DataImport"));
const DailyBonus = lazy(() => import("./pages/DailyBonus"));
const DGTTestsSimple = lazy(() => import("./pages/DGTTestsSimple"));
const ChallengeBank = lazy(() => import("./pages/ChallengeBank"));
const Referrals = lazy(() => import("./pages/Referrals"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const SubscriptionTerms = lazy(() => import("./pages/SubscriptionTerms"));
const Pricing = lazy(() => import("./pages/Pricing"));
// Компонент для обработки ошибок загрузки RefundPolicy
function RefundPolicyErrorFallback() {
  useEffect(() => {
    console.error("[App] RefundPolicy module failed to load");
    // Перезагружаем страницу через небольшую задержку
    const timer = setTimeout(() => {
      window.location.reload();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  return <PageLoader />;
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
const DuelLeaderboard = lazy(() => import("./pages/DuelLeaderboard"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Blog = lazy(() => import("./pages/Blog"));
const Article = lazy(() => import("./pages/Article"));

// Глобальный компонент для прокрутки наверх при смене роута
// Работает для всех страниц, включая те, которые не используют Layout
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Прокручиваем наверх при каждой смене роута
    // Используем requestAnimationFrame для плавности и избежания конфликтов с рендерингом
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [pathname]);

  return null;
};

const App = () => {
  // Создаем QueryClient один раз с useMemo для оптимизации
  // ОПТИМИЗАЦИЯ: Улучшенные настройки кэширования для снижения нагрузки на Supabase
  const queryClient = useMemo(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими дольше
          gcTime: 10 * 60 * 1000, // 10 минут (было cacheTime, переименовано в v5)
          refetchOnWindowFocus: false, // Не перезапрашиваем при фокусе окна
          refetchOnMount: false, // Не перезапрашиваем при монтировании, если данные свежие
          refetchOnReconnect: true, // Перезапрашиваем только при восстановлении соединения
          retry: 1, // Минимум повторных попыток
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Экспоненциальная задержка
        },
        mutations: {
          retry: 1, // Минимум повторных попыток для мутаций
        },
      },
    });

    // 🚀 PERSIST CACHE: Мгновенная загрузка как в Telegram!
    // Кэш сохраняется в localStorage и восстанавливается при следующем визите
    if (typeof window !== 'undefined') {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: 'SKILYAPP_QUERY_CACHE', // Уникальный ключ для нашего приложения
      });

      persistQueryClient({
        queryClient: client,
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 часа - максимальный возраст кэша
        dehydrateOptions: {
          // Не сохраняем ошибки и бесконечные запросы
          shouldDehydrateQuery: (query) => {
            return query.state.status === 'success';
          },
        },
      });

      console.log('[App] 💾 Persist cache initialized - instant load enabled!');
    }

    return client;
  }, []);
  
  // КРИТИЧЕСКИ ВАЖНО: инициализируем Telegram WebApp в самом начале
  useInitTelegram();
  
  // ОПТИМИЗАЦИЯ: Фоновые задачи (не блокируют рендеринг)
  useBackgroundTasks();
  
  // Определяем basename для GitHub Pages
  // Если мы на GitHub Pages (dmitry-kuzmin.github.io), используем /sdadim-dgt-prep
  // Иначе используем /
  const isGitHubPages = window.location.hostname === 'dmitry-kuzmin.github.io' || 
                        window.location.pathname.startsWith('/sdadim-dgt-prep');
  const basename = isGitHubPages ? '/sdadim-dgt-prep' : '/';

  // Обработка редиректа из 404.html для GitHub Pages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('p');
    if (redirectPath && isGitHubPages) {
      // Удаляем query параметр и перенаправляем на правильный путь
      window.history.replaceState({}, '', basename + redirectPath);
    }
  }, [basename, isGitHubPages]);

  // КРИТИЧНО: Очистка URL от ~and~ паттернов (проблема с 404.html на Vercel)
  useEffect(() => {
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
      
      // Перезагружаем страницу для применения правильного роутинга
      window.location.reload();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={null}>
          <CosmeticsPreviewProvider>
              <BrowserRouter basename={basename}>
                <ScrollToTop />
                <Suspense fallback={null}>
                  <DeepLinkHandler />
                </Suspense>
                <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/learning-map" element={<LearningMap />} />
          <Route path="/topic/:id" element={<TopicDetail />} />
          <Route path="/subtopic/:id" element={<SubtopicDetail />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/tests/sequential" element={<SequentialTests />} />
          <Route path="/tests/challenge-bank" element={<ChallengeBank />} />
          <Route path="/test/:mode" element={<TestSession />} />
          <Route path="/test/:mode/:topic" element={<TestSession />} />
          <Route path="/test/sequential/:testId" element={<TestSession />} />
          <Route path="/test/challenge-bank" element={<TestSession />} />
          <Route path="/test/results" element={<TestResults />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/race" element={<RaceGame />} />
          <Route path="/games/guess-sign" element={<GuessTheSign />} />
          <Route path="/games/matching" element={<MatchingGame />} />
          <Route path="/games/duel" element={<Duel />} />
          <Route path="/games/four-variants" element={<FourVariantsGame />} />
          <Route path="/games/road-race" element={<RoadRace />} />
          <Route path="/games/flashcards" element={<FlashCardsGame />} />
          <Route path="/referrals" element={<Referrals />} />
                    <Route path="/join/:code" element={<ReferralRedirect />} />
                    <Route path="/partner/:code" element={<PartnerRedirect />} />
                    <Route path="/go/:code" element={<PartnerLinkRedirect />} />
          <Route path="/partner/dashboard" element={<ModernPartnerDashboard />} />
          <Route path="/partner/dashboard-old" element={<PartnerDashboard />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminQuestionReports />} />
            <Route path="editor" element={<AdminEditor />} />
            <Route path="sync" element={<AdminSync />} />
            <Route path="import" element={<AdminImport />} />
            <Route path="test-covers" element={<AdminTestCovers />} />
            <Route path="seasons" element={<AdminSeasonsManagement />} />
            <Route path="security" element={<AdminSecurityMonitoring />} />
            <Route path="partners" element={<AdminPartners />} />
            <Route path="marketing" element={<AdminMarketingMaterials />} />
          </Route>
          <Route path="/road-signs" element={<RoadSigns />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/data-import" element={<DataImport />} />
          <Route path="/daily-bonus" element={<DailyBonus />} />
          <Route path="/dgt-tests" element={<DGTTestsSimple />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/subscription-terms" element={<SubscriptionTerms />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Article />} />
          <Route path="/duel-leaderboard" element={<DuelLeaderboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/success" element={<PaymentSuccess />} />
          <Route path="/cancel" element={<PaymentCancel />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
                </Suspense>
                {/* Модалки, доступные на всех страницах */}
                <Suspense fallback={null}>
                  <HallOfFameModal />
                  <DuelPassLeaderboardModal />
                </Suspense>
                {/* Глобальный менеджер модалок для Instagram-подобного поведения */}
                <GlobalModalManager />
                <PerformanceMonitor />
              </BrowserRouter>
            </CosmeticsPreviewProvider>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
