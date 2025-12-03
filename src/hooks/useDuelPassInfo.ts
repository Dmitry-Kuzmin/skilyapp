import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

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

/**
 * ОПТИМИЗИРОВАННЫЙ хук для получения данных Duel Pass
 * Использует React Query для кэширования
 * Объединяет несколько запросов в один батч
 */
export function useDuelPassInfo() {
  const { profileId } = useUserContext();

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<DuelPassInfo | null>({
    queryKey: [DUEL_PASS_INFO_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // Получаем активный сезон
      const { data: seasonData, error: seasonError } = await supabase.rpc('get_active_season');
      
      if (seasonError || !seasonData || seasonData.length === 0) {
        return null;
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

      if (!progress) return null;

      const currentSP = progress.season_points || 0;
      const currentLevel = progress.level || 1;
      const spForNextLevel = 100; // Каждый уровень требует 100 SP
      const spInCurrentLevel = currentSP % 100;
      const nextLevelSP = spForNextLevel - spInCurrentLevel;

      return {
        level: currentLevel,
        seasonPoints: currentSP,
        nextLevelSP: nextLevelSP,
        daysRemaining: season.days_remaining || 0,
        seasonName: season.name_ru || `Сезон ${season.season_number || 1}`,
        totalDuels: stats?.total_duels || 0,
        wins: stats?.wins || 0,
      };
    },
    enabled: !!profileId,
    staleTime: 30 * 1000, // 30 секунд - прогресс меняется не так часто
    gcTime: 5 * 60 * 1000, // 5 минут
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

