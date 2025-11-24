import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useModalRoute } from '@/hooks/useModalRoute';
import { playClickSound } from '@/services/audioService';
import { useTheme } from 'next-themes';

interface DuelPassInfoProps {
  className?: string;
}

export const DuelPassInfo: React.FC<DuelPassInfoProps> = ({ className }) => {
  const { profileId } = useUserContext();
  const { openModal } = useModalRoute('duel-pass-season');
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
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

  // Цветовые классы для светлой и темной темы
  const containerClass = isDarkTheme
    ? 'bg-slate-800/60 border-slate-700/60 hover:border-yellow-500/40'
    : 'bg-white/95 border-slate-200/80 hover:border-yellow-400/60 shadow-[0_20px_45px_rgba(0,0,0,0.08)]';
  const textPrimaryClass = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const textTertiaryClass = isDarkTheme ? 'text-slate-300' : 'text-slate-700';
  const iconBgClass = isDarkTheme
    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
    : 'bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border-yellow-400/40';
  const iconColorClass = isDarkTheme ? 'text-yellow-400' : 'text-yellow-600';
  const progressBgClass = isDarkTheme ? 'bg-slate-700/50' : 'bg-slate-200/60';
  const dividerClass = isDarkTheme ? 'border-slate-700/50' : 'border-slate-200/60';
  const chevronBgClass = isDarkTheme
    ? 'bg-white/10 group-hover:bg-white/20'
    : 'bg-slate-100 group-hover:bg-yellow-50';
  const chevronColorClass = isDarkTheme
    ? 'text-slate-400 group-hover:text-yellow-400'
    : 'text-slate-500 group-hover:text-yellow-600';
  const statIconClass = isDarkTheme ? 'text-slate-400' : 'text-slate-500';

  if (loading) {
    return (
      <div className={`${className} ${containerClass} rounded-[2.5rem] p-6 shadow-lg border backdrop-blur-sm animate-pulse`}>
        <div className="flex items-center justify-between">
          <div className={`h-4 w-32 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'} rounded`}></div>
          <div className={`h-6 w-6 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'} rounded-full`}></div>
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
      className={`${className} ${containerClass} rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg border flex flex-col gap-2 md:gap-3 backdrop-blur-sm cursor-pointer transition-all duration-300 group`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconBgClass} rounded-xl border`}>
            <Trophy className={`w-5 h-5 ${iconColorClass}`} />
          </div>
          <div>
            <h3 className={`font-bold ${textTertiaryClass} text-sm`}>Duel Pass</h3>
            <p className={`text-xs ${textSecondaryClass}`}>{duelPassData.seasonName}</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full ${chevronBgClass} flex items-center justify-center transition-colors`}>
          <ChevronRight size={16} className={chevronColorClass} />
        </div>
      </div>

      {/* Level & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-xl md:text-2xl font-bold ${textPrimaryClass}`}>Уровень {duelPassData.level}</span>
            <span className={`text-sm ${textSecondaryClass}`}>/ 30</span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${textSecondaryClass}`}>
            <Zap className="w-3 h-3" />
            <span>{duelPassData.seasonPoints} SP</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`relative h-2 ${progressBgClass} rounded-full overflow-hidden`}>
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className={`text-xs ${textSecondaryClass}`}>
          До следующего уровня: <span className={`${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'} font-semibold`}>{duelPassData.nextLevelSP} SP</span>
        </p>
      </div>

      {/* Stats */}
      <div className={`flex items-center gap-4 pt-2 border-t ${dividerClass}`}>
        <div className="flex items-center gap-2 flex-1">
          <Clock className={`w-4 h-4 ${statIconClass}`} />
          <div>
            <p className={`text-xs ${textSecondaryClass}`}>Осталось</p>
            <p className={`text-sm font-semibold ${textPrimaryClass}`}>
              {duelPassData.daysRemaining} {duelPassData.daysRemaining === 1 ? 'день' : duelPassData.daysRemaining < 5 ? 'дня' : 'дней'}
            </p>
          </div>
        </div>
        {duelPassData.totalDuels !== undefined && (
          <div className="flex items-center gap-2 flex-1">
            <TrendingUp className={`w-4 h-4 ${statIconClass}`} />
            <div>
              <p className={`text-xs ${textSecondaryClass}`}>Дуэли</p>
              <p className={`text-sm font-semibold ${textPrimaryClass}`}>
                {duelPassData.wins || 0} / {duelPassData.totalDuels}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

