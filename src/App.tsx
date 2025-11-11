import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useInitTelegram } from "@/hooks/useInitTelegram";
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
import { AdminScraper } from "./pages/admin/AdminScraper";
import AdminEditor from "./pages/AdminEditor";
import AdminQuestionReports from "./pages/AdminQuestionReports";
import Achievements from "./pages/Achievements";
import RaceGame from "./pages/games/RaceGame";
import GuessTheSign from "./pages/games/GuessTheSign";
import MatchingGame from "./pages/games/MatchingGame";
import Duel from "./pages/games/Duel";
import FourVariantsGame from "./pages/games/FourVariantsGame";
import RoadRace from "./pages/games/RoadRace";
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

const queryClient = new QueryClient();

const App = () => {
  // КРИТИЧЕСКИ ВАЖНО: инициализируем Telegram WebApp в самом начале
  useInitTelegram();

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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminQuestionReports />} />
            <Route path="editor" element={<AdminEditor />} />
            <Route path="sync" element={<AdminSync />} />
            <Route path="import" element={<AdminImport />} />
            <Route path="scraper" element={<AdminScraper />} />
          </Route>
          <Route path="/road-signs" element={<RoadSigns />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/data-import" element={<DataImport />} />
          <Route path="/daily-bonus" element={<DailyBonus />} />
          <Route path="/dgt-tests" element={<DGTTestsSimple />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
