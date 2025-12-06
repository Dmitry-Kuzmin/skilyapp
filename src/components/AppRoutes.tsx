/**
 * AppRoutes - Роуты приложения, которые требуют Query провайдеры
 * Обернуты в AppProviders для lazy loading
 */

import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";

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
const InviteLanding = lazy(() => import("../pages/InviteLanding"));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ОПТИМИЗАЦИЯ: Убрали клиентский редирект - серверный редирект настроен в vercel.json */}
        <Route path="/" element={<Index />} />
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
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<Article />} />
        <Route path="/duel-leaderboard" element={<DuelLeaderboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/success" element={<PaymentSuccess />} />
        <Route path="/cancel" element={<PaymentCancel />} />
        <Route path="/invite/:code" element={<InviteLanding />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

