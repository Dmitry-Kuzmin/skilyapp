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
  
  // Debug: логируем изменения параметров
  useEffect(() => {
    console.log('[useOpponentScoreSync] Hook params:', {
      duelId,
      myPlayerId,
      duelStarted,
      initialScore,
      currentScore: opponentScore,
      realtimeScore: state.opponentScore
    });
  }, [duelId, myPlayerId, duelStarted, initialScore, opponentScore, state.opponentScore]);
  
  // Обновляем начальное значение если оно изменилось
  useEffect(() => {
    if (initialScore !== undefined && initialScore !== lastScoreRef.current) {
      console.log('[useOpponentScoreSync] 🔄 Setting initial opponent score:', initialScore);
      setOpponentScore(initialScore);
      lastScoreRef.current = initialScore;
    }
  }, [initialScore]);

  // Основной способ: синхронизация через Realtime
  useEffect(() => {
    // Если Realtime передал валидный счет, обновляем
    if (typeof state.opponentScore === 'number' && state.opponentScore >= 0) {
      // Используем ref для сравнения, чтобы избежать проблем с зависимостями
      if (state.opponentScore !== lastScoreRef.current) {
        console.log('[useOpponentScoreSync] ✅ Updating opponent score from realtime:', state.opponentScore, '(was:', lastScoreRef.current, ')');
        setOpponentScore(state.opponentScore);
        lastScoreRef.current = state.opponentScore;
      }
    } 
    // Если Realtime счет = 0, но у нас есть начальное значение > 0, используем начальное
    else if (state.opponentScore === 0 && initialScore !== undefined && initialScore > 0 && lastScoreRef.current === 0) {
      console.log('[useOpponentScoreSync] 🔄 Realtime score is 0, but we have initial score > 0, using initial:', initialScore);
      setOpponentScore(initialScore);
      lastScoreRef.current = initialScore;
    }
  }, [state.opponentScore, initialScore]);

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

