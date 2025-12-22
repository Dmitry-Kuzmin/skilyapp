import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

interface ProfileData {
  id: string;
  coins: number;
  xp: number;
  streak_days: number;
  rank: string | null;
  boosts: number | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  equipped_avatar: string | null;
}

const PROFILE_QUERY_KEY = "profile-data";

/**
 * ОПТИМИЗИРОВАННЫЙ хук для получения данных профиля
 * Объединяет все запросы к профилю в один запрос с полным select
 * Все компоненты используют один и тот же кэш
 */
export function useProfileData() {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();

  const {
    data: profileData,
    isLoading: loading,
    refetch,
  } = useQuery<ProfileData | null>({
    queryKey: [PROFILE_QUERY_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // ОДИН запрос вместо множества - получаем все нужные поля сразу
      const { data, error } = await supabase
        .from("profiles")
        .select("id, coins, xp, streak_days, rank, boosts, first_name, last_name, username, photo_url, equipped_avatar")
        .eq("id", profileId)
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[useProfileData] Failed to fetch profile:", error);
        }
        throw error;
      }

      return data as ProfileData;
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000, // 1 минута - данные профиля обновляются реже
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  // Функция для принудительного обновления
  const refresh = async () => {
    await refetch();
  };

  // Функция для инвалидации кэша (полезно после изменения баланса)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, profileId] });
  };

  return {
    profileData,
    loading,
    refresh,
    invalidate,
    // Удобные геттеры для обратной совместимости
    coins: profileData?.coins ?? 0,
    xp: profileData?.xp ?? 0,
    streakDays: profileData?.streak_days ?? 0,
    rank: profileData?.rank ?? null,
    boosts: profileData?.boosts ?? 0,
  };
}

