import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, Play, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface Topic {
  id: string;
  number: number;
  order_index: number;
  title_ru: string;
  title_es: string;
  title_en: string;
  description_ru?: string;
  description_es?: string;
  description_en?: string;
  cover_image?: string;
  is_premium: boolean;
  gradient_from: string;
  gradient_to: string;
  unlock_condition?: {
    required_topics?: number[];
    min_score?: number;
    skip_test_id?: string;
  };
}

export interface TopicProgress {
  completed: boolean;
  progressPercent: number;
  completedSubtopicCount: number;
  totalSubtopicCount: number;
  isUnlocked: boolean;
}

interface TopicCardProps {
  topic: Topic;
  progress?: TopicProgress;
  isLocked?: boolean;
  className?: string;
}

export const TopicCard = ({ topic, progress, isLocked = false, className }: TopicCardProps) => {
  const navigate = useNavigate();
  const isCompleted = progress?.completed ?? false;
  const isUnlocked = progress?.isUnlocked ?? !isLocked;
  const progressPercent = progress?.progressPercent ?? 0;

  const handleClick = () => {
    if (isUnlocked) {
      navigate(`/topic/${topic.id}`);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer group",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20",
        "transform-gpu will-change-transform",
        isUnlocked
          ? "border-2 border-primary/30 hover:border-primary/50 bg-gradient-to-br from-card to-card/50"
          : "border-2 border-muted/50 opacity-60",
        isCompleted && "border-success/50 bg-gradient-to-br from-success/5 to-success/10",
        className
      )}
      onClick={handleClick}
    >
      {/* Gradient Background with Animation */}
      <div
        className={cn(
          "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500",
          "bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10",
          !isUnlocked && "opacity-5"
        )}
        style={{
          background: `linear-gradient(135deg, ${topic.gradient_from}15 0%, ${topic.gradient_to}15 100%)`,
        }}
      />
      
      {/* Animated Glow Effect */}
      {isUnlocked && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{
            background: `radial-gradient(circle at center, ${topic.gradient_from}30 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Lock Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">Заблокировано</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`,
                }}
              >
                {topic.number}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{topic.title_ru}</h3>
                {topic.description_ru && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {topic.description_ru}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex flex-col items-end gap-2">
            {isCompleted ? (
              <Badge className="bg-success/20 text-success border-success/50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Завершено
              </Badge>
            ) : isUnlocked ? (
              <Badge className="bg-primary/20 text-primary border-primary/50">
                <Play className="w-3 h-3 mr-1" />
                Доступно
              </Badge>
            ) : null}
            {topic.is_premium && (
              <Badge className="bg-gold/20 text-gold border-gold/50">
                <Star className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isUnlocked && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress?.completedSubtopicCount ?? 0} / {progress?.totalSubtopicCount ?? 0} подтем
              </span>
              <span className="font-semibold text-primary">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isCompleted ? "bg-success" : "bg-gradient-to-r from-primary to-secondary"
                )}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Subtopic Count */}
        {isUnlocked && progress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-3 h-3" />
            <span>
              {progress.completedSubtopicCount} из {progress.totalSubtopicCount} подтем изучено
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

