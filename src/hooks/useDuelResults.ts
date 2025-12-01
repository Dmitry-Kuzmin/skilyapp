import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DuelResultData {
  duel: any;
  players: any[];
  myAnswers: any[];
  opponentAnswers: any[];
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки результатов дуэли
 * Объединяет все запросы в batch для минимизации количества запросов
 */
export function useDuelResults(duelId: string | null, profileId: string | null, myPlayerId: string | null) {
  return useQuery<DuelResultData | null>({
    queryKey: ["duel-results", duelId, profileId, myPlayerId],
    queryFn: async () => {
      if (!duelId || !profileId || !myPlayerId) return null;

      // ОПТИМИЗАЦИЯ: Объединяем все запросы в Promise.all для параллельной загрузки
      const [duelResult, playersResult, myAnswersResult] = await Promise.all([
        // Загружаем данные дуэли
        supabase
          .from("duels")
          .select("*")
          .eq("id", duelId)
          .single(),

        // Загружаем игроков с профилями (batch запрос)
        supabase
          .from("duel_players")
          .select("*, profiles(*)")
          .eq("duel_id", duelId),

        // Загружаем ответы игрока
        supabase
          .from("duel_answers")
          .select("*, duel_questions(*)")
          .eq("duel_id", duelId)
          .eq("player_id", myPlayerId)
          .order("created_at"),
      ]);

      if (duelResult.error) {
        console.error("[useDuelResults] Error loading duel:", duelResult.error);
        throw duelResult.error;
      }

      if (playersResult.error) {
        console.error("[useDuelResults] Error loading players:", playersResult.error);
        throw playersResult.error;
      }

      if (myAnswersResult.error) {
        console.error("[useDuelResults] Error loading answers:", myAnswersResult.error);
        throw myAnswersResult.error;
      }

      // Находим соперника
      const players = playersResult.data || [];
      const opponentPlayer = players.find((p: any) => p.id !== myPlayerId);
      const opponentPlayerId = opponentPlayer?.id;

      // Загружаем ответы соперника, если есть
      let opponentAnswers: any[] = [];
      if (opponentPlayerId) {
        const { data: opponentAnswersData } = await supabase
          .from("duel_answers")
          .select("*, duel_questions(*)")
          .eq("duel_id", duelId)
          .eq("player_id", opponentPlayerId)
          .order("created_at");

        opponentAnswers = opponentAnswersData || [];
      }

      return {
        duel: duelResult.data,
        players,
        myAnswers: myAnswersResult.data || [],
        opponentAnswers,
      };
    },
    enabled: !!duelId && !!profileId && !!myPlayerId,
    staleTime: 30 * 1000, // 30 секунд - результаты дуэли редко меняются
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

