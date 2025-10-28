import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementCardProps {
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  icon?: string;
  reward?: { xp?: number; coins?: number; badge?: string };
}

const AchievementCard = ({ 
  title, 
  description, 
  unlocked, 
  progress = 0, 
  maxProgress = 1,
  icon = "Trophy",
  reward
}: AchievementCardProps) => {
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;
  const IconComponent = (Icons as any)[icon] || Icons.Trophy;
  const hasProgress = !unlocked && maxProgress > 1;

  return (
    <Card className={cn(
      "relative p-5 transition-all duration-300 overflow-hidden group",
      "bg-card/50 backdrop-blur-sm border-2",
      unlocked 
        ? "border-primary/30 shadow-lg hover:shadow-xl hover:border-primary/50" 
        : "border-border/30 opacity-70 hover:opacity-90"
    )}>
      {/* Gradient background effect for unlocked achievements */}
      {unlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      <div className="relative flex items-start gap-4">
        {/* Icon container */}
        <div className={cn(
          "flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 transition-all duration-300",
          unlocked 
            ? "bg-gradient-to-br from-primary to-primary/60 shadow-md group-hover:scale-110" 
            : "bg-muted/50"
        )}>
          {unlocked ? (
            <IconComponent className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          ) : (
            <Icons.Lock className="w-6 h-6 text-muted-foreground/50" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className={cn(
              "font-bold text-base leading-tight",
              unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {title}
            </h4>
            {reward?.xp && (
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0",
                unlocked 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {reward.xp} XP
              </span>
            )}
          </div>
          
          <p className={cn(
            "text-sm leading-snug mb-3",
            unlocked ? "text-muted-foreground" : "text-muted-foreground/60"
          )}>
            {description}
          </p>
          
          {/* Progress bar */}
          {hasProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Изучено {progress} из {maxProgress}
                </span>
                <span className={cn(
                  "font-bold tabular-nums",
                  progressPercent >= 100 ? "text-primary" : "text-muted-foreground"
                )}>
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                    "bg-gradient-to-r from-primary via-primary/80 to-primary"
                  )}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground/80">
                Требуется: {maxProgress} {maxProgress === 1 ? 'балл' : maxProgress < 5 ? 'балла' : 'баллов'}
              </p>
            </div>
          )}
          
          {/* Requirement text for locked one-time achievements */}
          {!unlocked && maxProgress === 1 && (
            <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
              <Icons.Target className="w-3.5 h-3.5" />
              Требуется: {maxProgress} {maxProgress === 1 ? 'балл' : 'балла'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AchievementCard;
