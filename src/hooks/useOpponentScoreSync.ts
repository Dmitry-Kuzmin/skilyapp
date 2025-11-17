import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDuelRealtime } from './useDuelRealtime';
import { DUEL_TIMINGS } from '@/constants/duel';
import { useDuelTimers } from './useDuelTimers';

/**
 * Унифицированный хук для синхронизации счета соперника
 * Объединяет Realtime подписку и fallback проверки
 * Оптимизирован для стабильной работы в Telegram WebApp
 */
export function useOpponentScoreSync(
  duelId: string | null,
  myPlayerId: string | null,
  duelStarted: boolean,
  initialScore?: number
) {
  const [opponentScore, setOpponentScore] = useState(initialScore || 0);
  const { state } = useDuelRealtime(duelId, myPlayerId);
  const { setTimeout: setTimeoutTimer, setInterval, clearTimeout: clearTimeoutTimer, clearInterval } = useDuelTimers();
  const lastScoreRef = useRef(initialScore || 0);
  const hasInitializedRef = useRef(false);
  const lastRealtimeUpdateRef = useRef<number>(0);
  const realtimeWorkingRef = useRef(true);
  
  // Определяем платформу один раз
  const isMobileTelegram = typeof window !== 'undefined' && 
    window.Telegram?.WebApp && 
    (window.Telegram.WebApp.platform === 'ios' || window.Telegram.WebApp.platform === 'android');
  
  // Debug: логируем изменения параметров
  useEffect(() => {
    console.log('[useOpponentScoreSync] Hook params:', {
      duelId,
      myPlayerId,
      duelStarted,
      initialScore,
      realtimeScore: state.opponentScore,
      currentScore: opponentScore,
      isMobileTelegram
    });
  }, [duelId, myPlayerId, duelStarted, initialScore, state.opponentScore, opponentScore, isMobileTelegram]);
  
  // Обновляем начальное значение если оно изменилось
  useEffect(() => {
    if (initialScore !== undefined && initialScore !== lastScoreRef.current) {
      console.log('[useOpponentScoreSync] 🔄 Setting initial opponent score:', initialScore);
      setOpponentScore(initialScore);
      lastScoreRef.current = initialScore;
      hasInitializedRef.current = true;
    }
  }, [initialScore]);

  // Основной способ: синхронизация через Realtime
  useEffect(() => {
    // Если Realtime передал валидный счет, обновляем
    if (typeof state.opponentScore === 'number' && state.opponentScore >= 0) {
      // Отслеживаем что Realtime работает
      lastRealtimeUpdateRef.current = Date.now();
      realtimeWorkingRef.current = true;
      
      // УБРАНО: Защита от обновления на 0 - она блокировала валидные обновления
      // Вместо этого доверяем Realtime как основному источнику истины
      
      // Используем ref для сравнения, чтобы избежать проблем с зависимостями
      if (state.opponentScore !== lastScoreRef.current) {
        console.log('[useOpponentScoreSync] ✅ Updating opponent score from realtime:', state.opponentScore, '(was:', lastScoreRef.current, ')');
        setOpponentScore(state.opponentScore);
        lastScoreRef.current = state.opponentScore;
        hasInitializedRef.current = true;
      }
    }
  }, [state.opponentScore]);

  // Немедленная проверка счета при установке myPlayerId или начале дуэли
  useEffect(() => {
    if (!duelId || !myPlayerId) return;
    
    const checkScoreImmediately = async () => {
      try {
        const { data: players, error } = await supabase
          .from('duel_players')
          .select('id, score, user_id')
          .eq('duel_id', duelId);
        
        if (error) {
          console.error('[useOpponentScoreSync] Error checking opponent score (immediate):', error);
          return;
        }
        
        if (players && players.length >= 2) {
          const opponent = players.find((p: any) => p.id !== myPlayerId);
          if (opponent && typeof opponent.score === 'number') {
            // Обновляем только если счет действительно изменился
            if (opponent.score !== lastScoreRef.current) {
              console.log('[useOpponentScoreSync] 🔄 Immediate check: Updating opponent score:', opponent.score, '(was:', lastScoreRef.current, ')');
              setOpponentScore(opponent.score);
              lastScoreRef.current = opponent.score;
              hasInitializedRef.current = true;
            }
          }
        }
      } catch (error) {
        console.error('[useOpponentScoreSync] Exception in immediate score check:', error);
      }
    };
    
    // Небольшая задержка чтобы убедиться что данные загружены
    const timer = setTimeoutTimer(checkScoreImmediately, 500);
    return () => clearTimeoutTimer(timer);
  }, [duelId, myPlayerId, duelStarted, setTimeoutTimer, clearTimeoutTimer]);

  // Fallback: периодическая проверка (более частая для Telegram WebApp)
  useEffect(() => {
    if (!duelId || !myPlayerId || !duelStarted) return;

    // Для Telegram WebApp используем более частую проверку (каждую секунду)
    // Для десктопа - реже (каждые 2 секунды)
    const checkInterval = isMobileTelegram 
      ? 1000  // 1 секунда для Telegram WebApp
      : DUEL_TIMINGS.SCORE_CHECK_INTERVAL_DESKTOP;

    // Проверяем счет периодически как fallback
    const scoreCheckInterval = setInterval(async () => {
      try {
        // Проверяем, работает ли Realtime (если последнее обновление было > 5 секунд назад)
        const timeSinceLastRealtime = Date.now() - lastRealtimeUpdateRef.current;
        const shouldUseFallback = isMobileTelegram || timeSinceLastRealtime > 5000;
        
        if (!shouldUseFallback && realtimeWorkingRef.current) {
          // Realtime работает нормально, пропускаем проверку
          return;
        }
        
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
          if (opponent && typeof opponent.score === 'number') {
            // Обновляем только если счет действительно изменился
            if (opponent.score !== lastScoreRef.current) {
              console.log('[useOpponentScoreSync] 🔄 Fallback: Updating opponent score:', opponent.score, '(was:', lastScoreRef.current, ')');
              setOpponentScore(opponent.score);
              lastScoreRef.current = opponent.score;
              hasInitializedRef.current = true;
              
              // Если fallback сработал, значит Realtime может не работать
              if (timeSinceLastRealtime > 5000) {
                realtimeWorkingRef.current = false;
                console.warn('[useOpponentScoreSync] ⚠️ Realtime may not be working, relying on fallback polling');
              }
            }
          }
        }
      } catch (error) {
        console.error('[useOpponentScoreSync] Exception in score check fallback:', error);
      }
    }, checkInterval);
    
    return () => clearInterval(scoreCheckInterval);
  }, [duelId, myPlayerId, duelStarted, setInterval, clearInterval, isMobileTelegram]);

  return opponentScore;
}

