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

      // Добавляем фильтр по категории если она указана
      if (category) {
        // Мы используем .or() потому что в разных странах могут быть разные ключи в метаданных
        // Для России это ticket_category
        query = query.filter("questions_new.metadata->>ticket_category", "ilike", `%${category}%`);
      }

      const { data, error } = await query;

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

