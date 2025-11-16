import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDuelRealtime } from './useDuelRealtime';
import { DUEL_TIMINGS } from '@/constants/duel';
import { useDuelTimers } from './useDuelTimers';

/**
 * Унифицированный хук для синхронизации счета соперника
 * Объединяет Realtime подписку и fallback проверки
 */
export function useOpponentScoreSync(
  duelId: string | null,
  myPlayerId: string | null,
  duelStarted: boolean,
  initialScore?: number
) {
  const [opponentScore, setOpponentScore] = useState(initialScore || 0);
  const { state } = useDuelRealtime(duelId, myPlayerId);
  const { setInterval, clearInterval } = useDuelTimers();
  const lastScoreRef = useRef(initialScore || 0);
  
  // Обновляем начальное значение если оно изменилось
  useEffect(() => {
    if (initialScore !== undefined && initialScore !== opponentScore) {
      setOpponentScore(initialScore);
      lastScoreRef.current = initialScore;
    }
  }, [initialScore, opponentScore]);

  // Основной способ: синхронизация через Realtime
  useEffect(() => {
    if (typeof state.opponentScore === 'number' && state.opponentScore >= 0) {
      if (state.opponentScore !== opponentScore) {
        console.log('[useOpponentScoreSync] ✅ Updating opponent score from realtime:', state.opponentScore, '(was:', opponentScore, ')');
        setOpponentScore(state.opponentScore);
        lastScoreRef.current = state.opponentScore;
      }
    }
  }, [state.opponentScore, opponentScore]);

  // Fallback: периодическая проверка для мобильной версии Telegram WebApp
  useEffect(() => {
    if (!duelId || !myPlayerId || !duelStarted) return;

    // Определяем интервал проверки в зависимости от платформы
    const isMobileTelegram = typeof window !== 'undefined' && 
      window.Telegram?.WebApp && 
      (window.Telegram.WebApp.platform === 'ios' || window.Telegram.WebApp.platform === 'android');
    
    const checkInterval = isMobileTelegram 
      ? DUEL_TIMINGS.SCORE_CHECK_INTERVAL_MOBILE 
      : DUEL_TIMINGS.SCORE_CHECK_INTERVAL_DESKTOP;

    // Проверяем счет периодически как fallback
    const scoreCheckInterval = setInterval(async () => {
      try {
        const { data: players, error } = await supabase
          .from('duel_players')
          .select('id, score, user_id')
          .eq('duel_id', duelId);
        
        if (error) {
          console.error('[useOpponentScoreSync] Error checking opponent score (fallback):', error);
          return;
        }
        
        if (players && players.length >= 2) {
          const opponent = players.find((p: any) => p.id !== myPlayerId);
          if (opponent && typeof opponent.score === 'number' && opponent.score !== lastScoreRef.current) {
            console.log('[useOpponentScoreSync] 🔄 Fallback: Updating opponent score:', opponent.score, '(was:', lastScoreRef.current, ')');
            setOpponentScore(opponent.score);
            lastScoreRef.current = opponent.score;
          }
        }
      } catch (error) {
        console.error('[useOpponentScoreSync] Exception in score check fallback:', error);
      }
    }, checkInterval);
    
    return () => clearInterval(scoreCheckInterval);
  }, [duelId, myPlayerId, duelStarted, setInterval, clearInterval]);

  return opponentScore;
}

