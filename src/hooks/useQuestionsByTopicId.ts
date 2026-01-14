import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CountryCode } from '@/types/pdd';

/**
 * Хук для загрузки вопросов темы по topic_id из questions_new
 * Используется для Испании и других стран с новой структурой БД
 */
export function useQuestionsByTopicId(
    topicId: string | null,
    country: CountryCode | null,
    limit?: number,
    level?: number
) {
    return useQuery({
        queryKey: ['questions-by-topic-id', topicId, country, limit, level],
        queryFn: async () => {
            if (!topicId || !country) {
                throw new Error('Topic ID and country are required');
            }

            const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

            let query = supabase
                .from('questions_new')
                .select('*, answer_options (*)')
                .eq('topic_id', topicId)
                .eq('country', dbCountry)
                .order('id');

            // Если указан level (номер билета), вычисляем offset
            if (level && limit) {
                const offset = (level - 1) * limit;
                query = query.range(offset, offset + limit - 1);
            } else if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[useQuestionsByTopicId] Error:', error);
                throw error;
            }

            // Маппер: преобразуем формат questions_new в формат, который ожидает UI (TestSession)
            const mappedQuestions = (data || []).map(question => {
                const metadata = question.metadata || {};
                const dbAnswers = (question as any).answer_options || [];

                // Проверяем три варианта структуры: 
                // 1. Связанная таблица answer_options (приоритет)
                // 2. metadata.answer_options (массив)
                // 3. metadata.options (объект)
                let final_options;

                if (dbAnswers.length > 0) {
                    // Формат из связанной таблицы answer_options
                    final_options = dbAnswers.map((opt: any) => ({
                        id: opt.id,
                        position: opt.position || 0,
                        is_correct: opt.is_correct || false,
                        text_ru: opt.text_ru || '',
                        text_es: opt.text_es || '',
                        text_en: opt.text_en || ''
                    })).sort((a: any, b: any) => a.position - b.position);
                } else if (metadata.answer_options && Array.isArray(metadata.answer_options)) {
                    // Новый формат: metadata.answer_options - массив готовых вариантов
                    final_options = metadata.answer_options.map((opt: any, index: number) => ({
                        id: opt.id || `${question.id}-${index}`,
                        position: opt.position || index + 1,
                        is_correct: opt.is_correct || false,
                        text_ru: opt.text_ru || '',
                        text_es: opt.text_es || '',
                        text_en: opt.text_en || ''
                    }));
                } else {
                    // Старый формат: metadata.options с вложенной структурой
                    const optionsMeta = metadata.options || {};
                    const correctAnswerChar = question.correct_answer || 'a';

                    final_options = ['a', 'b', 'c'].map((char, index) => {
                        const isCorrect = char.toLowerCase() === correctAnswerChar.toLowerCase();
                        return {
                            id: `${question.id}-${char}`,
                            position: index + 1,
                            is_correct: isCorrect,
                            text_ru: optionsMeta.ru?.[char] || '',
                            text_es: optionsMeta.es?.[char] || '',
                            text_en: optionsMeta.en?.[char] || ''
                        };
                    }).filter(opt => opt.text_es || opt.text_ru);
                }

                return {
                    ...question,
                    answer_options: final_options,
                    // Поля для обратной совместимости, если где-то еще нужны
                    question_ru: question.question_ru,
                    question_es: question.question_es,
                    question_en: question.question_en,
                    explanation_ru: question.explanation_ru,
                    explanation_es: question.explanation_es,
                    explanation_en: question.explanation_en,
                };
            });

            return mappedQuestions;
        },
        enabled: !!topicId && !!country,
        staleTime: 5 * 60 * 1000, // 5 минут
        retry: 1
    });
}
