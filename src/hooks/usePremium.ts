import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

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
 * ОПТИМИЗИРОВАННЫЙ хук для получения premium статуса
 * Использует React Query для глобального кэширования и дедупликации запросов
 * Все компоненты используют один и тот же кэш - запрос выполняется только один раз
 */
export function usePremium() {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();

  const {
    data: state = initialState,
    isLoading: loading,
    refetch,
  } = useQuery<PremiumState>({
    queryKey: [PREMIUM_QUERY_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return initialState;

      const { data, error } = await supabase.functions.invoke("premium-status", {
        body: { user_id: profileId },
      });

      if (error) {
        // Тихая обработка ошибок - возвращаем initialState
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
        daysRemaining: data.daysRemaining === null ? 999999 : (data.daysRemaining ?? 0), // null = Premium Forever
        coins: data.coins ?? 0,
        subscriptionType: data.subscriptionType || null,
        subscriptionStatus: data.subscriptionStatus || null,
      };
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты - данные считаются свежими
    gcTime: 5 * 60 * 1000, // 5 минут - кэш хранится в памяти
    refetchOnWindowFocus: false, // Не перезапрашиваем при фокусе
    refetchOnMount: false, // Не перезапрашиваем при монтировании, если данные свежие
    refetchOnReconnect: true, // Перезапрашиваем только при восстановлении соединения
    retry: 1, // Минимум повторных попыток
    // Используем initialState при ошибке
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


