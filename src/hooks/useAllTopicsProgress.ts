import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface TopicProgress {
  topic_id: string;
  number: number;
  title_ru: string;
  title_es: string;
  order_index: number;
  unlock_condition: any;
  total_subtopics: number;
  required_subtopics: number;
  completed_subtopics: number;
  completed_required: number;
  is_completed: boolean;
  total_questions: number;
  answered_questions: number;
  correct_questions: number;
  accuracy: number;
}

const ALL_TOPICS_PROGRESS_KEY = 'all-topics-progress';

/**
 * ОПТИМИЗИРОВАННЫЙ хук для получения прогресса по всем темам
 * Использует новый RPC get_all_topics_progress
 * БЫЛО: N*3 запросов (3 запроса на каждую тему)
 * СТАЛО: 1 запрос на все темы
 */
export function useAllTopicsProgress() {
  const { profileId } = useUserContext();

  const {
    data: topics = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery<TopicProgress[]>({
    queryKey: [ALL_TOPICS_PROGRESS_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return [];

      console.log('[useAllTopicsProgress] 🚀 Fetching all topics progress with single RPC');

      // ОПТИМИЗАЦИЯ: Один RPC вместо N*3 запросов
      const { data, error: rpcError } = await supabase
        .rpc('get_all_topics_progress', { p_user_id: profileId });

      if (rpcError) {
        console.error('[useAllTopicsProgress] ❌ RPC error:', rpcError);
        throw rpcError;
      }

      if (!data) {
        console.warn('[useAllTopicsProgress] ⚠️ No data returned');
        return [];
      }

      console.log('[useAllTopicsProgress] ✅ Topics progress loaded:', data.length, 'topics');
      return data as TopicProgress[];
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты - прогресс меняется не так часто
    gcTime: 10 * 60 * 1000, // 10 минут - держим в кэше
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  return {
    topics,
    loading,
    error: error as Error | null,
    refresh: refetch,
  };
}

