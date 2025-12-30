import { Lock, CheckCircle2, Star, BookOpen, Dumbbell, Shield, Zap, Trophy, Circle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topic, TopicProgress } from "./TopicCard";
import { motion } from "@/components/optimized/Motion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

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

  // Размер узла в зависимости от состояния (как в Duolingo) - уменьшены для более компактного вида
  const nodeSize = isNext ? 56 : 48;
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
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "relative flex flex-col items-center group",
            isUnlocked ? "cursor-pointer" : "cursor-not-allowed",
            className
          )}
          onClick={isUnlocked ? onClick : undefined}
        >
          {/* Узел - круглый, в стиле Duolingo */}
          <motion.div
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
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
        whileHover={isUnlocked ? { scale: 1.15, rotate: [0, -5, 5, 0] } : {}}
        whileTap={isUnlocked ? { scale: 0.95 } : {}}
        animate={
          isNext
            ? {
                scale: [1.1, 1.15, 1.1],
                boxShadow: [
                  "0 4px 12px rgba(140, 212, 255, 0.4)",
                  "0 6px 20px rgba(140, 212, 255, 0.6)",
                  "0 4px 12px rgba(140, 212, 255, 0.4)",
                ],
              }
            : {}
        }
        transition={
          isNext
            ? {
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : { duration: 0.2 }
        }
      >
        {/* Иконка внутри узла */}
        <div style={{ color: styles.color }}>
          {!isUnlocked ? (
            <Lock className={cn("w-6 h-6", isNext && "w-7 h-7")} strokeWidth={2.5} />
          ) : isCompleted ? (
            <CheckCircle2 className={cn("w-7 h-7", isNext && "w-8 h-8")} strokeWidth={3} />
          ) : (
            <Icon className={cn("w-7 h-7", isNext && "w-8 h-8")} strokeWidth={2} />
          )}
        </div>

        {/* Premium badge */}
        {topic.is_premium && isUnlocked && !isCompleted && (
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#FFC800] to-[#FF9600] rounded-full flex items-center justify-center border-2 border-white shadow-lg"
          >
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </motion.div>
        )}
      </motion.div>
      </div>
      </HoverCardTrigger>
      
      {/* Hover Card с описанием темы */}
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${topic.gradient_from || '#8CD4FF'} 0%, ${topic.gradient_to || '#1CB0F6'} 100%)`,
              }}
            >
              {topic.number}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base mb-1">{topic.title_ru}</h4>
              {topic.description_ru && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {topic.description_ru}
                </p>
              )}
            </div>
          </div>
          
          {/* Прогресс */}
          {progress && progress.totalSubtopicCount > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {progress.completedSubtopicCount} / {progress.totalSubtopicCount} подтем
                </span>
                <span className="font-semibold text-primary">
                  {Math.round(progress.progressPercent)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress.completed ? "bg-green-500" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Кнопка действия */}
          <div className="pt-2">
            {isUnlocked ? (
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                {progress?.completed ? "Повторить тему" : "Начать изучение"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Заблокировано</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

