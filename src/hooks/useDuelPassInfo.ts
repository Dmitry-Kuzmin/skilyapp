import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useDashboardData } from './useDashboardData';

export interface DuelPassInfo {
  level: number;
  seasonPoints: number;
  nextLevelSP: number;
  daysRemaining: number;
  seasonName: string;
  totalDuels: number;
  wins: number;
}

const DUEL_PASS_INFO_KEY = 'duel-pass-info';

export function useDuelPassInfo() {
  const { profileId } = useUserContext();
  const { data: dashboardData } = useDashboardData();

  // ID сезона в queryKey гарантирует инвалидацию кэша при смене/истечении сезона
  const activeSeasonId = dashboardData?.active_season?.id ?? null;

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<DuelPassInfo | null>({
    queryKey: [DUEL_PASS_INFO_KEY, profileId, activeSeasonId],
    queryFn: async () => {
      if (!profileId) return null;

      // Дашборд загружен, но активного сезона нет — сезон истёк или ещё не начался
      if (!dashboardData?.active_season) return null;

      const season = dashboardData.active_season;
      const progress = dashboardData.season_progress || { season_points: 0, level: 0 };

      const { data: stats } = await supabase
        .from('duel_stats')
        .select('total_duels, wins')
        .eq('user_id', profileId)
        .maybeSingle();

      const currentSP = progress.season_points || 0;
      const currentLevel = progress.level || 0;
      const spInCurrentLevel = currentSP % 100;
      const nextLevelSP = 100 - spInCurrentLevel;

      return {
        level: currentLevel,
        seasonPoints: currentSP,
        nextLevelSP,
        daysRemaining: season.days_remaining || 0,
        seasonName: season.name_ru || `Сезон ${season.season_number || 1}`,
        totalDuels: stats?.total_duels || 0,
        wins: stats?.wins || 0,
      };
    },
    enabled: !!profileId && !!dashboardData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  return {
    data,
    loading,
    error: error as Error | null,
    refresh: refetch,
  };
}
