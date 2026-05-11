import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContext, useMemo } from "react";
import { UserContext } from "@/contexts/UserContext";
import { useDashboardData } from "./useDashboardData";

// Безопасная обертка для useQueryClient - возвращает null если провайдер отсутствует
function useSafeQueryClient() {
  try {
    return useQueryClient();
  } catch (error) {
    // QueryClientProvider отсутствует - возвращаем null
    return null;
  }
}

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
  // Безопасное обращение к UserContext: если провайдер отсутствует (лендинг/глобальная модалка), возвращаем статику
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const queryClient = useSafeQueryClient();
  
  // ВАЖНО: Всегда вызываем хуки в одном порядке (правила хуков)
  // ОПТИМИЗАЦИЯ: Пытаемся взять premium из Super RPC Dashboard
  // useDashboardData теперь безопасный и вернет null если QueryClient отсутствует
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData();

  // Dashboard premium данные готовы — строим состояние без доп. запроса
  const dashboardPremium = dashboardData?.premium
    ? {
        isPremium: dashboardData.premium.is_premium,
        isTrial: dashboardData.premium.subscription_status === 'trial',
        isLifetime: dashboardData.premium.subscription_status === 'lifetime',
        activeUntil: dashboardData.premium.subscription_end_date ?? null,
        daysRemaining: 0,
        coins: dashboardData.profile?.coins ?? 0,
        subscriptionType: dashboardData.premium.subscription_status ?? null,
        subscriptionStatus: dashboardData.premium.subscription_status ?? null,
      }
    : null;

  // Проверяем наличие провайдеров для enabled флага
  const hasProviders = !!(userContext && queryClient);

  const {
    data: state = initialState,
    isLoading: loading,
    refetch,
  } = useQuery<PremiumState>({
    queryKey: [PREMIUM_QUERY_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return initialState;

      // Fallback: Edge Function (только если Super RPC не вернул premium)
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
    // Запускаем Edge Function только если dashboard загрузился и premium там нет
    enabled: hasProviders && !!profileId && !dashboardLoading && !dashboardPremium,
    initialData: dashboardPremium ?? undefined,
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
    if (queryClient) {
    queryClient.invalidateQueries({ queryKey: [PREMIUM_QUERY_KEY, profileId] });
    }
  };

  // Если нет провайдеров - возвращаем заглушку
  if (!hasProviders) {
    return {
      ...initialState,
      loading: false,
      refresh: async () => {},
      invalidate: () => {},
  };
  }

  // dashboardPremium is always fresher (staleTime 30s, refetchOnMount true)
  // than state from useQuery (staleTime 2min, refetchOnMount false, IndexedDB-persisted).
  // Prioritise dashboard data to avoid stale cache showing wrong premium status.
  const effective = dashboardPremium ?? state;

  return {
    ...effective,
    loading,
    refresh,
    invalidate,
  };
}


