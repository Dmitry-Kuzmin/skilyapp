import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useInitTelegram } from "@/hooks/useInitTelegram";
import { ReferralWelcome } from "@/components/ReferralWelcome";
import Index from "./pages/Index";
import LearningMap from "./pages/LearningMap";
import TopicDetail from "./pages/TopicDetail";
import SubtopicDetail from "./pages/SubtopicDetail";
import Tests from "./pages/Tests";
import Learning from "./pages/Learning";
import Games from "./pages/Games";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminSync } from "./pages/admin/AdminSync";
import { AdminImport } from "./pages/admin/AdminImport";
import AdminEditor from "./pages/AdminEditor";
import AdminQuestionReports from "./pages/AdminQuestionReports";
import Achievements from "./pages/Achievements";
import RaceGame from "./pages/games/RaceGame";
import GuessTheSign from "./pages/games/GuessTheSign";
import MatchingGame from "./pages/games/MatchingGame";
import Duel from "./pages/games/Duel";
import FourVariantsGame from "./pages/games/FourVariantsGame";
import RoadRace from "./pages/games/RoadRace";
import FlashCardsGame from "./pages/games/FlashCardsGame";
import TestSession from "./pages/TestSession";
import TestResults from "./pages/TestResults";
import SequentialTests from "./pages/SequentialTests";
import RoadSigns from "./pages/RoadSigns";
import Dictionary from "./pages/Dictionary";
import DataImport from "./pages/DataImport";
import DailyBonus from "./pages/DailyBonus";
import DGTTestsSimple from "./pages/DGTTestsSimple";
import ChallengeBank from "./pages/ChallengeBank";
import Referrals from "./pages/Referrals";
import InviteLanding from "./pages/InviteLanding";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import SubscriptionTerms from "./pages/SubscriptionTerms";
import HelpCenter from "./pages/HelpCenter";
import DuelLeaderboard from "./pages/DuelLeaderboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";

const queryClient = new QueryClient();

const App = () => {
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
        
        {/* Referral Welcome Screen */}
        {showReferralWelcome && referralCode && (
          <ReferralWelcome
            referralCode={referralCode}
            onAccept={handleAcceptReferral}
            onDecline={handleDeclineReferral}
          />
        )}
        
        <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<LearningMap />} />
          <Route path="/dashboard" element={<Index />} />
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
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/join/:code" element={<InviteLanding />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminQuestionReports />} />
            <Route path="editor" element={<AdminEditor />} />
            <Route path="sync" element={<AdminSync />} />
            <Route path="import" element={<AdminImport />} />
          </Route>
          <Route path="/road-signs" element={<RoadSigns />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/data-import" element={<DataImport />} />
          <Route path="/daily-bonus" element={<DailyBonus />} />
          <Route path="/dgt-tests" element={<DGTTestsSimple />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/subscription-terms" element={<SubscriptionTerms />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/duel-leaderboard" element={<DuelLeaderboard />} />
          <Route path="/success" element={<PaymentSuccess />} />
          <Route path="/cancel" element={<PaymentCancel />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
