import { Star, Dumbbell, Trophy, Lock, CheckCircle2, Zap, BookOpen, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topic, TopicProgress } from "./TopicCard";

interface TopicNodeProps {
  topic: Topic;
  progress?: TopicProgress;
  isLocked?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

// Определяем иконку для узла в зависимости от номера темы
const getTopicIcon = (topicNumber: number, isPremium: boolean) => {
  if (isPremium) {
    return Trophy;
  }
  
  // Чередуем иконки для разнообразия
  const iconMap: Record<number, typeof Star> = {
    1: Star,
    2: Dumbbell,
    3: Shield,
    4: Zap,
    5: BookOpen,
  };
  
  return iconMap[topicNumber % 5] || Star;
};

export const TopicNode = ({ 
  topic, 
  progress, 
  isLocked = false, 
  isActive = false,
  onClick,
  className 
}: TopicNodeProps) => {
  const isCompleted = progress?.completed ?? false;
  const isUnlocked = progress?.isUnlocked ?? !isLocked;
  const Icon = getTopicIcon(topic.number, topic.is_premium);
  
  // Duolingo style: квадратные узлы с закругленными углами, размер ~72px
  const nodeSize = 72;
  const nodeSizePx = `${nodeSize}px`;

  // Определяем стили для узла (Duolingo colors)
  const getNodeStyles = () => {
    if (!isUnlocked) {
      return {
        background: "#E5E5E5",
        border: "none",
        color: "#BABABA",
      };
    }
    if (isCompleted) {
      return {
        background: "#58CC02",
        border: "none",
        color: "#FFFFFF",
      };
    }
    // Активные узлы - синий цвет (как в Duolingo)
    return {
      background: "#8CD4FF",
      border: "none",
      color: "#1CB0F6",
    };
  };

  const nodeStyles = getNodeStyles();

  return (
    <div
      className={cn(
        "relative flex flex-col items-center group",
        isUnlocked ? "cursor-pointer" : "cursor-not-allowed",
        className
      )}
      onClick={isUnlocked ? onClick : undefined}
    >
      {/* Узел - квадратный с закругленными углами (Duolingo style) */}
      <div
        className={cn(
          "relative rounded-xl flex items-center justify-center transition-all duration-300",
          "shadow-md hover:shadow-lg hover:scale-105",
          isActive && !isCompleted && "ring-4 ring-[#1CB0F6]/30",
          !isUnlocked && "opacity-70"
        )}
        style={{
          width: nodeSizePx,
          height: nodeSizePx,
          background: nodeStyles.background,
          border: nodeStyles.border,
        }}
      >
        {/* Иконка внутри узла */}
        <div style={{ color: nodeStyles.color }}>
          {!isUnlocked ? (
            <Lock className="w-8 h-8" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-9 h-9" strokeWidth={2.5} />
          ) : (
            <Icon className="w-9 h-9" strokeWidth={2} />
          )}
        </div>

        {/* Premium badge - золотой (Duolingo style) */}
        {topic.is_premium && isUnlocked && !isCompleted && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFC800] rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm">
            <Star className="w-3 h-3 text-[#FF9600] fill-[#FF9600]" />
          </div>
        )}
      </div>

      {/* Название темы под узлом - убираем для Duolingo style, или делаем очень маленьким */}
    </div>
  );
};

