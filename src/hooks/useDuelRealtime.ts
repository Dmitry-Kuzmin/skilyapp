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
              console.log('[useDuelRealtime] ✅ Reloaded myScore:', myPlayer.score);
              setState(prev => ({ ...prev, myScore: myPlayer.score || 0 }));
            }
            
            if (opponent) {
              console.log('[useDuelRealtime] ✅ Reloaded opponentScore:', opponent.score);
              setState(prev => ({ 
                ...prev, 
                opponentScore: opponent.score || 0,
                opponentCorrectCount: opponent.correct_count || 0
              }));
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

          // Load initial scores when subscribed - try to load even if myPlayerId is not set yet
          const loadInitialScoresAfterSubscribe = async () => {
            try {
              const { data, error } = await supabase
                .from('duel_players')
                .select('id, user_id, score, correct_count')
                .eq('duel_id', duelId);
              
              if (error) {
                console.error('[useDuelRealtime] Error loading initial scores after subscribe:', error);
                return;
              }
              
              if (data && data.length >= 2) {
                const currentMyPlayerId = myPlayerIdRef.current;
                console.log('[useDuelRealtime] Loading initial scores after subscribe. myPlayerId:', currentMyPlayerId);
                
                // If we have myPlayerId, use it to identify players
                if (currentMyPlayerId) {
                  const myPlayer = data.find((p: any) => p.id === currentMyPlayerId);
                  const opponent = data.find((p: any) => p.id !== currentMyPlayerId);
                  
                  if (myPlayer) {
                    console.log('[useDuelRealtime] ✅ Initial myScore after subscribe:', myPlayer.score);
                    setState(prev => ({ ...prev, myScore: myPlayer.score || 0 }));
                  }
                  
                  if (opponent) {
                    console.log('[useDuelRealtime] ✅ Initial opponentScore after subscribe:', opponent.score);
                    setState(prev => ({ 
                      ...prev, 
                      opponentScore: opponent.score || 0,
                      opponentCorrectCount: opponent.correct_count || 0
                    }));
                  }
                } else {
                  console.log('[useDuelRealtime] MyPlayerId not set yet, will reload when available');
                }
              }
            } catch (error) {
              console.error('[useDuelRealtime] Exception loading initial scores after subscribe:', error);
            }
          };
          
          loadInitialScoresAfterSubscribe();
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
