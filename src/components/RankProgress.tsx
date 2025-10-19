import { Card } from "@/components/ui/card";
import { TrendingUp, Coins } from "lucide-react";

interface RankProgressProps {
  currentRank: string;
  currentXP: number;
  nextRankXP: number;
  coins: number;
}

const RankProgress = ({ currentRank, currentXP, nextRankXP, coins }: RankProgressProps) => {
  const progressPercent = (currentXP / nextRankXP) * 100;

  return (
    <Card className="p-6 gradient-card border-border/50 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Текущий ранг</p>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {currentRank}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">XP</p>
              <p className="font-bold">{currentXP.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-gold">
              <Coins className="w-4 h-4 text-gold-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Монеты</p>
              <p className="font-bold text-gold">{coins.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">До следующего ранга</span>
          <span className="text-primary font-semibold">
            {nextRankXP - currentXP} XP
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full gradient-primary transition-all duration-500 shadow-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Card>
  );
};

export default RankProgress;
