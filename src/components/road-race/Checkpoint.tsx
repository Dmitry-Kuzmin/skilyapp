import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Gauge, Fuel, Flame, ArrowRight, X, Star } from "lucide-react";
import { motion } from "@/components/optimized/Motion";
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${route.gradient_from}10, ${route.gradient_to}10)`,
      }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <Card className="p-8 md:p-12 bg-background/95 backdrop-blur-xl border-primary/40 shadow-2xl">
          <div className="text-center space-y-8">
            {/* Title */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
                <Star className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ¡Punto de Control!
              </h1>
              <p className="text-lg text-muted-foreground">
                Has recorrido <span className="font-bold text-primary">{stats.distance} km</span> de {route.total_distance} km
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                className="p-5 bg-gradient-to-br from-gold/20 to-warning/20 border border-gold/30 rounded-xl"
                whileHover={{ scale: 1.05 }}
              >
                <Trophy className="w-8 h-8 mx-auto mb-2 text-gold drop-shadow-glow" />
                <p className="text-3xl font-bold text-gold">{stats.score}</p>
                <p className="text-xs text-muted-foreground">Puntos</p>
              </motion.div>

              <motion.div 
                className="p-5 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-xl"
                whileHover={{ scale: 1.05 }}
              >
                <Gauge className="w-8 h-8 mx-auto mb-2 text-primary drop-shadow-glow" />
                <p className="text-3xl font-bold text-primary">{stats.speed}</p>
                <p className="text-xs text-muted-foreground">km/h</p>
              </motion.div>

              <motion.div 
                className="p-5 bg-gradient-to-br from-success/20 to-primary/20 border border-success/30 rounded-xl"
                whileHover={{ scale: 1.05 }}
              >
                <Fuel className="w-8 h-8 mx-auto mb-2 text-success drop-shadow-glow" />
                <p className="text-3xl font-bold text-success">{stats.fuel}%</p>
                <p className="text-xs text-muted-foreground">Combustible</p>
              </motion.div>

              <motion.div 
                className="p-5 bg-gradient-to-br from-warning/20 to-destructive/20 border border-warning/30 rounded-xl"
                whileHover={{ scale: 1.05 }}
              >
                <Flame className="w-8 h-8 mx-auto mb-2 text-warning drop-shadow-glow" />
                <p className="text-3xl font-bold text-warning">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Precisión</p>
              </motion.div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              className="flex gap-4 pt-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                variant="outline"
                onClick={onExit}
                className="flex-1 h-14 text-lg border-2 hover:bg-destructive/10 hover:border-destructive"
              >
                <X className="w-5 h-5 mr-2" />
                Salir
              </Button>
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={onContinue}
                  className="w-full h-14 text-lg font-semibold shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${route.gradient_from}, ${route.gradient_to})`,
                  }}
                >
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};