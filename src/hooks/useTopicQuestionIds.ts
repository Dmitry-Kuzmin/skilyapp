import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Хук для загрузки всех ID вопросов темы
 * Нужен для формирования виртуальных билетов
 */
export function useTopicQuestionIds(
    topicId: string | null,
    country: string | null
) {
    return useQuery<string[]>({
        queryKey: ['topic-question-ids', topicId, country],
        queryFn: async () => {
            if (!topicId || !country) return [];

            if (import.meta.env.DEV) {
                console.log('[useTopicQuestionIds] Query params:', { topicId, country });
            }

            const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

            // Проверяем, является ли topicId UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);

            if (isUUID) {
                // UUID - фильтруем по topic_id
                const { data: questions, error } = await supabase
                    .from('questions_new')
                    .select('id')
                    .eq('topic_id', topicId)
                    .eq('country', dbCountry)
                    .order('id'); // Стабильный порядок для consistency

                if (error) {
                    console.error('[useTopicQuestionIds] Error (UUID):', error);
                    throw error;
                }

                if (import.meta.env.DEV) {
                    console.log('[useTopicQuestionIds] Result (UUID):', questions?.length || 0, 'questions');
                }

                return questions?.map(q => q.id) || [];
            } else {
                // Название темы - фильтруем через join
                const isSpain = country === 'spain';
                const titleField = isSpain ? 'title_es' : 'title_ru';

                const { data: questions, error } = await supabase
                    .from('questions_new')
                    .select(`
            id,
            topics!inner (${titleField})
          `)
                    .eq(`topics.${titleField}`, topicId)
                    .eq('country', dbCountry)
                    .order('id');

                if (error) {
                    console.error('[useTopicQuestionIds] Error (name):', error);
                    throw error;
                }

                if (import.meta.env.DEV) {
                    console.log('[useTopicQuestionIds] Result (name):', {
                        topicName: topicId,
                        titleField,
                        dbCountry,
                        questionsCount: questions?.length || 0
                    });
                }

                return questions?.map(q => q.id) || [];
            }
        },
        enabled: !!topicId && !!country,
        staleTime: 5 * 60 * 1000, // 5 минут - список вопросов темы меняется редко
        retry: 1
    });
}
