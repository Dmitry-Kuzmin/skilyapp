import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Target, Clock, Flame, Star, Share2, Home, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import type { Route, GameStats } from "@/pages/games/RoadRace";

interface ResultsProps {
  route: Route;
  stats: GameStats;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const Results = ({ route, stats, onPlayAgain, onBackToMenu }: ResultsProps) => {
  const { width, height } = useWindowSize();
  
  const accuracy = Math.round((stats.correctAnswers / (stats.correctAnswers + stats.incorrectAnswers)) * 100);
  const avgSpeed = Math.round(stats.maxSpeed * 0.75);

  useEffect(() => {
    sounds.victory();
    haptics.victory();
    saveResults();
  }, []);

  const saveResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Save session
      await supabase.from("road_race_sessions").insert({
        user_id: profile.id,
        route_id: route.id,
        total_distance: route.total_distance,
        distance_completed: stats.distance,
        total_questions: stats.correctAnswers + stats.incorrectAnswers,
        correct_answers: stats.correctAnswers,
        incorrect_answers: stats.incorrectAnswers,
        final_score: stats.score,
        max_speed: stats.maxSpeed,
        avg_speed: avgSpeed,
        fuel_remaining: stats.fuel,
        combo_max: stats.combo,
        time_spent_seconds: stats.timeSpent,
        checkpoints_reached: stats.checkpointsReached,
        completed: stats.distance >= route.total_distance,
        completed_at: stats.distance >= route.total_distance ? new Date().toISOString() : null,
      });

      // Update leaderboard
      await supabase.from("road_race_leaderboard").upsert({
        user_id: profile.id,
        route_id: route.id,
        score: stats.score,
        time_spent_seconds: stats.timeSpent,
        avg_speed: avgSpeed,
        accuracy_percent: accuracy,
      });

      // Update profile
      const coinsToAdd = Math.floor(stats.score / 10);
      const xpToAdd = stats.score;
      
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("coins, xp")
        .eq("id", profile.id)
        .single();
      
      if (currentProfile) {
        await supabase.from("profiles").update({
          coins: (currentProfile.coins || 0) + coinsToAdd,
          xp: (currentProfile.xp || 0) + xpToAdd,
        }).eq("id", profile.id);
      }

    } catch (error: any) {
      console.error("Error saving results:", error);
    }
  };

  const getGrade = () => {
    if (accuracy >= 90) return { grade: "S", color: "text-gold", bg: "bg-gold/20" };
    if (accuracy >= 80) return { grade: "A", color: "text-primary", bg: "bg-primary/20" };
    if (accuracy >= 70) return { grade: "B", color: "text-success", bg: "bg-success/20" };
    if (accuracy >= 60) return { grade: "C", color: "text-warning", bg: "bg-warning/20" };
    return { grade: "D", color: "text-destructive", bg: "bg-destructive/20" };
  };

  const grade = getGrade();
  const completed = stats.distance >= route.total_distance;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-gold/5 relative overflow-hidden">
      {completed && width && height && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl"
      >
        <Card className="p-8 gradient-card border-gold/30 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="relative space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2 }}
                className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${grade.bg} mx-auto`}
              >
                <span className={`text-5xl font-bold ${grade.color}`}>{grade.grade}</span>
              </motion.div>

              <div>
                <h2 className="text-4xl font-bold mb-2">
                  {completed ? "Маршрут пройден!" : "Гонка окончена"}
                </h2>
                <p className="text-xl text-muted-foreground">{route.name_ru}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge className="bg-gold text-white">
                    <Trophy className="w-3 h-3 mr-1" />
                    {stats.score} очков
                  </Badge>
                  {completed && (
                    <Badge className="bg-success text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Завершено!
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-background/50 text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Точность</p>
              </Card>

              <Card className="p-4 bg-background/50 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.maxSpeed}</p>
                <p className="text-xs text-muted-foreground">Макс. скорость</p>
              </Card>

              <Card className="p-4 bg-background/50 text-center">
                <Flame className="w-6 h-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">x{stats.combo}</p>
                <p className="text-xs text-muted-foreground">Макс. комбо</p>
              </Card>

              <Card className="p-4 bg-background/50 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-bold">{Math.floor(stats.timeSpent / 60)}м</p>
                <p className="text-xs text-muted-foreground">Время</p>
              </Card>
            </div>

            {/* Summary */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Пройдено</p>
                  <p className="text-xl font-bold">{stats.distance} км</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Правильных</p>
                  <p className="text-xl font-bold text-success">{stats.correctAnswers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ошибок</p>
                  <p className="text-xl font-bold text-destructive">{stats.incorrectAnswers}</p>
                </div>
              </div>
            </Card>

            {/* Rewards */}
            <Card className="p-6 bg-gradient-to-r from-gold/10 to-primary/10">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold" />
                Награды
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🪙</div>
                  <div>
                    <p className="font-bold">+{Math.floor(stats.score / 10)}</p>
                    <p className="text-xs text-muted-foreground">Монет</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⭐</div>
                  <div>
                    <p className="font-bold">+{stats.score}</p>
                    <p className="text-xs text-muted-foreground">Опыта</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" onClick={onBackToMenu}>
                <Home className="w-4 h-4 mr-2" />
                В меню
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Поделиться
              </Button>
              <Button
                onClick={onPlayAgain}
                className="bg-gradient-to-r from-primary to-accent"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Еще раз
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
