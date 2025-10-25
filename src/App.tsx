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
import RaceGame from "./pages/games/RaceGame";
import MatchingGame from "./pages/games/MatchingGame";

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
          <Route path="/learning" element={<Learning />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/race" element={<RaceGame />} />
          <Route path="/games/matching" element={<MatchingGame />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
