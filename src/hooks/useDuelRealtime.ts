import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DuelRealtimeState {
  opponentJoined: boolean;
  opponentScore: number;
  opponentAnswered: boolean;
  duelStarted: boolean;
  duelFinished: boolean;
  currentQuestion: number;
}

export function useDuelRealtime(duelId: string | null) {
  const [state, setState] = useState<DuelRealtimeState>({
    opponentJoined: false,
    opponentScore: 0,
    opponentAnswered: false,
    duelStarted: false,
    duelFinished: false,
    currentQuestion: 0,
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!duelId) return;

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
          const duel = payload.new;
          if (duel.status === 'active') {
            setState(prev => ({ ...prev, duelStarted: true }));
          } else if (duel.status === 'finished') {
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
        () => {
          setState(prev => ({ ...prev, opponentAnswered: true }));
          // Reset after 1 second
          setTimeout(() => {
            setState(prev => ({ ...prev, opponentAnswered: false }));
          }, 1000);
        }
      )
      .subscribe();

    setChannel(duelChannel);

    return () => {
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
