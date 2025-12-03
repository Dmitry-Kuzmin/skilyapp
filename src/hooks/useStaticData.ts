import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
 * КЭШИРОВАНИЕ: 24 часа (данные не меняются)
 */
export function useDailyBonusDefinitions() {
  return useQuery<DailyBonusDef[]>({
    queryKey: ['daily-bonus-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_bonus_def')
        .select('day_number, reward, description')
        .order('day_number', { ascending: true })
        .limit(7);

      if (error) throw error;
      return data || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 часа - эти данные не меняются
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
  order_index: number;
}

/**
 * Загружает базовый список всех тем
 * КЭШИРОВАНИЕ: 1 час (данные меняются редко)
 */
export function useTopicsList() {
  return useQuery<TopicBasic[]>({
    queryKey: ['topics-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, number, title_ru, title_es, order_index')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
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

