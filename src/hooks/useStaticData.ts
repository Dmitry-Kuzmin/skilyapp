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
 * SUPER ОПТИМИЗАЦИЯ: Берет из Super RPC Dashboard (нет отдельного запроса!)
 * КЭШИРОВАНИЕ: 24 часа (данные не меняются)
 */
export function useDailyBonusDefinitions() {
  const { profileId } = useUserContext();
  // ОПТИМИЗАЦИЯ: Пытаемся взять из Super RPC Dashboard
  const { data: dashboardData } = useDashboardData();

  return useQuery<DailyBonusDef[]>({
    queryKey: ['daily-bonus-definitions', profileId],
    queryFn: async () => {
      // Если есть в Super RPC - используем!
      if (dashboardData?.daily_bonus_definitions) {
        console.log('[useStaticData] ✅ Using daily_bonus_definitions from Super RPC');
        return dashboardData.daily_bonus_definitions;
      }

      // Fallback: отдельный запрос
      console.warn('[useStaticData] ⚠️ Daily bonus defs not in Super RPC, fetching separately');
      const { data, error } = await supabase
        .from('daily_bonus_def')
        .select('day_number, reward, description')
        .order('day_number', { ascending: true })
        .limit(7);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
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
 * SUPER ОПТИМИЗАЦИЯ: Берет из Super RPC Dashboard (нет отдельного запроса!)
 * КЭШИРОВАНИЕ: 1 час (данные меняются редко)
 */
export function useTopicsList() {
  const { profileId } = useUserContext();
  // ОПТИМИЗАЦИЯ: Пытаемся взять из Super RPC Dashboard
  const { data: dashboardData } = useDashboardData();

  return useQuery<TopicBasic[]>({
    queryKey: ['topics-list', profileId],
    queryFn: async () => {
      // Если есть в Super RPC - используем!
      if (dashboardData?.topics) {
        console.log('[useStaticData] ✅ Using topics from Super RPC');
        return dashboardData.topics;
      }

      // Fallback: отдельный запрос
      console.warn('[useStaticData] ⚠️ Topics not in Super RPC, fetching separately');
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
      // Сначала получаем активный сезон
      const { data: seasonData } = await supabase.rpc('get_active_season');

      if (!seasonData) return [];

      // Загружаем награды для этого сезона
      const { data, error } = await supabase
        .from('duel_pass_season_rewards')
        .select('season_id, level, sp_required')
        .order('level', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 час
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}

// ========================================
// Achievement Definitions (определения достижений)
// ========================================
// Можно добавить по необходимости

/**
 * ИСПОЛЬЗОВАНИЕ:
 * 
 * const { data: bonusDefs, loading } = useDailyBonusDefinitions();
 * const { data: topics } = useTopicsList();
 * const { data: rewards } = useSeasonRewards();
 * 
 * Эти хуки кэшируются глобально для всего приложения
 * Первый вызов загрузит данные, все последующие будут брать из кэша
 */
