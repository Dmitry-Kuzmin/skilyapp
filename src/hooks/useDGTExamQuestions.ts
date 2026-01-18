import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for fetching random DGT questions for exam mode
 * Uses RPC function get_random_dgt_questions
 */
export const useDGTExamQuestions = (count: number = 30) => {
    return useQuery({
        queryKey: ['dgt-exam-questions', count],
        queryFn: async () => {
            console.log(`[useDGTExamQuestions] Fetching ${count} random DGT questions...`);

            const { data, error } = await supabase
                .rpc('get_random_dgt_questions', { p_count: count });

            if (error) {
                console.error('[useDGTExamQuestions] Error:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                console.warn('[useDGTExamQuestions] No questions found');
                return [];
            }

            console.log(`[useDGTExamQuestions] Loaded ${data.length} questions`);

            // Transform to match expected structure
            return data.map((q: any) => ({
                id: q.question_id,
                question_ru: q.question_ru,
                question_es: q.question_es,
                question_en: q.question_en,
                image_url: q.image_url,
                explanation_ru: q.explanation_ru,
                explanation_es: q.explanation_es,
                explanation_en: q.explanation_en,
                source_id: q.source_id,
                topic_id: q.topic_id,
                difficulty: q.difficulty,
                sign_code: q.sign_code,
            }));
        },
        staleTime: 0, // Always fresh for exam (new random set each time)
        refetchOnWindowFocus: false,
    });
};
