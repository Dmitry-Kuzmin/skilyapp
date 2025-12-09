import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  topics: number;
  questions: number;
  users: number;
  tags: number;
  reports: number;
  languageTerms: number;
  roadSigns: number;
  activeUsers: number;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки статистики админки
 * Объединяет все запросы в Promise.all для параллельной загрузки
 * Кэширует данные на 30 секунд (обновление каждые 30 секунд)
 */
export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // ОПТИМИЗАЦИЯ: Все запросы выполняются параллельно
      const [
        topicsRes,
        questionsRes,
        usersRes,
        tagsRes,
        reportsRes,
        termsRes,
        signsRes,
        activeUsersRes,
      ] = await Promise.all([
        supabase.from("topics").select("*", { count: "exact", head: true }),
        supabase.from("questions_new").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tags").select("*", { count: "exact", head: true }),
        supabase
          .from("question_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("language_terms").select("*", { count: "exact", head: true }),
        supabase.from("road_signs").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        topics: topicsRes.count || 0,
        questions: questionsRes.count || 0,
        users: usersRes.count || 0,
        tags: tagsRes.count || 0,
        reports: reportsRes.count || 0,
        languageTerms: termsRes.count || 0,
        roadSigns: signsRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
      };
    },
    staleTime: 30 * 1000, // 30 секунд - данные обновляются каждые 30 секунд
    gcTime: 2 * 60 * 1000, // 2 минуты
    refetchInterval: 30 * 1000, // Автоматическое обновление каждые 30 секунд
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });
}




















