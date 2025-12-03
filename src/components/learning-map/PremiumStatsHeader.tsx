import { Flame, Gem, Heart, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileData } from "@/hooks/useProfileData";

/**
 * ОПТИМИЗИРОВАННЫЙ PremiumStatsHeader
 * БЫЛО: Собственный запрос к profiles
 * СТАЛО: Использует useProfileData (единый кэш)
 */
export const PremiumStatsHeader = () => {
  // ОПТИМИЗАЦИЯ: Используем общий кэш профиля
  const { xp, streakDays } = useProfileData();
  
  const stats = {
    xp: xp || 0,
    streak: streakDays || 0,
    gems: xp || 0,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white text-sm font-bold">ПДД</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Обучение</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <StatItem 
              icon={<Trophy className="w-4 h-4" />} 
              value={stats.xp.toString()} 
              label="Очки"
            />
            <StatItem 
              icon={<Flame className="w-4 h-4" />} 
              value={stats.streak.toString()} 
              label="Дни"
            />
            <div className="h-6 w-px bg-slate-200" />
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <User className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const StatItem = ({ icon, value, label }: { icon: React.ReactNode; value: string; label?: string }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      <span className="text-slate-600">{icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-900 leading-none">{value}</span>
        {label && <span className="text-xs text-slate-500 leading-none mt-0.5">{label}</span>}
      </div>
    </div>
  );
};

