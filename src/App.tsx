import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Tests from "./pages/Tests";
import Learning from "./pages/Learning";
import Games from "./pages/Games";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Achievements from "./pages/Achievements";
import RaceGame from "./pages/games/RaceGame";
import MatchingGame from "./pages/games/MatchingGame";
import Duel from "./pages/games/Duel";
import TestSession from "./pages/TestSession";
import TestResults from "./pages/TestResults";
import RoadSigns from "./pages/RoadSigns";
import Dictionary from "./pages/Dictionary";
import DataImport from "./pages/DataImport";
import DailyBonus from "./pages/DailyBonus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/test/:mode" element={<TestSession />} />
          <Route path="/test/:mode/:topic" element={<TestSession />} />
          <Route path="/test/results" element={<TestResults />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/race" element={<RaceGame />} />
          <Route path="/games/matching" element={<MatchingGame />} />
          <Route path="/games/duel" element={<Duel />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/road-signs" element={<RoadSigns />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/data-import" element={<DataImport />} />
          <Route path="/daily-bonus" element={<DailyBonus />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
