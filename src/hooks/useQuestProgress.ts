import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { QuestCompletedItem } from '@/components/quests/QuestCompletionOverlay';

export interface QuestUpdateParams {
  userId: string;
  category: string;
  delta?: number;
  setAbsolute?: boolean;
}

interface UseQuestProgressResult {
  completedQuests: QuestCompletedItem[];
  updateProgress: (params: QuestUpdateParams[]) => Promise<void>;
  clearCompleted: () => void;
}

/**
 * Хук для обновления прогресса квестов.
 * Возвращает список завершённых квестов для отображения наград.
 */
export function useQuestProgress(): UseQuestProgressResult {
  const [completedQuests, setCompletedQuests] = useState<QuestCompletedItem[]>([]);
  const pendingRef = useRef(false);

  const updateProgress = useCallback(async (params: QuestUpdateParams[]) => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    try {
      const results = await Promise.all(
        params.map(({ userId, category, delta = 1, setAbsolute = false }) =>
          (supabase as any).rpc('update_daily_quest_progress', {
            p_user_id:      userId,
            p_category:     category,
            p_delta:        delta,
            p_set_absolute: setAbsolute,
          })
        )
      );

      const newCompleted: QuestCompletedItem[] = [];

      results.forEach((result: any) => {
        if (result.error) {
          console.error('[useQuestProgress] RPC error:', result.error);
          return;
        }
        const completed = result.data?.completed;
        if (Array.isArray(completed) && completed.length > 0) {
          newCompleted.push(...completed);
        }
      });

      if (newCompleted.length > 0) {
        setCompletedQuests(prev => [...prev, ...newCompleted]);
      }
    } catch (err) {
      console.error('[useQuestProgress] Unexpected error:', err);
    } finally {
      pendingRef.current = false;
    }
  }, []);

  const clearCompleted = useCallback(() => {
    setCompletedQuests([]);
  }, []);

  return { completedQuests, updateProgress, clearCompleted };
}
