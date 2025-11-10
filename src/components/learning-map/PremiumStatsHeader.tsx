import { Flame, Gem, Heart, Trophy, User } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const PremiumStatsHeader = () => {
  const { profileId } = useUserContext();
  const [stats, setStats] = useState({
    xp: 0,
    streak: 0,
    gems: 0,
  });

  useEffect(() => {
    if (profileId) {
      loadStats();
    }
  }, [profileId]);

  const loadStats = async () => {
    if (!profileId) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("xp, streak, rank")
        .eq("id", profileId)
        .single();

      if (error) throw error;

      setStats({
        xp: profile?.xp || 0,
        streak: profile?.streak || 0,
        gems: profile?.xp || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
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

