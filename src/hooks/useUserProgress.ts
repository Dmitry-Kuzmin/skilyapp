import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserProgress {
  is_correct: boolean;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки прогресса пользователя с фильтрацией по стране и категории
 */
export function useUserProgress(profileId: string | null, country?: string, category?: string) {
  return useQuery<UserProgress[]>({
    queryKey: ["user-progress", profileId, country, category],
    queryFn: async () => {
      if (!profileId) return [];

      // Нормализация страны для БД
      const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

      let query = supabase
        .from("user_progress")
        .select("is_correct, questions_new!inner(country, metadata)")
        .eq("user_id", profileId);

      if (dbCountry) {
        query = query.eq("questions_new.country", dbCountry);
      }

      // Добавляем фильтр по категории ТОЛЬКО для России (у Испании нет ticket_category)
      if (category && country === 'russia') {
        query = query.filter("questions_new.metadata->>ticket_category", "ilike", `%${category}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as UserProgress[];
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });
}

