import { Card } from "@/components/ui/card";
import { Trophy, Zap, Target, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactSidebarProps {
  profileId?: string;
  rank?: string;
  xp?: number;
  completedTopics?: number;
  totalTopics?: number;
  streak?: number;
  className?: string;
}

export const CompactSidebar = ({
  profileId,
  rank,
  xp = 0,
  completedTopics = 0,
  totalTopics = 0,
  streak = 0,
  className,
}: CompactSidebarProps) => {
  const completionPercent =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <aside
      className={cn(
        "hidden lg:block w-80 flex-shrink-0 space-y-6 sticky top-4 self-start",
        "max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
        className
      )}
    >
      {/* Статистика */}
      <Card className="p-6 bg-secondary/10 border-border/50 backdrop-blur-md">
        <h3 className="text-lg font-bold text-foreground mb-4">Прогресс</h3>
        <div className="space-y-4">
          {/* Общий прогресс */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Завершено тем
              </span>
              <span className="text-sm font-bold text-foreground">
                {completedTopics}/{totalTopics}
              </span>
            </div>
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* XP */}
          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600">Опыт</p>
              <p className="text-lg font-bold text-gray-900">
                {xp.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Серия */}
          {streak > 0 && (
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">Серия</p>
                <p className="text-lg font-bold text-gray-900">{streak} дней</p>
              </div>
            </div>
          )}

          {/* Лига */}
          {rank && (
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">Лига</p>
                <p className="text-lg font-bold text-gray-900">{rank}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Достижения */}
      <Card className="p-6 border-border/50 bg-secondary/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-foreground">Достижения</h3>
        </div>
        <p className="text-sm text-gray-600">
          Продолжайте обучение, чтобы разблокировать новые достижения
        </p>
      </Card>
    </aside>
  );
};

