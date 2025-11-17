import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Flame, Coins, TrendingUp, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyBonusCardProps {
  currentStreak: number;
  canClaim: boolean;
  todayReward: {
    xp: number;
    coins: number;
    badge?: string;
  };
  description: string;
  onClaim: () => Promise<void>;
}

const DailyBonusCard = ({
  currentStreak,
  canClaim,
  todayReward,
  description,
  onClaim,
}: DailyBonusCardProps) => {
  const [claiming, setClaiming] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    setShowReward(true);
    
    try {
      await onClaim();
      
      // Keep animation visible for a moment
      setTimeout(() => {
        setShowReward(false);
      }, 3000);
    } catch (error) {
      console.error("Error claiming bonus:", error);
      setShowReward(false);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Gift className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ежедневный бонус</h3>
              <p className="text-sm text-muted-foreground">
                Заходи каждый день за наградой!
              </p>
            </div>
          </div>
          
          {/* Streak indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-lg">{currentStreak}</span>
          </div>
        </div>

        {/* Today's reward preview */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              День {currentStreak > 0 ? currentStreak : 1}
            </span>
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          
          <p className="text-sm mb-3 text-foreground/80">{description}</p>
          
          <div className="flex items-center gap-4">
            {todayReward.xp > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">XP</p>
                  <p className="font-bold text-primary">+{todayReward.xp}</p>
                </div>
              </div>
            )}
            
            {todayReward.coins > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                  <Coins className="w-4 h-4 text-gold-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Монеты</p>
                  <p className="font-bold text-gold">+{todayReward.coins}</p>
                </div>
              </div>
            )}
            
            {todayReward.badge && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Бейдж</p>
                  <p className="font-bold text-blue-500">Награда!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Claim button */}
        <Button
          onClick={handleClaim}
          disabled={!canClaim || claiming}
          className={cn(
            "w-full h-12 text-base font-bold relative overflow-hidden",
            canClaim && !claiming && "shadow-lg shadow-primary/50 animate-pulse"
          )}
        >
          {claiming ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Получение...
            </>
          ) : canClaim ? (
            <>
              <Gift className="w-5 h-5 mr-2" />
              Забрать награду
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5 mr-2" />
              Возвращайся завтра
            </>
          )}
        </Button>

        {!canClaim && (
          <p className="text-xs text-center text-muted-foreground">
            Ты уже получил бонус сегодня. Возвращайся завтра!
          </p>
        )}
      </div>

      {/* Reward animation overlay */}
      {showReward && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10 animate-fade-in">
          <div className="text-center space-y-4 animate-scale-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/50">
              <Gift className="w-10 h-10 text-primary-foreground animate-bounce" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Награда получена!</h3>
              <div className="flex items-center justify-center gap-4 text-lg">
                {todayReward.xp > 0 && (
                  <span className="text-primary font-bold">+{todayReward.xp} XP</span>
                )}
                {todayReward.coins > 0 && (
                  <span className="text-gold font-bold">+{todayReward.coins} 🪙</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DailyBonusCard;
