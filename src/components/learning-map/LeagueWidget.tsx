import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Award, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeagueWidgetProps {
  rank?: string;
  xp?: number;
  className?: string;
}

// Определяем лигу на основе ранга или XP
const getLeagueInfo = (rank?: string, xp?: number) => {
  const rankLower = rank?.toLowerCase() || "";
  
  // Маппинг рангов на лиги
  if (rankLower.includes("бронз") || rankLower.includes("bronze")) {
    return {
      name: "Бронзовая лига",
      color: "bg-amber-600",
      icon: Trophy,
      description: "Начальный уровень",
    };
  }
  if (rankLower.includes("серебр") || rankLower.includes("silver")) {
    return {
      name: "Серебряная лига",
      color: "bg-gray-400",
      icon: Award,
      description: "Продолжайте обучение",
    };
  }
  if (rankLower.includes("золот") || rankLower.includes("gold")) {
    return {
      name: "Золотая лига",
      color: "bg-yellow-500",
      icon: Trophy,
      description: "Отличный прогресс!",
    };
  }
  if (rankLower.includes("сапфир") || rankLower.includes("sapphire")) {
    return {
      name: "Сапфировая лига",
      color: "bg-blue-500",
      icon: Trophy,
      description: "Высокий уровень",
    };
  }
  if (rankLower.includes("рубин") || rankLower.includes("ruby")) {
    return {
      name: "Рубиновая лига",
      color: "bg-red-500",
      icon: Trophy,
      description: "Превосходно!",
    };
  }
  if (rankLower.includes("алмаз") || rankLower.includes("diamond")) {
    return {
      name: "Алмазная лига",
      color: "bg-cyan-400",
      icon: Trophy,
      description: "Эксперт!",
    };
  }

  // По умолчанию - Бронзовая лига
  return {
    name: "Бронзовая лига",
    color: "bg-amber-600",
    icon: Trophy,
    description: "Начните обучение",
  };
};

export const LeagueWidget = ({ rank, xp = 0, className }: LeagueWidgetProps) => {
  const leagueInfo = getLeagueInfo(rank, xp);
  const Icon = leagueInfo.icon;

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{leagueInfo.name}</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7">
          ОБЗОР ЛИГИ
        </Button>
      </div>

      {/* Иллюстрация лиги */}
      <div className="relative h-24 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", leagueInfo.color)}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
        {/* Спящий персонаж (Zz) */}
        <div className="absolute top-2 right-2 text-2xl opacity-50">Zz</div>
      </div>

      {/* Описание */}
      <p className="text-sm text-muted-foreground text-center">
        Пройдите урок, чтобы войти в недельный рейтинг и сразиться с другими учащимися
      </p>

      {/* Статистика */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{xp.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">XP</span>
        </div>
      </div>
    </Card>
  );
};

