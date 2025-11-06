import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Car, Shield, Zap, Lock, Trophy } from "lucide-react";
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
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Дорожная Гонка
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Выбери маршрут и докажи свои знания ПДД! Каждый вопрос — это километр пути к победе
        </p>
      </div>

      {/* Stats Banner */}
      <Card className="p-6 gradient-card border-primary/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Trophy className="w-6 h-6 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold text-primary">12</p>
            <p className="text-xs text-muted-foreground">Маршрутов пройдено</p>
          </div>
          <div>
            <MapPin className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-primary">1,240</p>
            <p className="text-xs text-muted-foreground">Километров</p>
          </div>
          <div>
            <Zap className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold text-primary">156</p>
            <p className="text-xs text-muted-foreground">Макс. скорость</p>
          </div>
        </div>
      </Card>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {routes.map((route) => {
          const IconComponent = iconMap[route.icon || "MapPin"] || MapPin;
          
          return (
            <Card
              key={route.id}
              className="group relative overflow-hidden gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${route.gradient_from}15, ${route.gradient_to}15)`,
              }}
            >
              {route.is_premium && (
                <Badge className="absolute top-4 right-4 gradient-gold border-none">
                  <Lock className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}

              <div className="p-6 space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center w-16 h-16 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${route.gradient_from}, ${route.gradient_to})`,
                    }}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{route.name_ru}</h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={difficultyColors[route.difficulty as keyof typeof difficultyColors]}
                      >
                        {route.difficulty === "easy" && "Легко"}
                        {route.difficulty === "medium" && "Средне"}
                        {route.difficulty === "hard" && "Сложно"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {route.total_distance} км
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground min-h-[40px]">
                  {route.description_ru}
                </p>

                {/* Question Mix */}
                <div className="flex gap-2 text-xs">
                  <Badge variant="secondary">
                    🚦 {route.question_mix.signs}%
                  </Badge>
                  <Badge variant="secondary">
                    📚 {route.question_mix.terms}%
                  </Badge>
                  <Badge variant="secondary">
                    📝 {route.question_mix.questions}%
                  </Badge>
                </div>

                {/* Start Button */}
                <Button
                  className="w-full group-hover:shadow-primary"
                  onClick={() => onSelectRoute(route)}
                  disabled={route.is_premium}
                  style={{
                    background: route.is_premium
                      ? undefined
                      : `linear-gradient(135deg, ${route.gradient_from}, ${route.gradient_to})`,
                  }}
                >
                  {route.is_premium ? "Разблокировать Premium" : "Начать гонку"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
