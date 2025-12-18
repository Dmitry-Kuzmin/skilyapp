/**
 * AppRoutes - Роуты приложения, которые требуют Query провайдеры
 * Обернуты в AppProviders для lazy loading
 */

import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { PageSkeleton } from "@/components/PageSkeleton";

// Lazy load всех страниц приложения
const Index = lazy(() => 
  import("../pages/Index").catch((error) => {
    console.error("[AppRoutes] Failed to load Index module:", error);
    return { default: () => <PageLoader /> };
  })
);
const LearningMap = lazy(() => import("../pages/LearningMap"));
const TopicDetail = lazy(() => import("../pages/TopicDetail"));
const SubtopicDetail = lazy(() => import("../pages/SubtopicDetail"));
const Tests = lazy(() => import("../pages/Tests"));
const Learning = lazy(() => import("../pages/Learning"));
const Games = lazy(() => import("../pages/Games"));
const NotFound = lazy(() => import("../pages/NotFound"));
const AdminLayout = lazy(() =>
  import("../components/admin/AdminLayout").then((module) => ({ default: module.AdminLayout }))
);
const AdminDashboard = lazy(() =>
  import("../pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard }))
);
const AdminSync = lazy(() =>
  import("../pages/admin/AdminSync").then((module) => ({ default: module.AdminSync }))
);
const AdminImport = lazy(() =>
  import("../pages/admin/AdminImport").then((module) => ({ default: module.AdminImport }))
);
const AdminTestCovers = lazy(() =>
  import("../pages/admin/AdminTestCovers").then((module) => ({ default: module.AdminTestCovers }))
);
const AdminSeasonsManagement = lazy(() =>
  import("../pages/admin/AdminSeasonsManagement").then((module) => ({ default: module.AdminSeasonsManagement }))
);
const AdminSecurityMonitoring = lazy(() =>
  import("../pages/admin/AdminSecurityMonitoring").then((module) => ({ default: module.AdminSecurityMonitoring }))
);
const AdminPartners = lazy(() =>
  import("../pages/admin/AdminPartners").then((module) => ({ default: module.AdminPartners }))
);
const AdminMarketingMaterials = lazy(() =>
  import("../pages/admin/AdminMarketingMaterials").then((module) => ({ default: module.AdminMarketingMaterials }))
);
const AdminPDDRussia = lazy(() =>
  import("../pages/admin/AdminPDDRussia").then((module) => ({ default: module.AdminPDDRussia }))
);
const PartnerDashboard = lazy(() => import("../pages/PartnerDashboard"));
const ModernPartnerDashboard = lazy(() => import("../pages/ModernPartnerDashboard"));
const PartnerLinkRedirect = lazy(() => import("../pages/PartnerLinkRedirect"));
const AdminEditor = lazy(() => import("../pages/AdminEditor"));
const AdminQuestionReports = lazy(() => import("../pages/AdminQuestionReports"));
const RaceGame = lazy(() => import("../pages/games/RaceGame"));
const GuessTheSign = lazy(() => import("../pages/games/GuessTheSign"));
const MatchingGame = lazy(() => import("../pages/games/MatchingGame"));
const Duel = lazy(() => import("../pages/games/Duel"));
const FourVariantsGame = lazy(() => import("../pages/games/FourVariantsGame"));
const RoadRace = lazy(() => import("../pages/games/RoadRace"));
const FlashCardsGame = lazy(() => import("../pages/games/FlashCardsGame"));
const Referrals = lazy(() => import("../pages/Referrals"));
const ReferralRedirect = lazy(() => import("../components/ReferralRedirect").then(m => ({ default: m.ReferralRedirect })));
const PartnerRedirect = lazy(() => import("../components/PartnerRedirect").then(m => ({ default: m.PartnerRedirect })));
const SequentialTests = lazy(() => import("../pages/SequentialTests"));
const ChallengeBank = lazy(() => import("../pages/ChallengeBank"));
const TestSession = lazy(() => import("../pages/TestSession"));
const TestResults = lazy(() => import("../pages/TestResults"));
const RoadSigns = lazy(() => import("../pages/RoadSigns"));
const Dictionary = lazy(() => import("../pages/Dictionary"));
const DataImport = lazy(() => import("../pages/DataImport"));
const DailyBonus = lazy(() => import("../pages/DailyBonus"));
const DGTTestsSimple = lazy(() => import("../pages/DGTTestsSimple"));
const Terms = lazy(() => import("../pages/Terms"));
const Privacy = lazy(() => import("../pages/Privacy"));
const SubscriptionTerms = lazy(() => import("../pages/SubscriptionTerms"));
const About = lazy(() => import("../pages/About"));
const Pricing = lazy(() => import("../pages/Pricing"));
const RefundPolicy = lazy(() => 
  import("../pages/RefundPolicy").catch((error) => {
    console.error("[AppRoutes] Failed to load RefundPolicy module:", error);
    return { default: () => <PageLoader /> };
  })
);
const HelpCenter = lazy(() => import("../pages/HelpCenter"));
const Partners = lazy(() => import("../pages/Partners"));
const Blog = lazy(() => import("../pages/Blog"));
const Article = lazy(() => import("../pages/Article"));
const DuelLeaderboard = lazy(() => import("../pages/DuelLeaderboard"));
const Inventory = lazy(() => import("../pages/Inventory"));
const Settings = lazy(() => import("../pages/Settings"));
const PaymentSuccess = lazy(() => import("../pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("../pages/PaymentCancel"));
// Purchase обрабатывается в App.tsx (без AppProviders)
const InviteLanding = lazy(() => import("../pages/InviteLanding"));
const LearnCountrySelector = lazy(() => import("../pages/learn/LearnCountrySelector"));
const LearnCountryHome = lazy(() => import("../pages/learn/LearnCountryHome"));

export function AppRoutes() {
  // КРИТИЧНО: AppRoutes рендерится внутри AppProviders, поэтому UserContext доступен
  // Все компоненты здесь могут использовать useUserContext()
  // АРХИТЕКТУРА: Все lazy-loaded страницы обернуты в Suspense с PageSkeleton для плавных переходов
  return (
    <Routes>
        {/* ОПТИМИЗАЦИЯ: Роут "/" вынесен в App.tsx (рендерится БЕЗ AppProviders) */}
        {/* <Route path="/" element={<Index />} /> */}
        <Route path="/dashboard" element={
          <Suspense fallback={<PageSkeleton />}>
            <Index />
          </Suspense>
        } />
        <Route path="/learning-map" element={
          <Suspense fallback={<PageSkeleton />}>
            <LearningMap />
          </Suspense>
        } />
        <Route path="/topic/:id" element={
          <Suspense fallback={<PageSkeleton />}>
            <TopicDetail />
          </Suspense>
        } />
        <Route path="/subtopic/:id" element={
          <Suspense fallback={<PageSkeleton />}>
            <SubtopicDetail />
          </Suspense>
        } />
        <Route path="/tests" element={
          <Suspense fallback={<PageSkeleton />}>
            <Tests />
          </Suspense>
        } />
        <Route path="/tests/sequential" element={
          <Suspense fallback={<PageSkeleton />}>
            <SequentialTests />
          </Suspense>
        } />
        <Route path="/tests/challenge-bank" element={
          <Suspense fallback={<PageSkeleton />}>
            <ChallengeBank />
          </Suspense>
        } />
        <Route path="/test/:mode" element={
          <Suspense fallback={<PageSkeleton />}>
            <TestSession />
          </Suspense>
        } />
        <Route path="/test/:mode/:topic" element={
          <Suspense fallback={<PageSkeleton />}>
            <TestSession />
          </Suspense>
        } />
        <Route path="/test/sequential/:testId" element={
          <Suspense fallback={<PageSkeleton />}>
            <TestSession />
          </Suspense>
        } />
        <Route path="/test/challenge-bank" element={
          <Suspense fallback={<PageSkeleton />}>
            <TestSession />
          </Suspense>
        } />
        <Route path="/test/results" element={
          <Suspense fallback={<PageSkeleton />}>
            <TestResults />
          </Suspense>
        } />
        <Route path="/learning" element={
          <Suspense fallback={<PageSkeleton />}>
            <Learning />
          </Suspense>
        } />
        <Route path="/games" element={
          <Suspense fallback={<PageSkeleton />}>
            <Games />
          </Suspense>
        } />
        <Route path="/games/race" element={
          <Suspense fallback={<PageSkeleton />}>
            <RaceGame />
          </Suspense>
        } />
        <Route path="/games/guess-sign" element={
          <Suspense fallback={<PageSkeleton />}>
            <GuessTheSign />
          </Suspense>
        } />
        <Route path="/games/matching" element={
          <Suspense fallback={<PageSkeleton />}>
            <MatchingGame />
          </Suspense>
        } />
        <Route path="/games/duel" element={
          <Suspense fallback={<PageSkeleton />}>
            <Duel />
          </Suspense>
        } />
        <Route path="/games/four-variants" element={
          <Suspense fallback={<PageSkeleton />}>
            <FourVariantsGame />
          </Suspense>
        } />
        <Route path="/games/road-race" element={
          <Suspense fallback={<PageSkeleton />}>
            <RoadRace />
          </Suspense>
        } />
        <Route path="/games/flashcards" element={
          <Suspense fallback={<PageSkeleton />}>
            <FlashCardsGame />
          </Suspense>
        } />
        <Route path="/referrals" element={
          <Suspense fallback={<PageSkeleton />}>
            <Referrals />
          </Suspense>
        } />
        <Route path="/join/:code" element={
          <Suspense fallback={<PageSkeleton />}>
            <ReferralRedirect />
          </Suspense>
        } />
        <Route path="/partner/:code" element={
          <Suspense fallback={<PageSkeleton />}>
            <PartnerRedirect />
          </Suspense>
        } />
        <Route path="/go/:code" element={
          <Suspense fallback={<PageSkeleton />}>
            <PartnerLinkRedirect />
          </Suspense>
        } />
        <Route path="/partner/dashboard" element={
          <Suspense fallback={<PageSkeleton />}>
            <ModernPartnerDashboard />
          </Suspense>
        } />
        <Route path="/partner/dashboard-old" element={
          <Suspense fallback={<PageSkeleton />}>
            <PartnerDashboard />
          </Suspense>
        } />
        <Route path="/admin" element={
          <Suspense fallback={<PageSkeleton />}>
            <AdminLayout />
          </Suspense>
        }>
          <Route index element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminDashboard />
            </Suspense>
          } />
          <Route path="reports" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminQuestionReports />
            </Suspense>
          } />
          <Route path="editor" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminEditor />
            </Suspense>
          } />
          <Route path="sync" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminSync />
            </Suspense>
          } />
          <Route path="import" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminImport />
            </Suspense>
          } />
          <Route path="test-covers" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminTestCovers />
            </Suspense>
          } />
          <Route path="seasons" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminSeasonsManagement />
            </Suspense>
          } />
          <Route path="security" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminSecurityMonitoring />
            </Suspense>
          } />
          <Route path="partners" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminPartners />
            </Suspense>
          } />
          <Route path="marketing" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminMarketingMaterials />
            </Suspense>
          } />
          <Route path="pdd-russia" element={
            <Suspense fallback={<PageSkeleton />}>
              <AdminPDDRussia />
            </Suspense>
          } />
        </Route>
        <Route path="/road-signs" element={
          <Suspense fallback={<PageSkeleton />}>
            <RoadSigns />
          </Suspense>
        } />
        <Route path="/dictionary" element={
          <Suspense fallback={<PageSkeleton />}>
            <Dictionary />
          </Suspense>
        } />
        <Route path="/data-import" element={
          <Suspense fallback={<PageSkeleton />}>
            <DataImport />
          </Suspense>
        } />
        <Route path="/daily-bonus" element={
          <Suspense fallback={<PageSkeleton />}>
            <DailyBonus />
          </Suspense>
        } />
        <Route path="/dgt-tests" element={
          <Suspense fallback={<PageSkeleton />}>
            <DGTTestsSimple />
          </Suspense>
        } />
        <Route path="/learn" element={
          <Suspense fallback={<PageSkeleton />}>
            <LearnCountrySelector />
          </Suspense>
        } />
        <Route path="/learn/:country" element={
          <Suspense fallback={<PageSkeleton />}>
            <LearnCountryHome />
          </Suspense>
        } />
        <Route path="/terms" element={
          <Suspense fallback={<PageSkeleton />}>
            <Terms />
          </Suspense>
        } />
        <Route path="/privacy" element={
          <Suspense fallback={<PageSkeleton />}>
            <Privacy />
          </Suspense>
        } />
        <Route path="/subscription-terms" element={
          <Suspense fallback={<PageSkeleton />}>
            <SubscriptionTerms />
          </Suspense>
        } />
        <Route path="/about" element={
          <Suspense fallback={<PageSkeleton />}>
            <About />
          </Suspense>
        } />
        <Route path="/pricing" element={
          <Suspense fallback={<PageSkeleton />}>
            <Pricing />
          </Suspense>
        } />
        <Route path="/refund-policy" element={
          <Suspense fallback={<PageSkeleton />}>
            <RefundPolicy />
          </Suspense>
        } />
        <Route path="/help" element={
          <Suspense fallback={<PageSkeleton />}>
            <HelpCenter />
          </Suspense>
        } />
        <Route path="/partners" element={
          <Suspense fallback={<PageSkeleton />}>
            <Partners />
          </Suspense>
        } />
        <Route path="/blog" element={
          <Suspense fallback={<PageSkeleton />}>
            <Blog />
          </Suspense>
        } />
        <Route path="/blog/:slug" element={
          <Suspense fallback={<PageSkeleton />}>
            <Article />
          </Suspense>
        } />
        <Route path="/duel-leaderboard" element={
          <Suspense fallback={<PageSkeleton />}>
            <DuelLeaderboard />
          </Suspense>
        } />
        <Route path="/inventory" element={
          <Suspense fallback={<PageSkeleton />}>
            <Inventory />
          </Suspense>
        } />
        <Route path="/settings" element={
          <Suspense fallback={<PageSkeleton />}>
            <Settings />
          </Suspense>
        } />
        {/* /purchase обрабатывается в App.tsx (без AppProviders) */}
        <Route path="/purchase/success" element={
          <Suspense fallback={<PageSkeleton />}>
            <PaymentSuccess />
          </Suspense>
        } />
        <Route path="/purchase/cancel" element={
          <Suspense fallback={<PageSkeleton />}>
            <PaymentCancel />
          </Suspense>
        } />
        <Route path="/success" element={
          <Suspense fallback={<PageSkeleton />}>
            <PaymentSuccess />
          </Suspense>
        } />
        <Route path="/cancel" element={
          <Suspense fallback={<PageSkeleton />}>
            <PaymentCancel />
          </Suspense>
        } />
        <Route path="/invite/:code" element={
          <Suspense fallback={<PageSkeleton />}>
            <InviteLanding />
          </Suspense>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={
          <Suspense fallback={<PageSkeleton />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
  );
}

