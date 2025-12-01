import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserProgress {
  topic_id: string;
  questions_answered: number;
  correct_answers: number;
  last_practiced_at: string | null;
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
        .select("topic_id, questions_answered, correct_answers, last_practiced_at")
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

