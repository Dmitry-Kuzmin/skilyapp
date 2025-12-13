import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Test {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  topic_id: string | null;
  topics: {
    title_ru: string;
    title_es: string;
    number: number;
  } | null;
  progress?: {
    status: string;
    score: number;
    best_score: number;
    attempts_count: number;
    correct_answers: number;
    total_questions: number;
  } | null;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки sequential тестов с прогрессом
 * Объединяет загрузку тестов и прогресса пользователя в один запрос
 */
export function useSequentialTests(profileId: string | null) {
  return useQuery<Test[]>({
    queryKey: ["sequential-tests", profileId],
    queryFn: async () => {
      // ОПТИМИЗАЦИЯ: Загружаем тесты с темами одним запросом
      const { data: testsData, error: testsError } = await supabase
        .from("tests")
        .select(`
          *,
          topics (title_ru, title_es, number)
        `)
        .order("order_index");

      if (testsError) throw testsError;

      // ОПТИМИЗАЦИЯ: Загружаем прогресс пользователя batch запросом
      let progressMap = new Map<string, Test["progress"]>();

      if (profileId) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_test_progress")
          .select("*")
          .eq("user_id", profileId);

        if (!progressError && progressData) {
          progressData.forEach((p) => {
            progressMap.set(p.test_id, {
              status: p.status,
              score: p.score,
              best_score: p.best_score,
              attempts_count: p.attempts_count,
              correct_answers: p.correct_answers,
              total_questions: p.total_questions,
            });
          });
        }
      }

      // Объединяем тесты с прогрессом
      const testsWithProgress = (testsData || []).map((test) => ({
        ...test,
        progress: progressMap.get(test.id) || null,
      }));

      return testsWithProgress;
    },
    enabled: true, // Всегда загружаем тесты, даже без profileId
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

































