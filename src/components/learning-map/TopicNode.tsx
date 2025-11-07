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
  
  const nodeSize = 80;
  const nodeSizePx = `${nodeSize}px`;

  // Определяем стили для узла
  const getNodeStyles = () => {
    if (!isUnlocked) {
      return {
        background: "#d1d5db",
        border: "3px solid #9ca3af",
      };
    }
    if (isCompleted) {
      return {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        border: "3px solid #059669",
      };
    }
    return {
      background: `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`,
      border: `3px solid ${topic.gradient_to}`,
    };
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center group",
        isUnlocked ? "cursor-pointer" : "cursor-not-allowed",
        className
      )}
      onClick={isUnlocked ? onClick : undefined}
    >
      {/* Узел */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300 topic-node",
          "shadow-lg hover:shadow-xl",
          isActive && "active",
          !isUnlocked && "opacity-60"
        )}
        style={{
          width: nodeSizePx,
          height: nodeSizePx,
          ...getNodeStyles(),
        }}
      >
        {/* Иконка внутри узла */}
        <div className="text-white">
          {!isUnlocked ? (
            <Lock className="w-8 h-8" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-10 h-10" strokeWidth={3} />
          ) : (
            <Icon className="w-10 h-10" strokeWidth={2} />
          )}
        </div>

        {/* Premium badge */}
        {topic.is_premium && isUnlocked && !isCompleted && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white z-10">
            <Star className="w-3 h-3 text-yellow-800 fill-yellow-800" />
          </div>
        )}
      </div>

      {/* Название темы под узлом */}
      <div className="mt-2 text-center max-w-[100px]">
        <p
          className={cn(
            "text-xs font-semibold leading-tight",
            isUnlocked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {topic.title_ru}
        </p>
        {progress && isUnlocked && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {progress.completedSubtopicCount}/{progress.totalSubtopicCount}
          </p>
        )}
      </div>

      {/* Tooltip при наведении */}
      {isUnlocked && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
            {topic.title_ru}
            {topic.is_premium && " ⭐"}
          </div>
        </div>
      )}
    </div>
  );
};

