import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { RouteSelection } from "@/components/road-race/RouteSelection";
import { RaceGame } from "@/components/road-race/RaceGame";
import { Checkpoint } from "@/components/road-race/Checkpoint";
import { Results } from "@/components/road-race/Results";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { PageLoader } from "@/components/PageLoader";

type GameState = "menu" | "game" | "checkpoint" | "results";

export interface Route {
  id: string;
  name_ru: string;
  name_es: string;
  name_en: string;
  description_ru: string;
  description_es: string;
  description_en: string;
  total_distance: number;
  difficulty: string;
  is_premium: boolean;
  question_mix: { signs: number; terms: number; questions: number };
  gradient_from: string;
  gradient_to: string;
  icon?: string;
  checkpoint_interval: number;
}

export interface Question {
  id: string;
  type: "sign" | "term" | "question";
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  image_url?: string;
}

export interface GameStats {
  distance: number;
  score: number;
  speed: number;
  fuel: number;
  combo: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  maxSpeed: number;
  checkpointsReached: number;
}

const RoadRace = () => {
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState>("menu");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameStats, setGameStats] = useState<GameStats>({
    distance: 0,
    score: 0,
    speed: 60,
    fuel: 100,
    combo: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    timeSpent: 0,
    maxSpeed: 60,
    checkpointsReached: 0,
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("road_race_routes")
        .select("*")
        .order("difficulty", { ascending: true });

      if (error) throw error;

      // Transform the data to match the Route interface
      const transformedRoutes: Route[] = (data || []).map(route => ({
        ...route,
        question_mix: typeof route.question_mix === 'string'
          ? JSON.parse(route.question_mix)
          : route.question_mix as { signs: number; terms: number; questions: number },
      }));

      setRoutes(transformedRoutes);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить маршруты",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setGameState("game");
    setGameStats({
      distance: 0,
      score: 0,
      speed: 60,
      fuel: 100,
      combo: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      timeSpent: 0,
      maxSpeed: 60,
      checkpointsReached: 0,
    });
  };

  const handleCheckpoint = (stats: GameStats) => {
    setGameStats(stats);
    setGameState("checkpoint");
  };

  const handleContinue = () => {
    setGameState("game");
  };

  const handleFinish = (stats: GameStats) => {
    setGameStats(stats);
    setGameState("results");
  };

  const handleBackToMenu = () => {
    setGameState("menu");
    setSelectedRoute(null);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Layout>
      {gameState === "menu" && (
        <RouteSelection routes={routes} onSelectRoute={handleRouteSelect} />
      )}

      {gameState === "game" && selectedRoute && (
        <RaceGame
          route={selectedRoute}
          stats={gameStats}
          onCheckpoint={handleCheckpoint}
          onFinish={handleFinish}
          onExit={handleBackToMenu}
        />
      )}

      {gameState === "checkpoint" && selectedRoute && (
        <Checkpoint
          route={selectedRoute}
          stats={gameStats}
          onContinue={handleContinue}
          onExit={handleBackToMenu}
        />
      )}

      {gameState === "results" && selectedRoute && (
        <Results
          route={selectedRoute}
          stats={gameStats}
          onPlayAgain={() => handleRouteSelect(selectedRoute)}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </Layout>
  );
};

export default RoadRace;
