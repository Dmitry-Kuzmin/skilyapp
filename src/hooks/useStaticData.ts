import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardData } from './useDashboardData';
import { useUserContext } from '@/contexts/UserContext';

/**
 * ОПТИМИЗАЦИЯ: Хуки для статических данных с агрессивным кэшированием
 * Эти данные практически не меняются, поэтому можем кэшировать надолго
 */

// ========================================
// Daily Bonus Definitions (7-дневный цикл)
// ========================================
export interface DailyBonusDef {
  day_number: number;
  reward: any;
  description: string;
}

/**
 * Загружает определения ежедневных бонусов
 * Приоритет: Super RPC Dashboard → отдельный запрос (fallback)
 * КЭШИРОВАНИЕ: 24 часа (данные не меняются)
 */
export function useDailyBonusDefinitions() {
  const { profileId } = useUserContext();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData();

  return useQuery<DailyBonusDef[]>({
    queryKey: ['daily-bonus-definitions', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_bonus_def')
        .select('day_number, reward, description')
        .order('day_number', { ascending: true })
        .limit(7);

      if (error) throw error;
      return data || [];
    },
    // Ждём завершения dashboard-запроса; если там есть данные — query вообще не запустится
    enabled: !!profileId && !dashboardLoading && !dashboardData?.daily_bonus_definitions,
    // Данные из Super RPC подставляются напрямую как initialData
    initialData: dashboardData?.daily_bonus_definitions ?? undefined,
    staleTime: 24 * 60 * 60 * 1000, // 24 часа
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}

// ========================================
// Topics List (список всех тем)
// ========================================
export interface TopicBasic {
  id: string;
  number: number;
  title_ru: string;
  title_es?: string;
  title_en?: string;
  order_index: number;
}

/**
 * Загружает базовый список всех тем
 * Topics не включены в Super RPC — всегда отдельный запрос, кэш 1 час
 */
export function useTopicsList() {
  const { profileId } = useUserContext();

  return useQuery<TopicBasic[]>({
    queryKey: ['topics-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, number, title_ru, title_es, title_en, order_index')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 60 * 60 * 1000, // 1 час
    gcTime: 2 * 60 * 60 * 1000, // 2 часа
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}

// ========================================
// Duel Pass Season Rewards (награды сезона)
// ========================================
export interface SeasonReward {
  season_id: number;
  level: number;
  sp_required: number;
}

/**
 * Загружает награды текущего сезона
 * КЭШИРОВАНИЕ: 1 час (сезон меняется редко)
 */
export function useSeasonRewards() {
  return useQuery<SeasonReward[]>({
    queryKey: ['season-rewards'],
    queryFn: async () => {
      const { data: seasonData } = await supabase.rpc('get_active_season');

      if (!seasonData) return [];

      const { data, error } = await supabase
        .from('duel_pass_season_rewards')
        .select('season_id, level, sp_required')
        .order('level', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}
