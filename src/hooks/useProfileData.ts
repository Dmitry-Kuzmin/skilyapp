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
  telegram_id: number | null;
  preferred_country?: string | null;
  preferred_license_category?: string | null;
  subscription_status?: string | null;
  premium_forever_purchased_at?: string | null;
  settings?: any;
  created_at?: string;
  updated_at?: string;
}

export const PROFILE_QUERY_KEY = "profile-data";
export const USER_AVATAR_QUERY_KEY = "user-avatar-data"; // Для совместимости с аватарами/скинами

/**
 * ОПТИМИЗИРОВАННЫЙ хук для получения данных профиля
 * Объединяет все запросы к профилю в один запрос с полным select
 * Все компоненты используют один и тот же кэш
 */
export function useProfileData(id?: string | null) {
  const { profileId: contextProfileId } = useUserContext();
  const profileId = id !== undefined ? id : contextProfileId;
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
        .select(`
          id, coins, xp, streak_days, rank, boosts, first_name, last_name, 
          username, photo_url, equipped_avatar, telegram_id, 
          preferred_country, preferred_license_category,
          subscription_status, premium_forever_purchased_at, settings
        `)
        .eq("id", profileId)
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[useProfileData] Failed to fetch profile:", error);
        }
        throw error;
      }

      // Debug: проверяем, что загрузились настройки страны и категории
      if (import.meta.env.DEV && data) {
        console.log('[useProfileData] Loaded preferences from DB:', {
          country: data.preferred_country,
          category: data.preferred_license_category
        });
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
    // Единая инвалидация через основной ключ профиля
    queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
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
    isPremium: profileData?.subscription_status === 'pro' ||
      profileData?.subscription_status === 'lifetime' ||
      !!profileData?.premium_forever_purchased_at ||
      (profileData?.settings as any)?.subscription_type === 'lifetime'
  };
}

/**
 * Хук для получения активного скина пользователя
 * Использует отдельный кэш, так как скины запрашиваются только в аватарах
 */
export function useUserSkins(profileId: string | null) {
  return useQuery({
    queryKey: ['user-skins', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('user_skins')
        .select(`
          is_active,
          skin_definitions (*)
        `)
        .eq('user_id', profileId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data?.skin_definitions || null;
    },
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000, // Скины меняются редко
  });
}

