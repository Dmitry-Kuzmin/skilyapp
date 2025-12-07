import { Flame, Gem, Heart, Trophy } from "lucide-react";
import { useProfileData } from "@/hooks/useProfileData";

/**
 * ОПТИМИЗИРОВАННЫЙ DuolingoStatsHeader
 * БЫЛО: Собственный запрос к profiles
 * СТАЛО: Использует useProfileData (единый кэш)
 */
export const DuolingoStatsHeader = () => {
  // ОПТИМИЗАЦИЯ: Используем общий кэш профиля
  const { xp, streakDays } = useProfileData();
  
  const stats = {
    xp: xp || 0,
    streak: streakDays || 0,
    gems: xp || 0, // Используем XP как gems для простоты
        hearts: 5, // Можно добавить систему жизней позже
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Обучение ПДД</h1>
          
          <div className="flex items-center gap-4">
            <StatItem icon={<Trophy className="w-5 h-5" />} value={stats.xp.toString()} color="text-warning" />
            <StatItem icon={<Flame className="w-5 h-5" />} value={stats.streak.toString()} color="text-muted-foreground" />
            <StatItem icon={<Gem className="w-5 h-5" />} value={stats.gems.toString()} color="text-info" />
            <StatItem icon={<Heart className="w-5 h-5" />} value={stats.hearts === Infinity ? "∞" : stats.hearts.toString()} color="text-danger" />
          </div>
        </div>
      </div>
    </header>
  );
};

const StatItem = ({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border">
      <span className={color}>{icon}</span>
      <span className="font-bold text-sm text-foreground">{value}</span>
    </div>
  );
};

