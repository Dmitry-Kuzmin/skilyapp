import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QuestionWithOptions {
  id: string;
  question_ru: string;
  question_es: string;
  question_en: string;
  image_url: string | null;
  explanation_ru: string | null;
  explanation_es: string | null;
  explanation_en: string | null;
  topics: {
    title_ru: string;
    title_es: string;
  } | null;
  answer_options?: {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
    question_id: string;
  }[];
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки вопросов с опциями
 * Объединяет загрузку вопросов и answer_options в один запрос через join
 */
export function useTestQuestions(options: {
  topicId?: string | null;
  questionCount?: number;
  enabled?: boolean;
}) {
  const { topicId, questionCount = 30, enabled = true } = options;

  return useQuery<QuestionWithOptions[]>({
    queryKey: ["test-questions", topicId, questionCount],
    queryFn: async () => {
      // ОПТИМИЗАЦИЯ: Используем join для загрузки вопросов с topics и answer_options одним запросом
      let query = supabase
        .from("questions_new")
        .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `);

      // Фильтр по теме, если указана
      if (topicId) {
        query = query.eq("topic_id", topicId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[useTestQuestions] Error loading questions:", error);
        throw error;
      }

      // Убираем дубликаты вопросов по id
      const uniqueQuestionsMap = new Map<string, QuestionWithOptions>();
      (data || []).forEach((q: any) => {
        if (!uniqueQuestionsMap.has(q.id)) {
          uniqueQuestionsMap.set(q.id, {
            ...q,
            topics: q.topics ? {
              title_ru: q.topics.title_ru,
              title_es: q.topics.title_es,
            } : null,
            answer_options: q.answer_options || [],
          });
        }
      });

      const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

      // Перемешиваем и ограничиваем количество
      const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, questionCount);
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 минут - вопросы редко меняются
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки вопросов из теста (sequential)
 * Загружает вопросы и опции batch запросом
 */
export function useSequentialTestQuestions(testId: string | null) {
  return useQuery<QuestionWithOptions[]>({
    queryKey: ["sequential-test-questions", testId],
    queryFn: async () => {
      if (!testId) return [];

      // Загружаем информацию о тесте
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .select(`
          *,
          topics (title_ru, title_es)
        `)
        .eq("id", testId)
        .single();

      if (testError) throw testError;
      if (!testData) return [];

      // Загружаем вопросы теста через RPC или прямую загрузку
      const { data: questionsData, error: questionsError } = await supabase
        .rpc("get_test_questions", { p_test_id: testId })
        .catch(async () => {
          // Fallback: загружаем через прямую связь
          const { data, error } = await supabase
            .from("test_questions")
            .select("question_id, position")
            .eq("test_id", testId)
            .order("position");

          if (error) throw error;
          return { data, error: null };
        });

      if (questionsError) throw questionsError;

      const questions = questionsData || [];
      if (questions.length === 0) return [];

      // Преобразуем question_id в id для совместимости
      const questionsWithId = questions.map((q: any) => ({
        ...q,
        id: q.question_id || q.id,
      }));

      // Загружаем answer_options для всех вопросов batch запросом
      const questionIds = questionsWithId.map((q: any) => q.id);
      const { data: optionsData, error: optionsError } = await supabase
        .from("answer_options")
        .select("*")
        .in("question_id", questionIds);

      if (optionsError) throw optionsError;

      // Объединяем вопросы с опциями и темой
      const questionsWithOptions = questionsWithId.map((q: any) => {
        const options = (optionsData || []).filter(
          (opt: any) => opt.question_id === q.id
        );
        return {
          ...q,
          answer_options: options,
          topics: testData.topics
            ? {
                title_ru: testData.topics.title_ru,
                title_es: testData.topics.title_es,
              }
            : null,
        };
      });

      return questionsWithOptions;
    },
    enabled: !!testId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}





















