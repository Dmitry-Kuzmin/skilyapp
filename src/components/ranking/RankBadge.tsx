import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Star, Crown, Award, Sparkles } from "lucide-react";

export type RankType = "rookie" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

interface RankBadgeProps {
  rank: RankType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const rankConfig = {
  rookie: {
    name: "Новичок",
    nameShort: "R",
    color: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    icon: Star,
    gradient: "from-gray-400 to-gray-600",
  },
  bronze: {
    name: "Бронза",
    nameShort: "B",
    color: "bg-orange-500/20 text-orange-700 border-orange-500/30",
    icon: Award,
    gradient: "from-orange-400 to-orange-600",
  },
  silver: {
    name: "Серебро",
    nameShort: "S",
    color: "bg-gray-300/20 text-gray-600 border-gray-300/30",
    icon: Award,
    gradient: "from-gray-200 to-gray-400",
  },
  gold: {
    name: "Золото",
    nameShort: "G",
    color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    icon: Trophy,
    gradient: "from-yellow-400 to-yellow-600",
  },
  platinum: {
    name: "Платина",
    nameShort: "P",
    color: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    icon: Sparkles,
    gradient: "from-blue-300 to-blue-500",
  },
  diamond: {
    name: "Алмаз",
    nameShort: "D",
    color: "bg-purple-500/20 text-purple-700 border-purple-500/30",
    icon: Sparkles,
    gradient: "from-purple-400 to-purple-600",
  },
  master: {
    name: "Мастер",
    nameShort: "M",
    color: "bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-red-500/30 text-yellow-900 border-yellow-500/50",
    icon: Crown,
    gradient: "from-yellow-400 via-orange-500 to-red-500",
  },
};

const sizeConfig = {
  sm: {
    badge: "text-xs px-2 py-0.5",
    icon: "w-3 h-3",
  },
  md: {
    badge: "text-sm px-2.5 py-1",
    icon: "w-4 h-4",
  },
  lg: {
    badge: "text-base px-3 py-1.5",
    icon: "w-5 h-5",
  },
};

export function RankBadge({ rank, size = "md", showIcon = true, className }: RankBadgeProps) {
  const config = rankConfig[rank];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold",
        config.color,
        sizeStyle.badge,
        rank === "master" && "animate-pulse",
        className
      )}
    >
      {showIcon && <Icon className={cn(sizeStyle.icon)} />}
      <span>{config.name}</span>
    </Badge>
  );
}

// Компонент для отображения только иконки ранга
export function RankIcon({ rank, size = "md", className }: Omit<RankBadgeProps, "showIcon">) {
  const config = rankConfig[rank];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        `bg-gradient-to-br ${config.gradient}`,
        size === "sm" && "w-6 h-6",
        size === "md" && "w-8 h-8",
        size === "lg" && "w-10 h-10",
        rank === "master" && "animate-pulse ring-2 ring-yellow-400/50",
        className
      )}
    >
      <Icon className={cn(sizeStyle.icon, "text-white")} />
    </div>
  );
}

// Функция для получения ранга на основе уровня Duel Pass
export function getRankFromLevel(level: number): RankType {
  if (level >= 26) return "diamond";
  if (level >= 21) return "platinum";
  if (level >= 16) return "gold";
  if (level >= 11) return "silver";
  if (level >= 6) return "bronze";
  return "rookie";
}

// Функция для получения названия ранга
export function getRankName(rank: RankType): string {
  return rankConfig[rank].name;
}

