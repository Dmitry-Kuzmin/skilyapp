import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useModalRoute } from '@/hooks/useModalRoute';
import { playClickSound } from '@/services/audioService';

interface DuelPassInfoProps {
  className?: string;
}

export const DuelPassInfo: React.FC<DuelPassInfoProps> = ({ className }) => {
  const { profileId } = useUserContext();
  const { openModal } = useModalRoute('duel-pass-season');
  const [loading, setLoading] = useState(true);
  const [duelPassData, setDuelPassData] = useState<{
    level: number;
    seasonPoints: number;
    nextLevelSP: number;
    daysRemaining: number;
    seasonName: string;
    totalDuels?: number;
    wins?: number;
  } | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Получаем активный сезон
        const { data: seasonData, error: seasonError } = await supabase.rpc('get_active_season');
        
        if (seasonError || !seasonData || seasonData.length === 0) {
          setLoading(false);
          return;
        }

        const season = seasonData[0];

        // Получаем прогресс и статистику параллельно
        const [progressResult, statsResult] = await Promise.allSettled([
          supabase.rpc('get_or_create_season_progress', {
            p_user_id: profileId,
            p_season_id: season.id,
          }),
          supabase
            .from('duel_stats')
            .select('total_duels, wins')
            .eq('user_id', profileId)
            .maybeSingle(),
        ]);

        const progress = progressResult.status === 'fulfilled' && progressResult.value.data?.[0];
        const stats = statsResult.status === 'fulfilled' && statsResult.value.data;

        if (progress) {
          const currentSP = progress.season_points || 0;
          const currentLevel = progress.level || 1;
          const spForNextLevel = 100; // Каждый уровень требует 100 SP
          const spInCurrentLevel = currentSP % 100;
          const nextLevelSP = spForNextLevel - spInCurrentLevel;

          setDuelPassData({
            level: currentLevel,
            seasonPoints: currentSP,
            nextLevelSP: nextLevelSP,
            daysRemaining: season.days_remaining || 0,
            seasonName: season.name_ru || `Сезон ${season.season_number || 1}`,
            totalDuels: stats?.total_duels || 0,
            wins: stats?.wins || 0,
          });
        }
      } catch (error) {
        console.error('[DuelPassInfo] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profileId]);

  const handleClick = () => {
    playClickSound();
    // Открываем модалку через useModalRoute
    openModal();
  };

  if (loading) {
    return (
      <div className={`${className} bg-slate-800/50 rounded-[2.5rem] p-6 shadow-lg border border-slate-700 backdrop-blur-sm animate-pulse`}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-700 rounded"></div>
          <div className="h-6 w-6 bg-slate-700 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!duelPassData) {
    return null;
  }

  const progressPercent = Math.min(100, ((100 - duelPassData.nextLevelSP) / 100) * 100);

  return (
    <div
      onClick={handleClick}
      className={`${className} bg-slate-800/50 rounded-[2.5rem] p-6 shadow-lg border border-slate-700 flex flex-col gap-4 backdrop-blur-sm cursor-pointer hover:border-yellow-500/30 transition-all duration-300 group`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm">Duel Pass</h3>
            <p className="text-xs text-slate-400">{duelPassData.seasonName}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
          <ChevronRight size={16} className="text-slate-400 group-hover:text-yellow-400 transition-colors" />
        </div>
      </div>

      {/* Level & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">Уровень {duelPassData.level}</span>
            <span className="text-sm text-slate-400">/ 30</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Zap className="w-3 h-3" />
            <span>{duelPassData.seasonPoints} SP</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">
          До следующего уровня: <span className="text-yellow-400 font-semibold">{duelPassData.nextLevelSP} SP</span>
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50">
        <div className="flex items-center gap-2 flex-1">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">Осталось</p>
            <p className="text-sm font-semibold text-white">
              {duelPassData.daysRemaining} {duelPassData.daysRemaining === 1 ? 'день' : duelPassData.daysRemaining < 5 ? 'дня' : 'дней'}
            </p>
          </div>
        </div>
        {duelPassData.totalDuels !== undefined && (
          <div className="flex items-center gap-2 flex-1">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Дуэли</p>
              <p className="text-sm font-semibold text-white">
                {duelPassData.wins || 0} / {duelPassData.totalDuels}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

