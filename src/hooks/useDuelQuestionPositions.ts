import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки позиций вопросов дуэли
 * Кэширует позиции для быстрого доступа
 */
export function useDuelQuestionPositions(duelId: string | null) {
  return useQuery<Map<string, number>>({
    queryKey: ["duel-question-positions", duelId],
    queryFn: async () => {
      if (!duelId) return new Map();

      const { data, error } = await supabase
        .from("duel_questions")
        .select("id, position")
        .eq("duel_id", duelId)
        .order("position", { ascending: true });

      if (error) {
        console.error("[useDuelQuestionPositions] Error loading positions:", error);
        throw error;
      }

      // Создаем Map для быстрого доступа
      const positionsMap = new Map<string, number>();
      (data || []).forEach((q: any) => {
        positionsMap.set(q.id, q.position);
      });

      return positionsMap;
    },
    enabled: !!duelId,
    staleTime: 5 * 60 * 1000, // 5 минут - позиции не меняются
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}






























