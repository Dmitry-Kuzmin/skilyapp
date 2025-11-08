import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DuelRealtimeState {
  opponentJoined: boolean;
  opponentScore: number;
  opponentAnswered: boolean;
  opponentAnswerData: any | null;
  duelStarted: boolean;
  duelFinished: boolean;
  currentQuestion: number;
  opponentCorrectCount: number;
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
    opponentCorrectCount: 0,
    myScore: 0,
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const myPlayerIdRef = useRef<string | null | undefined>(myPlayerId);
  
  // Update ref when myPlayerId changes
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

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
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          const updatedPlayer = payload.new as any;
          const currentMyPlayerId = myPlayerIdRef.current;
          
          console.log('[useDuelRealtime] Player UPDATE:', {
            updatedPlayerId: updatedPlayer.id,
            myPlayerId: currentMyPlayerId,
            newScore: updatedPlayer.score
          });
          
          if (!currentMyPlayerId) {
            console.log('[useDuelRealtime] My player ID not set yet, skipping update');
            return;
          }
          
          // CRITICAL: Use ID comparison - if it's my player ID, update myScore, otherwise opponentScore
          if (updatedPlayer.id === currentMyPlayerId) {
            console.log('[useDuelRealtime] ✅ My score updated:', updatedPlayer.score);
            setState(prev => ({ 
              ...prev, 
              myScore: updatedPlayer.score ?? prev.myScore
            }));
          } else {
            console.log('[useDuelRealtime] ✅ Opponent score updated:', updatedPlayer.score);
            setState(prev => ({ 
              ...prev, 
              opponentScore: updatedPlayer.score ?? prev.opponentScore,
              opponentCorrectCount: updatedPlayer.correct_count ?? prev.opponentCorrectCount
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Используем INSERT вместо * для лучшей совместимости
          schema: 'public',
          table: 'duel_answers',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => {
          console.log('[useDuelRealtime] 📨 Answer received via Realtime:', payload);
          console.log('[useDuelRealtime] Payload event:', payload.eventType);
          console.log('[useDuelRealtime] Payload new:', payload.new);
          console.log('[useDuelRealtime] Payload old:', payload.old);
          
          // Проверяем, что это ответ соперника, а не мой
          // ВАЖНО: Используем myPlayerIdRef.current, так как значение может обновиться после создания подписки
          const answerPlayerId = (payload.new as any)?.player_id;
          const currentMyPlayerId = myPlayerIdRef.current;
          console.log('[useDuelRealtime] Answer from player:', answerPlayerId, 'My player:', currentMyPlayerId);
          
          if (answerPlayerId && currentMyPlayerId && answerPlayerId !== currentMyPlayerId) {
            console.log('[useDuelRealtime] ✅ Opponent answered! Setting state...', {
              answerPlayerId,
              myPlayerId: currentMyPlayerId,
              answerData: payload.new,
              isCorrect: (payload.new as any)?.is_correct,
              points: (payload.new as any)?.points_awarded
            });
            
            // Устанавливаем состояние для показа уведомления
            setState(prev => {
              const newState = { ...prev, opponentAnswered: true, opponentAnswerData: payload.new };
              console.log('[useDuelRealtime] State updated:', newState);
              return newState;
            });
            
            // Reset after 2 seconds to ensure toast is shown
            setTimeout(() => {
              console.log('[useDuelRealtime] Resetting opponentAnswered state');
              setState(prev => ({ ...prev, opponentAnswered: false, opponentAnswerData: null }));
            }, 2000);
          } else {
            console.log('[useDuelRealtime] ⚠️ Own answer or player ID not set, ignoring notification', {
              answerPlayerId,
              myPlayerId: currentMyPlayerId,
              isOwnAnswer: answerPlayerId === currentMyPlayerId,
              reason: !answerPlayerId ? 'no answerPlayerId' : !currentMyPlayerId ? 'no myPlayerId' : 'same player'
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[useDuelRealtime] Subscription status:', status);
        
        if (err) {
          console.error('[useDuelRealtime] ❌ Subscription error:', err);
          console.error('[useDuelRealtime] Error details:', JSON.stringify(err, null, 2));
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('[useDuelRealtime] ✅ Successfully subscribed to realtime channel for duel:', duelId);
          console.log('[useDuelRealtime] Checking current duel status...');
          
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

          // Load initial opponent score
          if (myPlayerId) {
            supabase
              .from('duel_players')
              .select('id, score, correct_count')
              .eq('duel_id', duelId)
              .neq('id', myPlayerId)
              .maybeSingle()
              .then(({ data, error }) => {
                if (error) {
                  console.error('[useDuelRealtime] Error loading opponent score:', error);
                } else if (data) {
                  console.log('[useDuelRealtime] Initial opponent score:', data.score);
                  setState(prev => ({ 
                    ...prev, 
                    opponentScore: data.score || 0,
                    opponentCorrectCount: data.correct_count || 0
                  }));
                }
              });
          }
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
