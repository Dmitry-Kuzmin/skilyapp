import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toQuestionsDbCountry } from '@/lib/countryUtils';

interface UseSmartTestQuestionsParams {
  profileId: string | null;
  count?: number;
  category?: string;
  country?: string;
  enabled?: boolean;
}

export function useSmartTestQuestions({
  profileId,
  count = 20,
  category = 'B',
  country = 'es',
  enabled = true,
}: UseSmartTestQuestionsParams) {
  return useQuery({
    queryKey: ['smart-test-questions', profileId, count, category, country],
    queryFn: async () => {
      if (!profileId) return [];

      // Step 1: get adaptive question IDs from edge function
      const { data: builderResult, error: builderError } = await supabase.functions.invoke(
        'smart-test-builder',
        { body: { profile_id: profileId, count, category, country } }
      );

      if (builderError) throw builderError;
      const ids: string[] = builderResult?.question_ids ?? [];
      if (!ids.length) return [];

      // Step 2: fetch full question data
      const { data: questions, error: qError } = await supabase
        .from('questions_new')
        .select('*, topics (title_ru, title_es, title_en), answer_options (*)')
        .in('id', ids);

      if (qError) throw qError;

      // Preserve the adaptive order
      const orderMap = new Map(ids.map((id, i) => [id, i]));
      return (questions || []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    },
    enabled: enabled && !!profileId,
    staleTime: 0, // Always fresh — adaptive selection depends on latest progress
    gcTime: 5 * 60 * 1000,
  });
}
