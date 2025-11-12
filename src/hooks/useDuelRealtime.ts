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
  
  // Update ref when myPlayerId changes and reload scores
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
    
    // Reload scores when myPlayerId becomes available
    if (myPlayerId && duelId) {
      console.log('[useDuelRealtime] MyPlayerId set, reloading scores:', myPlayerId);
      supabase
        .from('duel_players')
        .select('id, score, correct_count')
        .eq('duel_id', duelId)
        .then(({ data, error }) => {
          if (error) {
            console.error('[useDuelRealtime] Error reloading scores after myPlayerId set:', error);
            return;
          }
          
          if (data && data.length >= 2) {
            const myPlayer = data.find((p: any) => p.id === myPlayerId);
            const opponent = data.find((p: any) => p.id !== myPlayerId);
            
            if (myPlayer) {
              // Используем только если score не null/undefined, иначе сохраняем текущее значение
              const newScore = typeof myPlayer.score === 'number' ? myPlayer.score : undefined;
              if (newScore !== undefined) {
                console.log('[useDuelRealtime] ✅ Reloaded myScore:', newScore);
                setState(prev => ({ ...prev, myScore: newScore }));
              }
            }
            
            if (opponent) {
              const newScore = typeof opponent.score === 'number' ? opponent.score : undefined;
              const newCorrectCount = typeof opponent.correct_count === 'number' ? opponent.correct_count : undefined;
              if (newScore !== undefined || newCorrectCount !== undefined) {
                console.log('[useDuelRealtime] ✅ Reloaded opponentScore:', newScore);
                setState(prev => ({ 
                  ...prev, 
                  opponentScore: newScore !== undefined ? newScore : prev.opponentScore,
                  opponentCorrectCount: newCorrectCount !== undefined ? newCorrectCount : prev.opponentCorrectCount
                }));
              }
            }
          }
        });
    }
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
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          const updatedPlayer = payload.new as any;
          const currentMyPlayerId = myPlayerIdRef.current;
          
          console.log('[useDuelRealtime] 🔔 Player UPDATE event:', {
            updatedPlayerId: updatedPlayer.id,
            updatedUserId: updatedPlayer.user_id,
            myPlayerId: currentMyPlayerId,
            score: updatedPlayer.score,
            correctCount: updatedPlayer.correct_count,
            isMyPlayer: updatedPlayer.id === currentMyPlayerId
          });
          
          // If myPlayerId is set, use ID comparison (most reliable)
          if (currentMyPlayerId) {
            if (updatedPlayer.id === currentMyPlayerId) {
              // Это обновление моего счета
              if (typeof updatedPlayer.score === 'number') {
                console.log('[useDuelRealtime] ✅ Updating my score:', updatedPlayer.score);
                setState(prev => ({ 
                  ...prev, 
                  myScore: updatedPlayer.score
                }));
              } else {
                console.warn('[useDuelRealtime] ⚠️ My score is not a number:', updatedPlayer.score);
              }
            } else {
              // Это обновление счета соперника
              if (typeof updatedPlayer.score === 'number') {
                console.log('[useDuelRealtime] ✅ Updating opponent score:', updatedPlayer.score);
                setState(prev => ({ 
                  ...prev, 
                  opponentScore: updatedPlayer.score,
                  opponentCorrectCount: typeof updatedPlayer.correct_count === 'number' 
                    ? updatedPlayer.correct_count 
                    : prev.opponentCorrectCount
                }));
              } else {
                console.warn('[useDuelRealtime] ⚠️ Opponent score is not a number:', updatedPlayer.score);
              }
            }
          } else {
            // myPlayerId не установлен - обновляем opponentScore как fallback
            console.warn('[useDuelRealtime] ⚠️ MyPlayerId not set, using fallback logic');
            if (typeof updatedPlayer.score === 'number') {
              console.log('[useDuelRealtime] ✅ Updating score (fallback):', updatedPlayer.score);
              setState(prev => ({
                ...prev,
                opponentScore: updatedPlayer.score,
                opponentCorrectCount: typeof updatedPlayer.correct_count === 'number' 
                  ? updatedPlayer.correct_count 
                  : prev.opponentCorrectCount
              }));
            }
          }
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
          const currentMyPlayerId = myPlayerIdRef.current;
          console.log('[useDuelRealtime] Answer from player:', answerPlayerId, 'My player ID:', currentMyPlayerId);
          
          if (answerPlayerId && currentMyPlayerId && answerPlayerId !== currentMyPlayerId) {
            console.log('[useDuelRealtime] ✅ Opponent answered!');
            setState(prev => ({ ...prev, opponentAnswered: true, opponentAnswerData: payload.new }));
            
            // Reset after 1 second
            setTimeout(() => {
              setState(prev => ({ ...prev, opponentAnswered: false, opponentAnswerData: null }));
            }, 1000);
          } else {
            console.log('[useDuelRealtime] Own answer or myPlayerId not set, ignoring notification');
          }
        }
      )
      .subscribe((status) => {
        console.log('[useDuelRealtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[useDuelRealtime] Successfully subscribed, checking current duel status...');
          
          // Check current duel status immediately after subscription
          const checkStatus = async () => {
            const { data, error } = await supabase
              .from('duels')
              .select('status')
              .eq('id', duelId)
              .maybeSingle();
            
            if (error) {
              console.error('[useDuelRealtime] ❌ Error checking duel status:', error);
              console.error('[useDuelRealtime] Error details:', JSON.stringify(error, null, 2));
            } else if (!data) {
              // Не логируем - это нормально на начальном этапе
            } else {
              console.log('[useDuelRealtime] ✅ Current duel status:', data.status);
              if (data.status === 'active') {
                console.log('[useDuelRealtime] ✅ Duel is already active!');
                setState(prev => ({ ...prev, duelStarted: true }));
              } else if (data.status === 'finished') {
                console.log('[useDuelRealtime] ✅ Duel is finished!');
                setState(prev => ({ ...prev, duelFinished: true }));
              }
            }
          };
          
          checkStatus();
          
          // FALLBACK: Периодическая проверка статуса каждые 2 секунды (только если дуэль не завершена)
          // Это нужно на случай если Realtime подписка не сработает в Telegram WebApp
          const statusCheckInterval = setInterval(async () => {
            const currentState = await supabase
              .from('duels')
              .select('status')
              .eq('id', duelId)
              .maybeSingle();
            
            if (currentState.data?.status === 'finished') {
              console.log('[useDuelRealtime] 🔄 FALLBACK: Duel status is finished (periodic check)');
              setState(prev => {
                if (!prev.duelFinished) {
                  return { ...prev, duelFinished: true };
                }
                return prev;
              });
              clearInterval(statusCheckInterval);
            }
          }, 2000); // Проверяем каждые 2 секунды
          
          // Очищаем интервал при размонтировании
          return () => {
            clearInterval(statusCheckInterval);
          };
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
