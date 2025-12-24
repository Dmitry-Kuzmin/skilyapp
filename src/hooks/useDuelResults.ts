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
      // 1. Snapshot check
      if (initialSnapshot && initialSnapshot.duelId === duelId) {
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

      const savedSnapshot = loadDuelResultSnapshot(duelId);
      if (savedSnapshot && savedSnapshot.duelId === duelId) {
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

      // 2. Fetch from Edge Function
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
          body: { action: 'get_results', duel_id: duelId, profile_id: profileId },
        });

        if (edgeError) {
          console.warn("[useDuelResults] Edge Function invoke error:", edgeError.message);
        } else if (edgeData?.error === 'DUEL_NOT_READY') {
          throw new Error('DUEL_NOT_READY');
        } else if (edgeData && edgeData.duel) {
          const players = edgeData.players || [];
          const myPlayer = players.find((p: any) => p.user_id === profileId);
          const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

          if (myPlayer && opponentPlayer) {
            const myAnswers = edgeData.myAnswers || [];
            const opponentAnswers = edgeData.opponentAnswers || [];
            const opponentProfile = opponentPlayer.profiles || {};
            const duelData = edgeData.duel;

            const isWinner = (myPlayer.score || 0) > (opponentPlayer.score || 0);
            const isDraw = (myPlayer.score || 0) === (opponentPlayer.score || 0);

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
                myScore: myPlayer.score || 0,
                opponentScore: opponentPlayer.score || 0,
                myCorrect: myPlayer.correct_count || 0,
                opponentCorrect: opponentPlayer.correct_count || 0,
                opponentName: opponentPlayer?.is_bot
                  ? (opponentPlayer?.bot_name || opponentPlayer?.name || "Соперник")
                  : (opponentProfile?.username || opponentProfile?.first_name || opponentPlayer?.name || "Соперник"),
                opponentAvatar: opponentPlayer?.is_bot ? null : (opponentProfile?.photo_url || null),
                betAmount: duelData.bet_amount || 0,
                winnings,
                insuranceRefund,
                insuranceUsed: !!(duelData.insurance_used || duelData.host_insurance_enabled),
              },
            };

            saveDuelResultSnapshot({ ...resultData, duelId, timestamp: Date.now() });
            return resultData;
          }
        }
      } catch (err: any) {
        if (err.message === 'DUEL_NOT_READY') throw err;
        console.error('[useDuelResults] Edge Function error:', err);
      }

      // 3. Last Fallback: Direct DB Query
      const [duelRes, playersRes] = await Promise.all([
        supabase.from('duels').select('*').eq('id', duelId).maybeSingle(),
        supabase.from('duel_players').select('*, profiles(*)').eq('duel_id', duelId)
      ]);

      if (duelRes.error || !duelRes.data) throw new Error('DUEL_NOT_READY');
      const duelData = (duelRes as any).data;
      const players = (playersRes as any).data || [];
      const myPlayer = players.find((p: any) => p.user_id === profileId);
      const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

      if (!myPlayer || !opponentPlayer || players.length < 2) throw new Error('DUEL_NOT_READY');

      const [myAnsRes, oppAnsRes] = await Promise.all([
        supabase.from('duel_answers').select('*, duel_questions(*)').eq('duel_id', duelId).eq('player_id', myPlayer.id).order('created_at'),
        supabase.from('duel_answers').select('*, duel_questions(*)').eq('duel_id', duelId).eq('player_id', opponentPlayer.id).order('created_at')
      ]);

      const myAnswers = myAnsRes.data || [];
      const opponentAnswers = oppAnsRes.data || [];
      const isWinner = (myPlayer.score || 0) > (opponentPlayer.score || 0);
      const isDraw = (myPlayer.score || 0) === (opponentPlayer.score || 0);

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
          myScore: myPlayer.score || 0,
          opponentScore: opponentPlayer.score || 0,
          myCorrect: myPlayer.correct_count || 0,
          opponentCorrect: opponentPlayer.correct_count || 0,
          opponentName: opponentPlayer?.is_bot
            ? (opponentPlayer?.bot_name || opponentPlayer?.name || "Соперник")
            : (opponentPlayer.profiles?.username || opponentPlayer.profiles?.first_name || opponentPlayer?.name || "Соперник"),
          opponentAvatar: opponentPlayer?.is_bot ? null : (opponentPlayer.profiles?.photo_url || null),
          betAmount: duelData.bet_amount || 0,
          winnings: isWinner ? (duelData.bet_amount * 2) : (isDraw ? duelData.bet_amount : 0),
          insuranceRefund: (!isWinner && !isDraw && duelData.insurance_used) ? Math.floor(duelData.bet_amount * 0.5) : 0,
          insuranceUsed: !!(duelData.insurance_used || duelData.host_insurance_enabled),
        }
      };

      saveDuelResultSnapshot({ ...finalData, duelId, timestamp: Date.now() });
      return finalData;
    },
    enabled: !!duelId && !!profileId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // 🆕 Увеличиваем до 7 ретраев (всего около 40 секунд)
      if (error?.message === 'DUEL_NOT_READY') return failureCount < 7;
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
  });
}
