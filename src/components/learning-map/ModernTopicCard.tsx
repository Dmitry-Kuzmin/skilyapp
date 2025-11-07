import { CheckCircle2, Lock, Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topic, TopicProgress } from "./TopicCard";

interface ModernTopicCardProps {
  topic: Topic;
  progress?: TopicProgress;
  isLocked?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ModernTopicCard = ({
  topic,
  progress,
  isLocked = false,
  isActive = false,
  onClick,
  className,
}: ModernTopicCardProps) => {
  const isCompleted = progress?.completed ?? false;
  const isUnlocked = progress?.isUnlocked ?? !isLocked;
  const progressPercent = progress?.progressPercent ?? 0;

  // Определяем градиент и цвета в зависимости от состояния
  const getCardStyles = () => {
    if (!isUnlocked) {
      return {
        gradient: "linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)",
        borderColor: "#9CA3AF",
        textColor: "#6B7280",
        iconColor: "#9CA3AF",
      };
    }
    if (isCompleted) {
      return {
        gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        borderColor: "#059669",
        textColor: "#FFFFFF",
        iconColor: "#FFFFFF",
      };
    }
    if (isActive) {
      return {
        gradient: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
        borderColor: "#6366F1",
        textColor: "#FFFFFF",
        iconColor: "#FFFFFF",
      };
    }
    // Доступная, но не активная
    return {
      gradient: `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`,
      borderColor: topic.gradient_to,
      textColor: "#1F2937",
      iconColor: topic.gradient_to,
    };
  };

  const styles = getCardStyles();

  return (
    <div className={cn("relative modern-topic-card snap-start", className)}>
      <div
        className={cn(
          "relative w-[280px] h-[180px] rounded-2xl p-6 cursor-pointer transition-all duration-300",
          "backdrop-blur-sm border-2",
          "hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
          isActive && !isCompleted && "ring-4 ring-purple-200",
          !isUnlocked && "opacity-60 cursor-not-allowed"
        )}
        style={{
          background: styles.gradient,
          borderColor: styles.borderColor,
          boxShadow: isActive
            ? "0 20px 40px -10px rgba(139, 92, 246, 0.3)"
            : "0 4px 20px -4px rgba(0, 0, 0, 0.1)",
        }}
        onClick={isUnlocked ? onClick : undefined}
      >
        {/* Glassmorphism overlay для доступных тем */}
        {isUnlocked && !isCompleted && !isActive && (
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] rounded-2xl" />
        )}

        {/* Номер темы */}
        <div className="absolute top-4 right-4">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              isUnlocked
                ? "bg-white/20 backdrop-blur-sm"
                : "bg-gray-400/20"
            )}
            style={{ color: styles.textColor }}
          >
            {topic.number}
          </div>
        </div>

        {/* Иконка статуса */}
        <div className="absolute top-4 left-4">
          {!isUnlocked ? (
            <Lock className="w-6 h-6" style={{ color: styles.iconColor }} />
          ) : isCompleted ? (
            <CheckCircle2 className="w-6 h-6" style={{ color: styles.iconColor }} />
          ) : isActive ? (
            <Play className="w-6 h-6" style={{ color: styles.iconColor }} />
          ) : null}
        </div>

        {/* Premium badge */}
        {topic.is_premium && isUnlocked && !isCompleted && (
          <div className="absolute top-4 left-12">
            <div className="bg-[#F59E0B] rounded-full p-1.5 shadow-lg">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Контент */}
        <div className="relative h-full flex flex-col justify-between">
          <div className="flex-1 pt-8">
            <h3
              className={cn(
                "text-lg font-bold mb-2 line-clamp-2",
                !isUnlocked && "text-gray-500"
              )}
              style={{ color: styles.textColor }}
            >
              {topic.title_ru}
            </h3>
            {topic.description_ru && (
              <p
                className={cn(
                  "text-sm line-clamp-2",
                  isUnlocked ? "opacity-90" : "opacity-60"
                )}
                style={{ color: styles.textColor }}
              >
                {topic.description_ru}
              </p>
            )}
          </div>

          {/* Прогресс-бар */}
          {isUnlocked && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-medium"
                  style={{ color: styles.textColor }}
                >
                  Прогресс
                </span>
                <span
                  className="font-semibold"
                  style={{ color: styles.textColor }}
                >
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progress && (
                <p
                  className="text-xs"
                  style={{ color: styles.textColor, opacity: 0.8 }}
                >
                  {progress.completedSubtopicCount}/{progress.totalSubtopicCount} подтем
                </p>
              )}
            </div>
          )}
        </div>

        {/* Hover effect overlay */}
        {isUnlocked && (
          <div className="absolute inset-0 rounded-2xl bg-white/0 hover:bg-white/5 transition-colors duration-300 pointer-events-none" />
        )}
      </div>
    </div>
  );
};

