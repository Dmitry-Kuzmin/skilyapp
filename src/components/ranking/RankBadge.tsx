import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Star, Crown, Award, Sparkles, Gem } from "lucide-react";
import { motion } from "framer-motion";

export type RankType = "rookie" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

interface RankBadgeProps {
  rank: RankType;
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  variant?: "badge" | "pill" | "minimal" | "subtle";
}

const rankConfig = {
  rookie: {
    name: "Новичок",
    nameShort: "R",
    bgGradient: "from-gray-500/20 via-gray-400/20 to-gray-500/20",
    textColor: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-500/40",
    icon: Star,
    iconGradient: "from-gray-400 to-gray-600",
    shadow: "shadow-gray-500/20",
    glow: "shadow-[0_0_8px_rgba(107,114,128,0.3)]",
  },
  bronze: {
    name: "Бронза",
    nameShort: "B",
    bgGradient: "from-orange-600/20 via-orange-500/20 to-amber-600/20",
    textColor: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-500/50",
    icon: Award,
    iconGradient: "from-orange-400 via-amber-500 to-orange-600",
    shadow: "shadow-orange-500/30",
    glow: "shadow-[0_0_12px_rgba(251,146,60,0.4)]",
  },
  silver: {
    name: "Серебро",
    nameShort: "S",
    bgGradient: "from-gray-300/30 via-gray-200/30 to-gray-300/30",
    textColor: "text-gray-700 dark:text-gray-200",
    borderColor: "border-gray-300/60",
    icon: Award,
    iconGradient: "from-gray-200 via-gray-100 to-gray-300",
    shadow: "shadow-gray-300/40",
    glow: "shadow-[0_0_12px_rgba(209,213,219,0.5)]",
  },
  gold: {
    name: "Золото",
    nameShort: "G",
    bgGradient: "from-yellow-500/30 via-amber-500/30 to-yellow-600/30",
    textColor: "text-yellow-800 dark:text-yellow-200",
    borderColor: "border-yellow-500/60",
    icon: Trophy,
    iconGradient: "from-yellow-400 via-amber-400 to-yellow-600",
    shadow: "shadow-yellow-500/40",
    glow: "shadow-[0_0_16px_rgba(234,179,8,0.5)]",
  },
  platinum: {
    name: "Платина",
    nameShort: "P",
    bgGradient: "from-blue-400/30 via-cyan-400/30 to-blue-500/30",
    textColor: "text-blue-700 dark:text-blue-200",
    borderColor: "border-blue-400/60",
    icon: Sparkles,
    iconGradient: "from-blue-300 via-cyan-300 to-blue-500",
    shadow: "shadow-blue-500/40",
    glow: "shadow-[0_0_16px_rgba(59,130,246,0.5)]",
  },
  diamond: {
    name: "Алмаз",
    nameShort: "D",
    bgGradient: "from-purple-500/30 via-violet-500/30 to-purple-600/30",
    textColor: "text-purple-700 dark:text-purple-200",
    borderColor: "border-purple-500/60",
    icon: Gem,
    iconGradient: "from-purple-400 via-violet-400 to-purple-600",
    shadow: "shadow-purple-500/40",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.6)]",
  },
  master: {
    name: "Мастер",
    nameShort: "M",
    bgGradient: "from-yellow-500/40 via-orange-500/40 via-red-500/40 to-yellow-500/40",
    textColor: "text-yellow-900 dark:text-yellow-100",
    borderColor: "border-yellow-500/70",
    icon: Crown,
    iconGradient: "from-yellow-400 via-orange-500 via-red-500 to-yellow-400",
    shadow: "shadow-yellow-500/50",
    glow: "shadow-[0_0_24px_rgba(234,179,8,0.7)]",
  },
};

const sizeConfig = {
  xs: {
    badge: "text-[11px] px-2 py-0.5",
    pill: "text-xs px-2.5 py-0.5",
    icon: "w-3 h-3",
    iconContainer: "w-4 h-4",
  },
  sm: {
    badge: "text-xs px-2.5 py-1",
    pill: "text-xs px-3 py-1",
    icon: "w-3 h-3",
    iconContainer: "w-5 h-5",
  },
  md: {
    badge: "text-sm px-3 py-1.5",
    pill: "text-sm px-4 py-2",
    icon: "w-4 h-4",
    iconContainer: "w-6 h-6",
  },
  lg: {
    badge: "text-base px-4 py-2",
    pill: "text-base px-5 py-2.5",
    icon: "w-5 h-5",
    iconContainer: "w-8 h-8",
  },
};

export function RankBadge({ 
  rank, 
  size = "md", 
  showIcon = true, 
  variant = "badge",
  className 
}: RankBadgeProps) {
  const config = rankConfig[rank];
  const sizeStyle = sizeConfig[size] ?? sizeConfig.sm;
  const Icon = config.icon;
  const isMaster = rank === "master";

  if (variant === "minimal") {
    return (
      <span className={cn("font-semibold", config.textColor, sizeStyle.badge, className)}>
        {config.name}
      </span>
    );
  }

  if (variant === "subtle") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-white/15 bg-background/70 text-xs font-semibold shadow-inner",
          config.textColor,
          sizeStyle.badge,
          className
        )}
      >
        {showIcon && <Icon className={cn(sizeStyle.icon, "opacity-70")} />}
        {config.name}
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "inline-flex items-center gap-2 font-semibold rounded-full border-2 backdrop-blur-sm",
          `bg-gradient-to-r ${config.bgGradient}`,
          config.borderColor,
          config.textColor,
          sizeStyle.pill,
          config.shadow,
          isMaster && "animate-pulse",
          className
        )}
        style={{
          boxShadow: isMaster ? config.glow : undefined,
        }}
      >
        {showIcon && (
          <div className={cn(
            "rounded-full flex items-center justify-center",
            `bg-gradient-to-br ${config.iconGradient}`,
            sizeStyle.iconContainer
          )}>
            <Icon className={cn(sizeStyle.icon, "text-white drop-shadow-sm")} />
          </div>
        )}
        <span className="font-bold">{config.name}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-lg border-2 backdrop-blur-sm transition-all",
        `bg-gradient-to-r ${config.bgGradient}`,
        config.borderColor,
        config.textColor,
        sizeStyle.badge,
        config.shadow,
        isMaster && "animate-pulse",
        className
      )}
      style={{
        boxShadow: isMaster ? config.glow : undefined,
      }}
    >
      {showIcon && (
        <Icon className={cn(
          sizeStyle.icon,
          `text-gradient-to-r ${config.iconGradient}`,
          "drop-shadow-sm"
        )} />
      )}
      <span className="font-bold">{config.name}</span>
    </motion.div>
  );
}

// Компонент для отображения только иконки ранга
export function RankIcon({ rank, size = "md", className }: Omit<RankBadgeProps, "showIcon">) {
  const config = rankConfig[rank];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;
  const isMaster = rank === "master";

  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 5 }}
      className={cn(
        "rounded-full flex items-center justify-center relative overflow-hidden",
        `bg-gradient-to-br ${config.iconGradient}`,
        size === "sm" && "w-6 h-6",
        size === "md" && "w-8 h-8",
        size === "lg" && "w-10 h-10",
        config.shadow,
        isMaster && "ring-2 ring-yellow-400/50 animate-pulse",
        className
      )}
      style={{
        boxShadow: isMaster ? config.glow : undefined,
      }}
    >
      {/* Эффект свечения */}
      {isMaster && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <Icon className={cn(sizeStyle.icon, "text-white drop-shadow-lg relative z-10")} />
    </motion.div>
  );
}

// Компонент для рамки ранга вокруг аватара
export function RankFrame({ 
  rank, 
  className 
}: { 
  rank: RankType; 
  className?: string;
}) {
  const config = rankConfig[rank];
  const isMaster = rank === "master";

  if (rank === "rookie") {
    return null; // Новички без рамки
  }

  return (
    <motion.div
      className={cn(
        "absolute -inset-0.5 rounded-full border-2 pointer-events-none",
        config.borderColor,
        isMaster && "animate-pulse",
        className
      )}
      style={{
        boxShadow: isMaster ? config.glow : undefined,
      }}
      animate={isMaster ? {
        boxShadow: [
          config.glow,
          `0 0 32px rgba(234,179,8,0.8)`,
          config.glow,
        ],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Градиентная обводка для высоких рангов */}
      {(rank === "diamond" || rank === "master") && (
        <div className={cn(
          "absolute inset-0 rounded-full",
          `bg-gradient-to-r ${config.bgGradient}`,
          "opacity-20 blur-sm"
        )} />
      )}
    </motion.div>
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

