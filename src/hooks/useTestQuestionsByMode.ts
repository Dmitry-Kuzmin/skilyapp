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
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки вопросов Challenge Bank
 */
export function useChallengeBankQuestions(profileId: string | null, limit: number = 30) {
  return useQuery<QuestionWithOptions[]>({
    queryKey: ["challenge-bank-questions", profileId, limit],
    queryFn: async () => {
      if (!profileId) return [];

      const { data: challengeQuestions, error: challengeError } = await supabase.rpc(
        "get_challenge_bank_questions",
        {
          p_user_id: profileId,
          p_limit: limit,
          p_only_not_mastered: true,
        }
      );

      if (challengeError) throw challengeError;
      if (!challengeQuestions || challengeQuestions.length === 0) return [];

      // Загружаем answer_options batch запросом
      const questionIds = challengeQuestions.map((q: any) => q.id);
      const { data: optionsData, error: optionsError } = await supabase
        .from("answer_options")
        .select("*")
        .in("question_id", questionIds);

      if (optionsError) throw optionsError;

      return challengeQuestions.map((q: any) => {
        const options = (optionsData || []).filter((opt: any) => opt.question_id === q.id);
        return {
          ...q,
          answer_options: options,
          topics: q.topic_title_ru
            ? {
                title_ru: q.topic_title_ru,
                title_es: q.topic_title_es || q.topic_title_ru,
              }
            : null,
        };
      });
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки DGT вопросов
 */
export function useDGTQuestions(category: string | null, limit: number = 30) {
  return useQuery<QuestionWithOptions[]>({
    queryKey: ["dgt-questions", category, limit],
    queryFn: async () => {
      if (!category) return [];

      const { data: dgtQuestions, error: dgtError } = await supabase.rpc(
        "get_random_dgt_questions",
        {
          p_category: category.toUpperCase(),
          p_limit: limit,
        }
      );

      if (dgtError) throw dgtError;
      if (!dgtQuestions || dgtQuestions.length === 0) return [];

      // Преобразуем DGT вопросы в формат TestSession
      return dgtQuestions.map((q: any) => ({
        id: q.id,
        question_ru: q.question_es,
        question_es: q.question_es,
        question_en: q.question_es,
        image_url: q.image_filename || null,
        explanation_ru: q.explanation_es || "Нет объяснения",
        explanation_es: q.explanation_es || "Sin explicación",
        explanation_en: q.explanation_es || "No explanation",
        topics: {
          title_ru: `DGT Экзамен ${category.toUpperCase()}`,
          title_es: `Examen DGT ${category.toUpperCase()}`,
        },
        answer_options: [
          {
            id: `${q.id}_a`,
            question_id: q.id,
            text_ru: q.option_a_es,
            text_es: q.option_a_es,
            text_en: q.option_a_es,
            is_correct: q.correct_answer === "a",
            position: 1,
          },
          {
            id: `${q.id}_b`,
            question_id: q.id,
            text_ru: q.option_b_es,
            text_es: q.option_b_es,
            text_en: q.option_b_es,
            is_correct: q.correct_answer === "b",
            position: 2,
          },
          {
            id: `${q.id}_c`,
            question_id: q.id,
            text_ru: q.option_c_es,
            text_es: q.option_c_es,
            text_en: q.option_c_es,
            is_correct: q.correct_answer === "c",
            position: 3,
          },
        ],
      }));
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки вопросов по теме (practice, mastery, module, hardest)
 */
export function useQuestionsByTopic(
  topicId: string | null,
  questionCount: number = 30,
  enabled: boolean = true
) {
  return useQuery<QuestionWithOptions[]>({
    queryKey: ["questions-by-topic", topicId, questionCount],
    queryFn: async () => {
      let query = supabase
        .from("questions_new")
        .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `);

      if (topicId) {
        query = query.eq("topic_id", topicId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Убираем дубликаты
      const uniqueQuestionsMap = new Map<string, QuestionWithOptions>();
      (data || []).forEach((q: any) => {
        if (!uniqueQuestionsMap.has(q.id)) {
          uniqueQuestionsMap.set(q.id, {
            ...q,
            topics: q.topics
              ? {
                  title_ru: q.topics.title_ru,
                  title_es: q.topics.title_es,
                }
              : null,
            answer_options: q.answer_options || [],
          });
        }
      });

      const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

      // Перемешиваем и ограничиваем
      const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, questionCount);
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки информации о тесте
 */
export function useTestInfo(testId: string | null) {
  return useQuery<{
    id: string;
    title_ru: string;
    topic_id: string | null;
    topics: {
      title_ru: string;
      title_es: string;
    } | null;
  } | null>({
    queryKey: ["test-info", testId],
    queryFn: async () => {
      if (!testId) return null;

      const { data, error } = await supabase
        .from("tests")
        .select(`
          id,
          title_ru,
          topic_id,
          topics (title_ru, title_es)
        `)
        .eq("id", testId)
        .single();

      if (error) throw error;

      return data
        ? {
            id: data.id,
            title_ru: data.title_ru,
            topic_id: data.topic_id,
            topics: data.topics
              ? {
                  title_ru: data.topics.title_ru,
                  title_es: data.topics.title_es,
                }
              : null,
          }
        : null;
    },
    enabled: !!testId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

