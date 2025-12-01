import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DuelResultData {
  duel: any;
  players: any[];
  myPlayer: any | null;
  opponentPlayer: any | null;
  myAnswers: any[];
  opponentAnswers: any[];
  results: {
    isWinner: boolean;
    isDraw: boolean;
    myScore: number;
    opponentScore: number;
    myCorrect: number;
    opponentCorrect: number;
    opponentName: string;
    opponentAvatar: string | null;
    betAmount: number;
    winnings: number;
    insuranceRefund: number;
    insuranceUsed: boolean;
  };
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки результатов дуэли
 * Объединяет все запросы в batch для минимизации количества запросов
 * Автоматически находит myPlayerId по profileId
 */
export function useDuelResults(duelId: string | null, profileId: string | null) {
  return useQuery<DuelResultData | null>({
    queryKey: ["duel-results", duelId, profileId],
    queryFn: async () => {
      if (!duelId || !profileId) return null;

      // ОПТИМИЗАЦИЯ: Объединяем все запросы в Promise.all для параллельной загрузки
      const [duelResult, playersResult] = await Promise.all([
        // Загружаем данные дуэли
        supabase
          .from("duels")
          .select("*")
          .eq("id", duelId)
          .single(),

        // Загружаем игроков с профилями (batch запрос)
        supabase
          .from("duel_players")
          .select("*, profiles(id, username, first_name, photo_url)")
          .eq("duel_id", duelId),
      ]);

      if (duelResult.error) {
        console.error("[useDuelResults] Error loading duel:", duelResult.error);
        throw duelResult.error;
      }

      if (playersResult.error) {
        console.error("[useDuelResults] Error loading players:", playersResult.error);
        throw playersResult.error;
      }

      const players = playersResult.data || [];
      
      if (players.length < 2) {
        throw new Error("Не найдены оба игрока");
      }

      // Находим моего игрока и соперника по user_id (profileId)
      const myPlayer = players.find((p: any) => p.user_id === profileId);
      const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

      if (!myPlayer || !opponentPlayer) {
        throw new Error("Не найден игрок или соперник");
      }

      const myPlayerId = myPlayer.id;
      const opponentPlayerId = opponentPlayer.id;

      // Загружаем ответы обоих игроков параллельно
      const [myAnswersResult, opponentAnswersResult] = await Promise.all([
        supabase
          .from("duel_answers")
          .select("*, duel_questions(*)")
          .eq("duel_id", duelId)
          .eq("player_id", myPlayerId)
          .order("created_at"),
        supabase
          .from("duel_answers")
          .select("*, duel_questions(*)")
          .eq("duel_id", duelId)
          .eq("player_id", opponentPlayerId)
          .order("created_at"),
      ]);

      if (myAnswersResult.error) {
        console.error("[useDuelResults] Error loading my answers:", myAnswersResult.error);
        throw myAnswersResult.error;
      }

      const myAnswers = myAnswersResult.data || [];
      const opponentAnswers = opponentAnswersResult.data || [];

      // Вычисляем результаты
      const myScore = myPlayer.score || 0;
      const opponentScore = opponentPlayer.score || 0;
      const myCorrect = myPlayer.correct_count || 0;
      const opponentCorrect = opponentPlayer.correct_count || 0;
      const opponent = opponentPlayer.profiles || {};
      const duelData = duelResult.data;

      const isWinner = myScore > opponentScore;
      const isDraw = myScore === opponentScore;

      let winnings = 0;
      let insuranceRefund = 0;
      if (duelData.bet_amount > 0) {
        if (isWinner) {
          winnings = duelData.bet_amount * 2;
        } else if (isDraw) {
          winnings = duelData.bet_amount;
        }
        if (!isWinner && !isDraw && duelData.insurance_used) {
          insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
        }
      }

      return {
        duel: duelData,
        players,
        myPlayer,
        opponentPlayer,
        myAnswers,
        opponentAnswers,
        results: {
          isWinner,
          isDraw,
          myScore,
          opponentScore,
          myCorrect,
          opponentCorrect,
          opponentName: opponent?.username || opponent?.first_name || "Соперник",
          opponentAvatar: opponent?.photo_url || null,
          betAmount: duelData.bet_amount || 0,
          winnings,
          insuranceRefund,
          insuranceUsed: duelData.insurance_used || false,
        },
      };
    },
    enabled: !!duelId && !!profileId,
    staleTime: 30 * 1000, // 30 секунд - результаты дуэли редко меняются
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

