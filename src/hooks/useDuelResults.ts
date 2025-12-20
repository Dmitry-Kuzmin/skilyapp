import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

// Тип для snapshot'а результатов дуэли
export interface DuelResultSnapshot {
  duelId: string;
  duel: any;
  players: any[];
  myPlayer: any;
  opponentPlayer: any;
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
  timestamp: number;
}

// Функции для работы с localStorage (snapshot)
export const saveDuelResultSnapshot = (snapshot: DuelResultSnapshot) => {
  try {
    localStorage.setItem(`duel_result_${snapshot.duelId}`, JSON.stringify(snapshot));
    // Также сохраняем как последний результат
    localStorage.setItem('last_duel_result', JSON.stringify(snapshot));
  } catch (e) {
    console.error('Error saving duel result snapshot:', e);
  }
};

export const loadDuelResultSnapshot = (duelId?: string): DuelResultSnapshot | null => {
  try {
    if (duelId) {
      const saved = localStorage.getItem(`duel_result_${duelId}`);
      if (saved) return JSON.parse(saved);
    }
    const last = localStorage.getItem('last_duel_result');
    if (last) return JSON.parse(last);
  } catch (e) {
    console.error('Error loading duel result snapshot:', e);
  }
  return null;
};

export const clearDuelResultSnapshot = (duelId?: string) => {
  try {
    if (duelId) {
      localStorage.removeItem(`duel_result_${duelId}`);
    }
    localStorage.removeItem('last_duel_result');
  } catch (e) {
    console.error('Error clearing duel result snapshot:', e);
  }
};

export interface DuelResultData {
  duel: any;
  players: any[];
  myPlayer: any;
  opponentPlayer: any;
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

export function useDuelResults(duelId: string, profileId: string | null, initialSnapshot?: DuelResultSnapshot | null) {
  return useQuery<DuelResultData, Error>({
    queryKey: ["duel-results", duelId, profileId],
    queryFn: async (): Promise<DuelResultData> => {
      // 1. Сначала проверяем snapshot (самый быстрый способ)
      if (initialSnapshot && initialSnapshot.duelId === duelId) {
        console.log('[useDuelResults] ✅ Using initial snapshot from props');
        return {
          duel: initialSnapshot.duel,
          players: initialSnapshot.players,
          myPlayer: initialSnapshot.myPlayer,
          opponentPlayer: initialSnapshot.opponentPlayer,
          myAnswers: initialSnapshot.myAnswers,
          opponentAnswers: initialSnapshot.opponentAnswers,
          results: initialSnapshot.results,
        };
      }

      // 2. Проверяем localStorage
      const savedSnapshot = loadDuelResultSnapshot(duelId);
      if (savedSnapshot && savedSnapshot.duelId === duelId) {
        console.log('[useDuelResults] ✅ Using snapshot from localStorage');
        return {
          duel: savedSnapshot.duel,
          players: savedSnapshot.players,
          myPlayer: savedSnapshot.myPlayer,
          opponentPlayer: savedSnapshot.opponentPlayer,
          myAnswers: savedSnapshot.myAnswers,
          opponentAnswers: savedSnapshot.opponentAnswers,
          results: savedSnapshot.results,
        };
      }

      console.log('[useDuelResults] 🔄 Fetching results from server/DB...', { duelId, profileId });

      // 3. Пытаемся получить результаты через Edge Function (генеральный и надежный способ)
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
          body: { action: 'get_results', duel_id: duelId, profile_id: profileId },
        });

        if (edgeError) {
          console.log("[useDuelResults] Edge Function invoke error:", edgeError.message);
        } else if (edgeData?.error === 'DUEL_NOT_READY') {
          console.warn("[useDuelResults] Edge Function reports DUEL_NOT_READY:", edgeData.message);
          throw new Error('DUEL_NOT_READY');
        } else if (edgeData && edgeData.duel && edgeData.players && edgeData.players.length >= 2) {
          const players = edgeData.players;
          const myPlayer = players.find((p: any) => p.user_id === profileId);
          const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

          if (myPlayer && opponentPlayer) {
            const myAnswers = edgeData.myAnswers || [];
            const opponentAnswers = edgeData.opponentAnswers || [];

            const myScore = myPlayer.score || 0;
            const opponentScore = opponentPlayer.score || 0;
            const myCorrect = myPlayer.correct_count || 0;
            const opponentCorrect = opponentPlayer.correct_count || 0;
            const opponentProfile = opponentPlayer.profiles || {};
            const duelData = edgeData.duel;

            const isWinner = myScore > opponentScore;
            const isDraw = myScore === opponentScore;

            let winnings = 0;
            let insuranceRefund = 0;
            if (duelData.bet_amount > 0) {
              if (isWinner) winnings = duelData.bet_amount * 2;
              else if (isDraw) winnings = duelData.bet_amount;

              if (!isWinner && !isDraw && (duelData.insurance_used || duelData.host_insurance_enabled)) {
                insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
              }
            }

            const resultData = {
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
                opponentName: opponentProfile?.username || opponentProfile?.first_name || opponentPlayer?.name || "Соперник",
                opponentAvatar: opponentProfile?.photo_url || null,
                betAmount: duelData.bet_amount || 0,
                winnings,
                insuranceRefund,
                insuranceUsed: !!(duelData.insurance_used || duelData.host_insurance_enabled),
              },
            };

            saveDuelResultSnapshot({ ...resultData, duelId, timestamp: Date.now() });
            console.log('[useDuelResults] ✅ Results loaded from Edge Function');
            return resultData;
          }
        }
      } catch (err: any) {
        if (err.message === 'DUEL_NOT_READY') throw err;
        console.error('[useDuelResults] Edge Function generic error:', err);
      }

      // 4. Fallback: Прямой запрос к БД
      const [duelRes, playersRes] = await Promise.all([
        supabase.from('duels').select('*').eq('id', duelId).maybeSingle(),
        supabase.from('duel_players').select('*, profiles(*)').eq('duel_id', duelId)
      ]);

      if (duelRes.error) throw duelRes.error;
      if (!(duelRes as any).data) throw new Error('DUEL_NOT_READY');

      const duelData = (duelRes as any).data;
      if (duelData.status !== 'finished' && duelData.status !== 'technical_draw' && duelData.status !== 'cancelled') {
        throw new Error('DUEL_NOT_READY');
      }

      const players = playersRes.data || [];
      if (players.length < 2) throw new Error('DUEL_NOT_READY');

      const myPlayer = players.find((p: any) => p.user_id === profileId);
      const opponentPlayer = players.find((p: any) => p.user_id !== profileId);
      if (!myPlayer || !opponentPlayer) throw new Error('Wait for opponent...');

      const [myAnsRes, oppAnsRes] = await Promise.all([
        supabase.from('duel_answers').select('*, duel_questions(*)').eq('duel_id', duelId).eq('player_id', myPlayer.id).order('created_at'),
        supabase.from('duel_answers').select('*, duel_questions(*)').eq('duel_id', duelId).eq('player_id', opponentPlayer.id).order('created_at')
      ]);

      const myAnswers = myAnsRes.data || [];
      const opponentAnswers = oppAnsRes.data || [];

      const myScore = myPlayer.score || 0;
      const opponentScore = opponentPlayer.score || 0;
      const opponentProfile = opponentPlayer.profiles || {};

      const isWinner = myScore > opponentScore;
      const isDraw = myScore === opponentScore;
      let winnings = 0;
      let insuranceRefund = 0;
      if (duelData.bet_amount > 0) {
        if (isWinner) winnings = duelData.bet_amount * 2;
        else if (isDraw) winnings = duelData.bet_amount;
        if (!isWinner && !isDraw && (duelData.insurance_used || duelData.host_insurance_enabled)) {
          insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
        }
      }

      const finalData: DuelResultData = {
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
          myCorrect: myPlayer.correct_count || 0,
          opponentCorrect: opponentPlayer.correct_count || 0,
          opponentName: opponentProfile?.username || opponentProfile?.first_name || opponentPlayer?.name || "Соперник",
          opponentAvatar: opponentProfile?.photo_url || null,
          betAmount: duelData.bet_amount || 0,
          winnings,
          insuranceRefund,
          insuranceUsed: !!(duelData.insurance_used || duelData.host_insurance_enabled),
        }
      };

      saveDuelResultSnapshot({ ...finalData, duelId, timestamp: Date.now() });
      return finalData;
    },
    enabled: !!duelId && !!profileId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message === 'DUEL_NOT_READY') return failureCount < 5;
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });
}
