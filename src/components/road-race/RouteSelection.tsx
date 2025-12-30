import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Car, Shield, Zap, Lock, Trophy } from "lucide-react";
import { motion } from "@/components/optimized/Motion";
import type { Route } from "@/pages/games/RoadRace";

interface RouteSelectionProps {
  routes: Route[];
  onSelectRoute: (route: Route) => void;
}

const iconMap: Record<string, any> = {
  MapPin,
  Car,
  Shield,
  Zap,
};

const difficultyColors = {
  easy: "bg-success/20 text-success border-success/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  hard: "bg-destructive/20 text-destructive border-destructive/30",
};

export const RouteSelection = ({ routes, onSelectRoute }: RouteSelectionProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container mx-auto px-4 py-8 space-y-8 pb-24 md:pb-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
            Carrera de Conocimientos
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Elige tu ruta y demuestra tus conocimientos. ¡Cada pregunta es un kilómetro hacia la victoria!
          </p>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-6 text-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="space-y-2"
              >
                <Trophy className="w-8 h-8 mx-auto text-gold drop-shadow-glow" />
                <p className="text-3xl font-bold bg-gradient-to-br from-gold to-warning bg-clip-text text-transparent">12</p>
                <p className="text-xs text-muted-foreground">Rutas completadas</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="space-y-2"
              >
                <MapPin className="w-8 h-8 mx-auto text-accent drop-shadow-glow" />
                <p className="text-3xl font-bold bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">1,240</p>
                <p className="text-xs text-muted-foreground">Kilómetros</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="space-y-2"
              >
                <Zap className="w-8 h-8 mx-auto text-warning drop-shadow-glow" />
                <p className="text-3xl font-bold bg-gradient-to-br from-warning to-destructive bg-clip-text text-transparent">156</p>
                <p className="text-xs text-muted-foreground">Vel. máxima</p>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Routes Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, staggerChildren: 0.1 }}
        >
          {routes.map((route, idx) => {
          const IconComponent = iconMap[route.icon || "MapPin"] || MapPin;
          
          return (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Card
                className="group relative overflow-hidden border-border/50 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${route.gradient_from}20, ${route.gradient_to}20)`,
                }}
              >
                {route.is_premium && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Badge className="absolute top-4 right-4 bg-gradient-to-r from-gold to-warning text-gold-foreground border-gold/30 shadow-lg">
                      <Lock className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  </motion.div>
                )}

                <div className="p-6 md:p-8 space-y-5">
                  {/* Icon & Title */}
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="flex items-center justify-center w-20 h-20 rounded-2xl shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${route.gradient_from}, ${route.gradient_to})`,
                      }}
                    >
                      <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />
                    </motion.div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-2xl font-bold">{route.name_es}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`${difficultyColors[route.difficulty as keyof typeof difficultyColors]} font-semibold`}
                        >
                          {route.difficulty === "easy" && "Fácil"}
                          {route.difficulty === "medium" && "Medio"}
                          {route.difficulty === "hard" && "Difícil"}
                        </Badge>
                        <Badge variant="outline" className="bg-primary/10 border-primary/30">
                          <MapPin className="w-3 h-3 mr-1" />
                          {route.total_distance} km
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm md:text-base text-muted-foreground min-h-[60px] leading-relaxed">
                    {route.description_es}
                  </p>

                  {/* Question Mix */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-primary/10 border-primary/20">
                      🚦 Señales {route.question_mix.signs}%
                    </Badge>
                    <Badge variant="secondary" className="bg-accent/10 border-accent/20">
                      📚 Términos {route.question_mix.terms}%
                    </Badge>
                    <Badge variant="secondary" className="bg-warning/10 border-warning/20">
                      📝 Preguntas {route.question_mix.questions}%
                    </Badge>
                  </div>

                  {/* Start Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      className="w-full h-14 text-lg font-semibold shadow-lg group-hover:shadow-2xl transition-all"
                      onClick={() => onSelectRoute(route)}
                      disabled={route.is_premium}
                      style={{
                        background: route.is_premium
                          ? undefined
                          : `linear-gradient(135deg, ${route.gradient_from}, ${route.gradient_to})`,
                      }}
                    >
                      {route.is_premium ? "Desbloquear Premium" : "Comenzar Carrera"}
                      <Car className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          );
        })}
        </motion.div>
      </div>
    </div>
  );
};
