import { Lock, CheckCircle2, Star, BookOpen, Dumbbell, Shield, Zap, Trophy, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topic, TopicProgress } from "./TopicCard";

interface DuolingoPathNodeProps {
  topic: Topic;
  progress?: TopicProgress;
  isLocked?: boolean;
  isActive?: boolean;
  isNext?: boolean;
  onClick?: () => void;
  className?: string;
}

// Определяем иконку для узла
const getTopicIcon = (topicNumber: number, isPremium: boolean) => {
  if (isPremium) {
    return Trophy;
  }
  
  // Разнообразие иконок для визуального интереса
  const icons = [BookOpen, Star, Dumbbell, Shield, Zap, Trophy, Circle];
  return icons[(topicNumber - 1) % icons.length] || BookOpen;
};

export const DuolingoPathNode = ({
  topic,
  progress,
  isLocked = false,
  isActive = false,
  isNext = false,
  onClick,
  className,
}: DuolingoPathNodeProps) => {
  const isCompleted = progress?.completed ?? false;
  const isUnlocked = progress?.isUnlocked ?? !isLocked;
  const Icon = getTopicIcon(topic.number, topic.is_premium);

  // Размер узла в зависимости от состояния (как в Duolingo)
  const nodeSize = isNext ? 64 : 56;
  const nodeSizePx = `${nodeSize}px`;

  // Стили узла в стиле Duolingo
  const getNodeStyles = () => {
    if (!isUnlocked) {
      return {
        background: "#E5E5E5",
        color: "#BABABA",
        border: "3px solid #FFFFFF",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      };
    }
    if (isCompleted) {
      return {
        background: "#58CC02",
        color: "#FFFFFF",
        border: "3px solid #FFFFFF",
        boxShadow: "0 4px 12px rgba(88, 204, 2, 0.3)",
      };
    }
    // Активная/доступная тема
    return {
      background: "#8CD4FF",
      color: "#1CB0F6",
      border: "3px solid #FFFFFF",
      boxShadow: "0 4px 12px rgba(140, 212, 255, 0.4)",
    };
  };

  const styles = getNodeStyles();

  return (
    <div
      className={cn(
        "relative flex flex-col items-center group",
        isUnlocked ? "cursor-pointer" : "cursor-not-allowed",
        className
      )}
      onClick={isUnlocked ? onClick : undefined}
    >
      {/* Узел - круглый, в стиле Duolingo */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          "hover:scale-110 active:scale-105",
          isNext && "scale-110 z-10",
          isActive && !isCompleted && "ring-4 ring-blue-200 ring-opacity-50",
          !isUnlocked && "opacity-70"
        )}
        style={{
          width: nodeSizePx,
          height: nodeSizePx,
          background: styles.background,
          border: styles.border,
          boxShadow: styles.boxShadow,
        }}
      >
        {/* Иконка внутри узла */}
        <div style={{ color: styles.color }}>
          {!isUnlocked ? (
            <Lock className="w-7 h-7" strokeWidth={2.5} />
          ) : isCompleted ? (
            <CheckCircle2 className="w-8 h-8" strokeWidth={3} />
          ) : (
            <Icon className="w-8 h-8" strokeWidth={2} />
          )}
        </div>

        {/* Premium badge */}
        {topic.is_premium && isUnlocked && !isCompleted && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFC800] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            <Star className="w-3 h-3 text-[#FF9600] fill-[#FF9600]" />
          </div>
        )}
      </div>
    </div>
  );
};

