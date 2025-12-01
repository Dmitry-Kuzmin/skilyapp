import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки количества вопросов в Challenge Bank
 * Кэширует данные на 5 минут
 */
export function useChallengeBankCount(profileId: string | null) {
  return useQuery<number>({
    queryKey: ["challenge-bank-count", profileId],
    queryFn: async () => {
      if (!profileId) return 0;

      const { count, error } = await supabase
        .from("user_challenge_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileId)
        .eq("mastered", false);

      if (error) throw error;

      return count || 0;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

