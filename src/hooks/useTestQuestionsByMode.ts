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
export function useChallengeBankQuestions(
  profileId: string | null,
  limit: number = 20, // Ограничиваем сессию 20 вопросами для Inbox Zero эффекта
  country?: string
) {
  return useQuery<QuestionWithOptions[]>({
    queryKey: ["challenge-bank-questions", profileId, limit, country],
    queryFn: async () => {
      if (!profileId) return [];

      const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

      // 1. Получаем ID вопросов из challenge bank с фильтром по стране
      let query = supabase
        .from("user_challenge_questions")
        .select("question_id, questions_new!inner(country)")
        .eq("user_id", profileId)
        .eq("mastered", false);

      if (dbCountry) {
        query = query.eq("questions_new.country", dbCountry);
      }

      const { data: challengeRelations, error: relError } = await query
        .order("last_wrong_at", { ascending: false })
        .limit(limit);

      if (relError) throw relError;
      if (!challengeRelations || challengeRelations.length === 0) return [];

      const questionIds = challengeRelations.map(r => r.question_id);

      // 2. Загружаем полные данные вопросов
      const { data: questionsData, error: qError } = await supabase
        .from("questions_new")
        .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `)
        .in("id", questionIds);

      if (qError) throw qError;
      if (!questionsData || questionsData.length === 0) return [];

      // Мапим к универсальному формату
      return questionsData.map((q: any) => ({
        ...q,
        topics: q.topics ? { title_ru: q.topics.title_ru, title_es: q.topics.title_es } : null,
        answer_options: q.answer_options || []
      }));
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000,
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

      console.log(`[useDGTQuestions] Loading ${limit} questions from questions_new for Spain`);

      // NEW: Load from questions_new (spain unified table) instead of old dgt_questions
      const { data: questions, error } = await supabase
        .from('questions_new')
        .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `)
        .eq('country', 'es')
        .limit(Math.max(limit * 2, 100)); // Load extra for shuffling

      if (error) {
        console.error('[useDGTQuestions] Error:', error);
        throw error;
      }

      if (!questions || questions.length === 0) {
        console.warn('[useDGTQuestions] No questions found in questions_new for Spain');
        return [];
      }

      // Shuffle and take requested amount
      const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, limit);

      console.log(`[useDGTQuestions] Loaded ${shuffled.length} questions with answers`);

      // Map to unified format
      return shuffled.map((q: any) => ({
        id: q.id,
        question_ru: q.question_ru,
        question_es: q.question_es,
        question_en: q.question_en,
        image_url: q.image_url || null,
        explanation_ru: q.explanation_ru || null,
        explanation_es: q.explanation_es || null,
        explanation_en: q.explanation_en || null,
        topics: q.topics ? { title_ru: q.topics.title_ru, title_es: q.topics.title_es } : null,
        answer_options: (q.answer_options || []).sort((a: any, b: any) => a.position - b.position)
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
          topics!inner (id, title_ru, title_es, number),
          answer_options (*)
        `);

      if (topicId) {
        // Check if topicId is a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);

        if (isUUID) {
          query = query.eq("topic_id", topicId);
        } else if (topicId.toString().startsWith('topic-')) {
          // Handle legacy format "topic-01" -> extract number
          const number = parseInt(topicId.toString().replace('topic-', ''), 10);
          if (!isNaN(number)) {
            query = query.eq("topics.number", number);
          }
        }
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

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки вопросов из Избранного
 */
export function useFavoritesQuestions(
  profileId: string | null,
  limit: number = 20,
  country?: string
) {
  return useQuery<QuestionWithOptions[]>({
    queryKey: ["favorites-questions", profileId, limit, country],
    queryFn: async () => {
      if (!profileId) return [];

      const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

      // 1. Получаем ID вопросов из избранного с фильтром по стране
      let query = supabase
        .from("user_challenge_questions")
        .select("question_id, questions_new!inner(country)")
        .eq("user_id", profileId)
        .eq("is_favorite", true);

      if (dbCountry) {
        query = query.eq("questions_new.country", dbCountry);
      }

      const { data: favoriteRelations, error: relError } = await query
        .order("created_at", { ascending: false })
        .limit(limit);

      if (relError) throw relError;
      if (!favoriteRelations || favoriteRelations.length === 0) return [];

      const questionIds = favoriteRelations.map(r => r.question_id);

      // 2. Загружаем полные данные вопросов
      const { data: questionsData, error: qError } = await supabase
        .from("questions_new")
        .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `)
        .in("id", questionIds);

      if (qError) throw qError;
      if (!questionsData || questionsData.length === 0) return [];

      // Мапим к универсальному формату
      return questionsData.map((q: any) => ({
        ...q,
        topics: q.topics ? { title_ru: q.topics.title_ru, title_es: q.topics.title_es } : null,
        answer_options: q.answer_options || []
      }));
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000,
  });
}
