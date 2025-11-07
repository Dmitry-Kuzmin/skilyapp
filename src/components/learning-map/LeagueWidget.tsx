import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Award, TrendingUp, BookOpen } from "lucide-react";
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
    <Card className={cn("p-5 space-y-4 bg-white border border-gray-200 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-900">{leagueInfo.name}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-7 text-[#1CB0F6] hover:text-[#1CB0F6]/80 hover:bg-[#1CB0F6]/10 px-2"
        >
          ОБЗОР ЛИГИ
        </Button>
      </div>

      {/* Иллюстрация лиги - Duolingo style */}
      <div className="relative h-32 bg-gradient-to-b from-[#58CC02]/10 to-transparent rounded-lg flex items-end justify-center overflow-hidden border border-[#58CC02]/20">
        {/* Холм (зеленый) */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#58CC02] rounded-t-full"></div>
        
        {/* Спящий персонаж (Zz) - Duolingo style */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="relative">
            {/* Простой персонаж */}
            <div className="w-12 h-12 bg-[#58CC02] rounded-full flex items-center justify-center border-2 border-white shadow-md">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            {/* Zz текст */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl font-bold text-gray-600">
              Zz
            </div>
          </div>
        </div>
      </div>

      {/* Описание */}
      <p className="text-sm text-gray-600 text-center leading-relaxed">
        Пройдите урок, чтобы войти в недельный рейтинг и сразиться с другими учащимися
      </p>
    </Card>
  );
};

