import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserProgress {
  is_correct: boolean;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки прогресса пользователя
 * Кэширует данные на 2 минуты
 */
export function useUserProgress(profileId: string | null) {
  return useQuery<UserProgress[]>({
    queryKey: ["user-progress", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("user_progress")
        .select("is_correct")
        .eq("user_id", profileId);

      if (error) throw error;

      return (data || []) as UserProgress[];
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

