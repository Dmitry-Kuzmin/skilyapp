import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки количества вопросов в Challenge Bank
 * Кэширует данные на 5 минут
 */
/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки количества вопросов в Challenge Bank с фильтром по стране и категории
 */
export function useChallengeBankCount(profileId: string | null, country?: string, category?: string) {
  return useQuery<number>({
    queryKey: ["challenge-bank-count", profileId, country, category],
    queryFn: async () => {
      if (!profileId) return 0;

      // Map dynamic country to DB code if needed
      const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

      let query = supabase
        .from("user_challenge_questions")
        .select("*, questions_new!inner(country)", { count: "exact", head: true })
        .eq("user_id", profileId)
        .eq("mastered", false);

      if (dbCountry) {
        query = query.eq("questions_new.country", dbCountry);
      }

      // Добавляем фильтр по категории если она указана
      if (category) {
        // Для России это ticket_category внутри metadata
        if (country === 'russia') {
          query = query.filter("questions_new.metadata->>ticket_category", "ilike", `%${category}%`);
        } else {
          query = query.filter("questions_new.metadata->>ticket_category", "ilike", `%${category}%`);
        }
      }

      const { count, error } = await query;

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

