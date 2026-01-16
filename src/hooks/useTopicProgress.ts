import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopicProgress {
    completedQuestionIds: string[];
    errorQuestionIds: string[];
}

/**
 * Хук для загрузки прогресса пользователя по теме
 * Возвращает ID завершенных вопросов и вопросов с ошибками
 */
export function useTopicProgress(
    topicId: string | null,
    userId: string | null,
    country: string | null
) {
    return useQuery<TopicProgress>({
        queryKey: ['topic-progress', topicId, userId, country],
        queryFn: async () => {
            if (!topicId || !userId || !country) {
                return {
                    completedQuestionIds: [],
                    errorQuestionIds: []
                };
            }

            // Получаем вопросы топика
            const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

            // Проверяем, является ли topicId UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);

            let questionIds: string[] = [];

            if (isUUID) {
                // UUID - фильтруем по topic_id
                const { data: questions, error: questionsError } = await supabase
                    .from('questions_new')
                    .select('id')
                    .eq('topic_id', topicId)
                    .eq('country', dbCountry);

                if (questionsError) throw questionsError;
                questionIds = questions?.map(q => q.id) || [];
            } else {
                // Название темы - фильтруем через join
                const isSpain = country === 'spain';
                const titleField = isSpain ? 'title_es' : 'title_ru';

                const { data: questions, error: questionsError } = await supabase
                    .from('questions_new')
                    .select(`
            id,
            topics!inner (${titleField})
          `)
                    .eq(`topics.${titleField}`, topicId)
                    .eq('country', dbCountry);

                if (questionsError) throw questionsError;
                questionIds = questions?.map(q => q.id) || [];
            }

            if (questionIds.length === 0) {
                return {
                    completedQuestionIds: [],
                    errorQuestionIds: []
                };
            }

            // Получаем ответы пользователя на эти вопросы
            const { data: userAnswers, error: answersError } = await supabase
                .from('user_answers')
                .select('question_id, is_correct')
                .eq('user_id', userId)
                .in('question_id', questionIds);

            if (answersError) throw answersError;

            // Группируем ответы
            const answeredMap = new Map<string, boolean>();
            userAnswers?.forEach(answer => {
                // Для каждого вопроса храним последний результат
                answeredMap.set(answer.question_id, answer.is_correct);
            });

            const completedQuestionIds: string[] = [];
            const errorQuestionIds: string[] = [];

            answeredMap.forEach((isCorrect, questionId) => {
                completedQuestionIds.push(questionId);
                if (!isCorrect) {
                    errorQuestionIds.push(questionId);
                }
            });

            return {
                completedQuestionIds,
                errorQuestionIds
            };
        },
        enabled: !!topicId && !!userId && !!country,
        staleTime: 30 * 1000, // 30 секунд - прогресс обновляется часто
        retry: 1
    });
}
