/**
 * AppRoutes - Роуты приложения, которые требуют Query провайдеры
 * Обернуты в AppProviders для lazy loading
 */

import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { TelegramNavigation } from "@/components/TelegramNavigation";
import { EdgeSwipeBack } from "@/components/navigation/EdgeSwipeBack";

/** Lightweight wrapper for public pages that need Telegram BackButton + swipe-back + safe-area.
 *  Applies global safe-area padding via CSS class so individual pages don't need <Page> wrappers. */
function TelegramShell({ children }: { children: ReactNode }) {
  return (
    <div className="telegram-public-page">
      <TelegramNavigation />
      <EdgeSwipeBack />
      {children}
    </div>
  );
}

// Lazy load всех страниц приложения
const Index = lazy(() => {

  return import("../pages/Index")
    .then((module) => {

      return module;
    })
    .catch((error) => {
      console.error("[AppRoutes] ❌ Failed to load Index module:", error);
      return { default: () => <PageLoader /> };
    });
});
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

const AdminMissionControl = lazy(() =>
  import("../pages/admin/AdminMissionControl").then((module) => ({ default: module.AdminMissionControl }))
);
const PartnerDashboard = lazy(() => import("../pages/PartnerDashboard"));
const ModernPartnerDashboard = lazy(() => import("../pages/ModernPartnerDashboard"));
const PartnerLinkRedirect = lazy(() => import("../pages/PartnerLinkRedirect"));
const AdminEditor = lazy(() => import("../pages/AdminEditor"));
const AdminQuestionReports = lazy(() => import("../pages/AdminQuestionReports"));
const AdminRewardReports = lazy(() =>
  import("../pages/admin/AdminRewardReports").then((module) => ({ default: module.AdminRewardReports }))
);
const RaceGame = lazy(() => import("../pages/games/RaceGame"));
const GuessTheSign = lazy(() => import("../pages/games/GuessTheSign"));
const MatchingGame = lazy(() => import("../pages/games/MatchingGame"));
const Duel = lazy(() => import("../pages/games/Duel"));
const FourVariantsGame = lazy(() => import("../pages/games/FourVariantsGame"));
const RoadRace = lazy(() => import("../pages/games/RoadRace"));
const FlashCardsGame = lazy(() => import("../pages/games/FlashCardsGame"));
const IntersectionGame = lazy(() => import("../pages/games/IntersectionGame"));
const ReferralRedirect = lazy(() => import("../components/ReferralRedirect").then(m => ({ default: m.ReferralRedirect })));
const PartnerRedirect = lazy(() => import("../components/PartnerRedirect").then(m => ({ default: m.PartnerRedirect })));
const SequentialTests = lazy(() => import("../pages/SequentialTests"));
const ChallengeBank = lazy(() => import("../pages/ChallengeBank"));
const Favorites = lazy(() => import("../pages/Favorites"));
const TestSession = lazy(() => import("../pages/TestSession"));
const TestResults = lazy(() => import("../pages/TestResults"));
const TopicsMode = lazy(() => import("../pages/TopicsMode"));
const RoadSigns = lazy(() => import("../pages/RoadSigns"));
const Dictionary = lazy(() => import("../pages/Dictionary"));

const DailyBonus = lazy(() => import("../pages/DailyBonus"));
const DGTTestsSimple = lazy(() => import("../pages/DGTTestsSimple"));
// Terms, Privacy, SubscriptionTerms, RefundPolicy moved to Legal.tsx or redirects
const About = lazy(() => import("../pages/About"));
const Features = lazy(() => import("../pages/Features"));
const Pricing = lazy(() => import("../pages/Pricing"));
// RefundPolicy logic deprecated in favor of Legal Hub redirects
// const RefundPolicy = ... (removed)
const Legal = lazy(() => import("../pages/Legal"));
const LegalRedirect = lazy(() => import("../pages/Legal").then(m => ({ default: m.LegalRedirect })));
const HelpCenter = lazy(() => import("../pages/HelpCenter"));
const Changelog = lazy(() => import("../pages/Changelog"));
const HandbookRussia = lazy(() => import("../pages/RussiaHandbook"));
const HandbookRussiaArticle = lazy(() => import("../pages/RussiaHandbookArticle"));
const Partners = lazy(() => import("../pages/Partners"));
const Blog = lazy(() => import("../pages/Blog"));
const Article = lazy(() => import("../pages/Article"));
const Inventory = lazy(() => import("../pages/Inventory"));
const PaymentSuccess = lazy(() => import("../pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("../pages/PaymentCancel"));
// Purchase обрабатывается в App.tsx (без AppProviders)
const InviteLanding = lazy(() => import("../pages/InviteLanding"));
// УДАЛЕНО: LearnCountrySelector и LearnCountryHome - больше не используются, Dashboard автоматически перестраивается

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
      {/* Handbook Routes */}
      <Route path="/learn/russia/handbook" element={
        <Suspense fallback={<PageSkeleton />}>
          <HandbookRussia />
        </Suspense>
      } />
      <Route path="/learn/russia/handbook/:id" element={
        <Suspense fallback={<PageSkeleton />}>
          <HandbookRussiaArticle />
        </Suspense>
      } />

      {/* Learning Paths */}
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
      <Route path="/tests/favorites" element={
        <Suspense fallback={<PageSkeleton />}>
          <Favorites />
        </Suspense>
      } />
      <Route path="/test/by-topics" element={
        <Suspense fallback={<PageSkeleton />}>
          <TopicsMode />
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
      <Route path="/games/intersection" element={
        <Suspense fallback={<PageSkeleton />}>
          <IntersectionGame />
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
        <Route path="reward-reports" element={
          <Suspense fallback={<PageSkeleton />}>
            <AdminRewardReports />
          </Suspense>
        } />
        <Route path="editor" element={
          <Suspense fallback={<PageSkeleton />}>
            <AdminEditor />
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
        <Route path="mission-control" element={
          <Suspense fallback={<PageSkeleton />}>
            <AdminMissionControl />
          </Suspense>
        } />
      </Route >
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
      {/* УДАЛЕНО: /learn и /learn/:country - теперь Dashboard автоматически перестраивается под выбранную страну */}
      {/* Оставляем только /learn/:country/ticket/:ticketId для прямых ссылок на билеты */}
      <Route path="/learn/:country/ticket/:ticketId" element={
        <Suspense fallback={<PageSkeleton />}>
          <TestSession />
        </Suspense>
      } />
      {/* Legal Hub с вложенными роутами */}
      <Route path="/legal" element={
        <Suspense fallback={<PageSkeleton />}>
          <LegalRedirect />
        </Suspense>
      } />
      <Route path="/legal/:tab" element={
        <Suspense fallback={<PageSkeleton />}>
          <Legal />
        </Suspense>
      } />
      {/* Redirects for legacy legal routes */}
      <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
      <Route path="/cookies" element={<Navigate to="/legal/cookies" replace />} />
      <Route path="/subscription-terms" element={<Navigate to="/legal/subscription" replace />} />
      <Route path="/refund-policy" element={<Navigate to="/legal/refund" replace />} />
      <Route path="/about" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><About /></TelegramShell>
        </Suspense>
      } />
      <Route path="/features" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><Features /></TelegramShell>
        </Suspense>
      } />
      <Route path="/pricing" element={
        <Suspense fallback={<PageSkeleton />}>
          <Pricing />
        </Suspense>
      } />
      <Route path="/help/changelog" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><Changelog /></TelegramShell>
        </Suspense>
      } />
      <Route path="/help" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><HelpCenter /></TelegramShell>
        </Suspense>
      } />
      <Route path="/partners" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><Partners /></TelegramShell>
        </Suspense>
      } />
      <Route path="/blog" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><Blog /></TelegramShell>
        </Suspense>
      } />
      <Route path="/blog/:slug" element={
        <Suspense fallback={<PageSkeleton />}>
          <TelegramShell><Article /></TelegramShell>
        </Suspense>
      } />
      <Route path="/stats" element={<Navigate to="/" replace />} />
      <Route path="/duel-leaderboard" element={<Navigate to="/" replace />} />
      <Route path="/inventory" element={
        <Suspense fallback={<PageSkeleton />}>
          <Inventory />
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
    </Routes >
  );
}

