import { Card } from "@/components/ui/card";
import { Check, Lock, Gift, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayReward {
  day_number: number;
  reward: {
    xp: number;
    coins: number;
    badge?: string;
  };
  description: string;
}

interface WeeklyCalendarProps {
  currentStreak: number;
  weeklyRewards: DayReward[];
}

const WeeklyCalendar = ({ currentStreak, weeklyRewards }: WeeklyCalendarProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-card to-muted/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Календарь наград</h3>
          <span className="text-sm text-muted-foreground">
            {currentStreak}/7 дней
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeklyRewards.map((dayReward) => {
            const isCompleted = currentStreak >= dayReward.day_number;
            const isCurrent = currentStreak + 1 === dayReward.day_number;
            const isLocked = currentStreak < dayReward.day_number - 1;
            const isSpecial = dayReward.day_number === 7;

            return (
              <div
                key={dayReward.day_number}
                className={cn(
                  "relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all",
                  isCompleted && "bg-gradient-to-br from-primary/20 to-primary/10 border-primary shadow-md",
                  isCurrent && "bg-gradient-to-br from-primary/30 to-secondary/20 border-primary shadow-lg animate-pulse",
                  isLocked && "bg-muted/50 border-border/50 opacity-60",
                  !isCompleted && !isCurrent && !isLocked && "bg-card border-border hover:border-primary/50",
                  isSpecial && "col-span-1"
                )}
              >
                {/* Day number */}
                <div className="text-xs font-bold mb-1 text-muted-foreground">
                  День {dayReward.day_number}
                </div>

                {/* Icon */}
                <div className="mb-1">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-bounce">
                      <Gift className="w-5 h-5 text-primary-foreground" />
                    </div>
                  ) : isLocked ? (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ) : isSpecial ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-primary/50" />
                    </div>
                  )}
                </div>

                {/* Reward preview */}
                <div className="text-[10px] text-center font-medium">
                  {dayReward.reward.xp > 0 && (
                    <div className="text-primary">+{dayReward.reward.xp} XP</div>
                  )}
                  {dayReward.reward.coins > 0 && (
                    <div className="text-gold">+{dayReward.reward.coins} 🪙</div>
                  )}
                </div>

                {/* Special badge indicator */}
                {dayReward.reward.badge && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-2 pt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-500 shadow-glow"
              style={{ width: `${(currentStreak / 7) * 100}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {currentStreak === 7
              ? "🎉 Недельная серия завершена!"
              : currentStreak === 0
              ? "Начни свою серию сегодня!"
              : `Осталось ${7 - currentStreak} ${7 - currentStreak === 1 ? "день" : "дней"} до особой награды`}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default WeeklyCalendar;
