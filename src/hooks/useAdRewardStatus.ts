import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AdRewardStatusOptions {
  enabled?: boolean;
  refetchInterval?: number;
  dailyLimit?: number;
  cooldownMinutes?: number;
}

/**
 * Хук для проверки статуса доступности rewarded ad
 * 
 * @param profileId - ID профиля пользователя
 * @param rewardType - Тип награды ('coins', 'double_winnings', 'slot_unlock')
 * @param options - Опции хука (enabled, refetchInterval)
 */
export function useAdRewardStatus(
  profileId: string | null | undefined,
  rewardType: string,
  options: AdRewardStatusOptions = {}
) {
  const { enabled = true, refetchInterval, dailyLimit: customDailyLimit, cooldownMinutes: customCooldown } = options;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ad-reward-status', profileId, rewardType],
    queryFn: async () => {
      if (!profileId) {
        return {
          can_watch: false,
          next_available_at: null,
          daily_count: 0,
          daily_limit: 5,
          cooldown_minutes: 60,
        };
      }

      try {
        const { data, error } = await supabase.functions.invoke('check-ad-reward-status', {
          body: { 
            user_id: profileId, 
            reward_type: rewardType,
            daily_limit: customDailyLimit,
            cooldown_minutes: customCooldown,
          }
        });

        if (error) throw error;

        return {
          can_watch: data.can_watch || false,
          next_available_at: data.next_available_at || null,
          daily_count: data.daily_count || 0,
          daily_limit: data.daily_limit || 5,
          cooldown_minutes: data.cooldown_minutes || 60,
        };
      } catch (err: any) {
        console.error('[useAdRewardStatus] Error checking ad status:', err);
        // По умолчанию разрешаем смотреть (если сервер недоступен)
        return {
          can_watch: true,
          next_available_at: null,
          daily_count: 0,
          daily_limit: 5,
          cooldown_minutes: 60,
        };
      }
    },
    enabled: enabled && !!profileId,
    refetchInterval: refetchInterval || false,
    staleTime: 30000, // 30 секунд
  });

  return {
    canWatch: data?.can_watch ?? false,
    nextAvailableAt: data?.next_available_at ? new Date(data.next_available_at) : undefined,
    dailyCount: data?.daily_count ?? 0,
    dailyLimit: data?.daily_limit ?? 5,
    cooldownMinutes: data?.cooldown_minutes ?? 60,
    isLoading,
    refetch,
  };
}

