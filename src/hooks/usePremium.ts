import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useDashboardData } from "./useDashboardData";

interface PremiumState {
  isPremium: boolean;
  isTrial: boolean;
  isLifetime: boolean;
  activeUntil: string | null;
  daysRemaining: number;
  coins: number;
  subscriptionType: string | null;
  subscriptionStatus: string | null;
}

const initialState: PremiumState = {
  isPremium: false,
  isTrial: false,
  isLifetime: false,
  activeUntil: null,
  daysRemaining: 0,
  coins: 0,
  subscriptionType: null,
  subscriptionStatus: null,
};

// Ключ для React Query кэша
const PREMIUM_QUERY_KEY = "premium-status";

/**
 * SUPER ОПТИМИЗИРОВАННЫЙ хук для получения premium статуса
 * v2.0 - Использует данные из Super RPC Dashboard (нет отдельного запроса!)
 * Fallback на Edge Function только если Super RPC не вернул premium данные
 */
export function usePremium() {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();
  
  // ОПТИМИЗАЦИЯ: Пытаемся взять premium из Super RPC Dashboard
  const { data: dashboardData } = useDashboardData();

  const {
    data: state = initialState,
    isLoading: loading,
    refetch,
  } = useQuery<PremiumState>({
    queryKey: [PREMIUM_QUERY_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return initialState;

      // ОПТИМИЗАЦИЯ: Если есть данные из Super RPC - используем их!
      if (dashboardData?.premium) {
        console.log('[usePremium] ✅ Using premium data from Super RPC (no extra request)');
        const premium = dashboardData.premium;
        
        return {
          isPremium: premium.is_premium,
          isTrial: premium.subscription_status === 'trial',
          isLifetime: premium.subscription_status === 'lifetime',
          activeUntil: premium.subscription_end_date,
          daysRemaining: premium.trial_days_remaining ?? 0,
          coins: dashboardData.profile.coins,
          subscriptionType: premium.subscription_status,
          subscriptionStatus: premium.subscription_status,
        };
      }

      // Fallback: Edge Function (только если Super RPC не вернул данные)
      console.warn('[usePremium] ⚠️ Super RPC premium data not available, using Edge Function');

      const { data, error } = await supabase.functions.invoke("premium-status", {
        body: { user_id: profileId },
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[usePremium] Failed to fetch status:", error);
        }
        throw error;
      }

      if (!data?.success) {
        return initialState;
      }

      return {
        isPremium: data.isPremium ?? false,
        isTrial: data.isTrial ?? false,
        isLifetime: data.isLifetime ?? false,
        activeUntil: data.activeUntil ?? null,
        daysRemaining: data.daysRemaining === null ? 999999 : (data.daysRemaining ?? 0),
        coins: data.coins ?? 0,
        subscriptionType: data.subscriptionType || null,
        subscriptionStatus: data.subscriptionStatus || null,
      };
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 1,
    placeholderData: initialState,
  });

  // Функция для принудительного обновления
  const refresh = async () => {
    await refetch();
  };

  // Функция для инвалидации кэша (полезно после покупки premium)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PREMIUM_QUERY_KEY, profileId] });
  };

  return {
    ...state,
    loading,
    refresh,
    invalidate,
  };
}


