import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardData } from './useDashboardData';

export interface ActiveSeason {
  id: number;
  season_number: number;
  name_ru: string;
  name_es?: string;
  name_en?: string;
  theme?: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для получения активного сезона
 * Использует данные из Super RPC Dashboard (нет отдельного запроса!)
 * Fallback на отдельный запрос если данных нет в dashboard
 */
export function useActiveSeason() {
  // ОПТИМИЗАЦИЯ: Используем данные из Super RPC Dashboard
  const { data: dashboardData } = useDashboardData();

  return useQuery<ActiveSeason | null>({
    queryKey: ['active_season'],
    queryFn: async () => {
      // ОПТИМИЗАЦИЯ: Сначала пытаемся взять из Super RPC Dashboard
      if (dashboardData?.active_season) {
        return dashboardData.active_season as ActiveSeason;
      }

      // Fallback: отдельный запрос
      const { data, error } = await supabase.rpc('get_active_season');

      if (error) {
        console.error('[useActiveSeason] Error loading season:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as ActiveSeason;
    },
    enabled: !!dashboardData, // Ждем загрузки dashboard
    staleTime: 60 * 60 * 1000, // 1 час - сезон меняется редко
    gcTime: 2 * 60 * 60 * 1000, // 2 часа
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

