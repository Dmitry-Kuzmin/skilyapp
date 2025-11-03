import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DuelRealtimeState {
  opponentJoined: boolean;
  opponentScore: number;
  opponentAnswered: boolean;
  opponentAnswerData: any | null;  // Добавим данные ответа соперника
  duelStarted: boolean;
  duelFinished: boolean;
  currentQuestion: number;
  myScore: number;
}

export function useDuelRealtime(duelId: string | null, myPlayerId?: string | null) {
  const [state, setState] = useState<DuelRealtimeState>({
    opponentJoined: false,
    opponentScore: 0,
    opponentAnswered: false,
    opponentAnswerData: null,
    duelStarted: false,
    duelFinished: false,
    currentQuestion: 0,
    myScore: 0,
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const playerIdRef = useRef<string | null>(myPlayerId ?? null);

  useEffect(() => {
    playerIdRef.current = myPlayerId ?? null;

    if (!duelId || !myPlayerId) return;

    supabase
      .from('duel_players')
      .select('id, score')
      .eq('duel_id', duelId)
      .then(({ data, error }) => {
        if (error) {
          console.error('[useDuelRealtime] Error syncing scores on playerId change:', error);
          return;
        }

        if (!data) return;

        const myPlayer = data.find(player => player.id === myPlayerId);
        const opponentPlayer = data.find(player => player.id !== myPlayerId);

        setState(prev => ({
          ...prev,
          myScore: myPlayer?.score ?? prev.myScore,
          opponentScore: opponentPlayer?.score ?? prev.opponentScore,
        }));
      });
  }, [myPlayerId, duelId]);

  useEffect(() => {
    if (!duelId) return;

    console.log('[useDuelRealtime] Initializing channel for duel:', duelId);
    const duelChannel = supabase.channel(`duel_${duelId}`);

    // Subscribe to duel changes
    duelChannel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duels',
          filter: `id=eq.${duelId}`,
        },
        (payload) => {
          console.log('[useDuelRealtime] Duel UPDATE:', payload.new);
          const duel = payload.new;
          if (duel.status === 'active') {
            console.log('[useDuelRealtime] Duel started!');
            setState(prev => ({ ...prev, duelStarted: true }));
          } else if (duel.status === 'finished') {
            console.log('[useDuelRealtime] Duel finished!');
            setState(prev => ({ ...prev, duelFinished: true }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        () => {
          console.log('[useDuelRealtime] Opponent joined!');
          setState(prev => ({ ...prev, opponentJoined: true }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duel_answers',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => {
          console.log('[useDuelRealtime] Answer received:', payload);
          
          // Проверяем, что это ответ соперника, а не мой
          const answerPlayerId = (payload.new as any)?.player_id;
          console.log('[useDuelRealtime] Answer from player:', answerPlayerId, 'My player:', myPlayerId);
          
          if (answerPlayerId && myPlayerId && answerPlayerId !== myPlayerId) {
            console.log('[useDuelRealtime] ✅ Opponent answered!');
            setState(prev => ({ ...prev, opponentAnswered: true, opponentAnswerData: payload.new }));
            
            // Reset after 1 second
            setTimeout(() => {
              setState(prev => ({ ...prev, opponentAnswered: false, opponentAnswerData: null }));
            }, 1000);
          } else {
            console.log('[useDuelRealtime] Own answer, ignoring notification');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => {
          const updatedPlayer = payload.new as any;
          const currentPlayerId = playerIdRef.current;

          if (!updatedPlayer || !currentPlayerId) {
            return;
          }

          if (updatedPlayer.id === currentPlayerId) {
            setState(prev => ({ ...prev, myScore: updatedPlayer.score ?? prev.myScore }));
          } else {
            setState(prev => ({ ...prev, opponentScore: updatedPlayer.score ?? prev.opponentScore }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[useDuelRealtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[useDuelRealtime] Successfully subscribed, checking current duel status...');
          
          // Check current duel status immediately after subscription
          supabase
            .from('duels')
            .select('status')
            .eq('id', duelId)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error) {
                console.error('[useDuelRealtime] Error checking duel status:', error);
              } else if (!data) {
                console.warn('[useDuelRealtime] Duel not found or no access');
              } else {
                console.log('[useDuelRealtime] Current duel status:', data.status);
                if (data.status === 'active') {
                  console.log('[useDuelRealtime] Duel is already active!');
                  setState(prev => ({ ...prev, duelStarted: true }));
                } else if (data.status === 'finished') {
                  setState(prev => ({ ...prev, duelFinished: true }));
                }
              }
            });

          // Fetch latest scores once we are subscribed
          supabase
            .from('duel_players')
            .select('id, score')
            .eq('duel_id', duelId)
            .then(({ data, error }) => {
              if (error) {
                console.error('[useDuelRealtime] Error fetching player scores:', error);
                return;
              }

              if (!data || data.length === 0) return;

              const currentPlayerId = playerIdRef.current;

              if (!currentPlayerId) {
                console.warn('[useDuelRealtime] myPlayerId not set yet, skipping initial score sync');
                return;
              }

              const myPlayer = data.find(player => player.id === currentPlayerId);
              const opponentPlayer = data.find(player => player.id !== currentPlayerId);

              setState(prev => ({
                ...prev,
                myScore: myPlayer?.score ?? prev.myScore,
                opponentScore: opponentPlayer?.score ?? prev.opponentScore,
              }));
            });
        }
      });

    setChannel(duelChannel);

    return () => {
      console.log('[useDuelRealtime] Cleaning up channel');
      supabase.removeChannel(duelChannel);
    };
  }, [duelId]);

  const broadcast = (event: string, data: any) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event,
        payload: data,
      });
    }
  };

  return { state, broadcast };
}
