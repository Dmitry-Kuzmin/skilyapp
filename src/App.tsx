import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useInitTelegram } from "@/hooks/useInitTelegram";

// Lazy load UI components - только тяжелые компоненты
// Легкие компоненты (Toaster, Sonner, TooltipProvider) оставляем синхронными для мгновенного отображения
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";

// Lazy load только тяжелые компоненты
const ReferralWelcome = lazy(() => import("@/components/ReferralWelcome").then(m => ({ default: m.ReferralWelcome })));
const DeepLinkHandler = lazy(() => import("@/components/DeepLinkHandler").then(m => ({ default: m.DeepLinkHandler })));
const CosmeticsPreviewProvider = lazy(() => import("@/contexts/CosmeticsPreviewContext").then(m => ({ default: m.CosmeticsPreviewProvider })));
const HallOfFameModal = lazy(() => import("@/components/HallOfFameModal").then(m => ({ default: m.HallOfFameModal })));
const DuelPassLeaderboardModal = lazy(() => import("@/components/leaderboard/DuelPassLeaderboardModal").then(m => ({ default: m.DuelPassLeaderboardModal })));

const Index = lazy(() => import("./pages/Index"));
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
const DuelLeaderboard = lazy(() => import("./pages/DuelLeaderboard"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Blog = lazy(() => import("./pages/Blog"));
const Article = lazy(() => import("./pages/Article"));

const App = () => {
  // Создаем QueryClient один раз с useMemo для оптимизации
  // ОПТИМИЗАЦИЯ: Улучшенные настройки кэширования для снижения нагрузки на Supabase
  const queryClient = useMemo(() => new QueryClient({
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
  }), []);
  // КРИТИЧЕСКИ ВАЖНО: инициализируем Telegram WebApp в самом начале
  useInitTelegram();
  
  // Referral welcome state
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Определяем basename для GitHub Pages
  // Если мы на GitHub Pages (dmitry-kuzmin.github.io), используем /sdadim-dgt-prep
  // Иначе используем /
  const isGitHubPages = window.location.hostname === 'dmitry-kuzmin.github.io' || 
                        window.location.pathname.startsWith('/sdadim-dgt-prep');
  const basename = isGitHubPages ? '/sdadim-dgt-prep' : '/';

  // Check for referral code and show welcome screen
  useEffect(() => {
    const checkReferralCode = () => {
      const code = sessionStorage.getItem('referral_code');
      if (code) {
        console.log('[App] Referral code detected:', code);
        setReferralCode(code);
        setShowReferralWelcome(true);
      }
    };
    
    // Небольшая задержка чтобы deep link успел обработаться
    setTimeout(checkReferralCode, 500);
  }, []);
  
  const handleAcceptReferral = () => {
    console.log('[App] Referral accepted, code will be used on login');
    setShowReferralWelcome(false);
    // Код останется в sessionStorage и будет использован при логине
  };
  
  const handleDeclineReferral = () => {
    console.log('[App] Referral declined');
    sessionStorage.removeItem('referral_code');
    setShowReferralWelcome(false);
    setReferralCode(null);
  };

  // Обработка редиректа из 404.html для GitHub Pages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('p');
    if (redirectPath && isGitHubPages) {
      // Удаляем query параметр и перенаправляем на правильный путь
      window.history.replaceState({}, '', basename + redirectPath);
    }
  }, [basename, isGitHubPages]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={null}>
          <CosmeticsPreviewProvider>
              {/* Referral Welcome Screen */}
              {showReferralWelcome && referralCode && (
                <Suspense fallback={null}>
                  <ReferralWelcome
                    referralCode={referralCode}
                    onAccept={handleAcceptReferral}
                    onDecline={handleDeclineReferral}
                  />
                </Suspense>
              )}
              
              <BrowserRouter basename={basename}>
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
          <Route path="/join/:code" element={<InviteLanding />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminQuestionReports />} />
            <Route path="editor" element={<AdminEditor />} />
            <Route path="sync" element={<AdminSync />} />
            <Route path="import" element={<AdminImport />} />
            <Route path="test-covers" element={<AdminTestCovers />} />
            <Route path="seasons" element={<AdminSeasonsManagement />} />
            <Route path="security" element={<AdminSecurityMonitoring />} />
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
              </BrowserRouter>
            </CosmeticsPreviewProvider>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
