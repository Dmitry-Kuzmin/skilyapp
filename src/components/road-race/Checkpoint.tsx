import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, Zap, Target, Flame, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Route, GameStats } from "@/pages/games/RoadRace";

interface CheckpointProps {
  route: Route;
  stats: GameStats;
  onContinue: () => void;
  onExit: () => void;
}

export const Checkpoint = ({ route, stats, onContinue, onExit }: CheckpointProps) => {
  const accuracy = stats.correctAnswers + stats.incorrectAnswers > 0
    ? Math.round((stats.correctAnswers / (stats.correctAnswers + stats.incorrectAnswers)) * 100)
    : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 gradient-card border-primary/30 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mx-auto"
              >
                <Flag className="w-10 h-10 text-white" />
              </motion.div>

              <div>
                <h2 className="text-3xl font-bold mb-2">Контрольная точка!</h2>
                <p className="text-muted-foreground">
                  {stats.distance} км из {route.total_distance} км пройдено
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/20">
                    <Target className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Точность</p>
                    <p className="text-2xl font-bold text-success">{accuracy}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Макс. скорость</p>
                    <p className="text-2xl font-bold text-primary">{stats.maxSpeed} км/ч</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/20">
                    <Flame className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Макс. комбо</p>
                    <p className="text-2xl font-bold text-warning">x{stats.combo}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gold/20">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Очки</p>
                    <p className="text-2xl font-bold text-gold">{stats.score}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Bonus Info */}
            <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-warning" />
                <div className="flex-1">
                  <p className="font-semibold">Бонус за контрольную точку!</p>
                  <p className="text-sm text-muted-foreground">+500 очков и топливо восстановлено</p>
                </div>
                <Badge className="bg-success text-white">+500</Badge>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onExit} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Выйти
              </Button>
              <Button
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-primary to-accent"
              >
                Продолжить
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Progress Indicator */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Осталось {route.total_distance - stats.distance} км до финиша
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
