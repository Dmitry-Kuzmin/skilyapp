import { Card } from "@/components/ui/card";
import { Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementCardProps {
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

const AchievementCard = ({ 
  title, 
  description, 
  unlocked, 
  progress = 0, 
  maxProgress = 100 
}: AchievementCardProps) => {
  const progressPercent = (progress / maxProgress) * 100;

  return (
    <Card className={cn(
      "p-4 gradient-card border transition-all duration-300 hover:scale-105",
      unlocked 
        ? "border-gold/50 shadow-glow" 
        : "border-border/50 opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
          unlocked ? "gradient-gold" : "bg-muted"
        )}>
          {unlocked ? (
            <Trophy className="w-6 h-6 text-gold-foreground" />
          ) : (
            <Lock className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
          {!unlocked && maxProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{progress} / {maxProgress}</span>
                <span className="text-primary font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full gradient-primary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AchievementCard;
