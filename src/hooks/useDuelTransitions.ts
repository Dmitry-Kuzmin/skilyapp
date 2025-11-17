import { useEffect, useRef, useCallback } from 'react';
import { useDuelRealtime } from './useDuelRealtime';
import { DUEL_TIMINGS } from '@/constants/duel';
import { useDuelTimers } from './useDuelTimers';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';

/**
 * Унифицированный хук для управления переходами между экранами дуэли
 * Обрабатывает переход от экрана ожидания к результатам
 * Оптимизирован для стабильной работы в Telegram WebApp
 */
export function useDuelTransitions(
  duelId: string | null,
  isWaitingForOpponent: boolean,
  hasFinishedMyQuestions: boolean,
  onDuelFinished: () => void
) {
  const { state } = useDuelRealtime(duelId);
  const { setTimeout, setInterval, clearInterval } = useDuelTimers();
  const hasTransitionedRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const lastStatusCheckRef = useRef<number>(0);

  // Определяем платформу один раз
  const isMobileTelegram = typeof window !== 'undefined' && 
    window.Telegram?.WebApp && 
    (window.Telegram.WebApp.platform === 'ios' || window.Telegram.WebApp.platform === 'android');

  // Определяем задержку перехода в зависимости от платформы
  const getTransitionDelay = useCallback(() => {
    return isMobileTelegram 
      ? DUEL_TIMINGS.TRANSITION_DELAY_MOBILE 
      : DUEL_TIMINGS.TRANSITION_DELAY_DESKTOP;
  }, [isMobileTelegram]);

  // Функция перехода к результатам (централизованная)
  const transitionToResults = useCallback(() => {
    if (hasTransitionedRef.current) return;
    
    console.log('[useDuelTransitions] ✅✅✅ Transitioning to results');
    hasTransitionedRef.current = true;
    
    try {
      if (sounds?.victory) {
        sounds.victory();
      }
    } catch (soundError) {
      console.warn('[useDuelTransitions] Error playing victory sound:', soundError);
    }
    
    toast.success('🏁 Дуэль завершена!', { duration: 2000 });
    
    const delay = getTransitionDelay();
    setTimeout(() => {
      onDuelFinished();
    }, delay);
  }, [getTransitionDelay, setTimeout, onDuelFinished]);

  // Основной способ: переход через Realtime подписку
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions) {
      return;
    }

    // Используем state.duelFinished из useDuelRealtime (Realtime подписка)
    if (state.duelFinished && !hasTransitionedRef.current) {
      console.log('[useDuelTransitions] ✅✅✅ REALTIME: Duel finished! Transitioning to results');
      transitionToResults();
    }
  }, [state.duelFinished, isWaitingForOpponent, hasFinishedMyQuestions, transitionToResults]);

  // Backup: периодическая проверка статуса дуэли (особенно важно для Telegram WebApp)
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions || !duelId || hasTransitionedRef.current) {
      return;
    }

    // Для Telegram WebApp проверяем чаще (каждые 2 секунды)
    // Для десктопа - реже (каждые 3 секунды)
    const checkInterval = isMobileTelegram ? 2000 : 3000;

    const statusCheckInterval = setInterval(async () => {
      if (hasTransitionedRef.current || isVerifyingRef.current) return;
      
      // Не проверяем слишком часто (минимум 1 секунда между проверками)
      const now = Date.now();
      if (now - lastStatusCheckRef.current < 1000) return;
      lastStatusCheckRef.current = now;
      
      isVerifyingRef.current = true;
      try {
        const { data: duel, error } = await supabase
          .from('duels')
          .select('status')
          .eq('id', duelId)
          .single();
        
        if (error) {
          console.error('[useDuelTransitions] Error checking duel status:', error);
          return;
        }
        
        if (duel?.status === 'finished' && !hasTransitionedRef.current) {
          console.log('[useDuelTransitions] ✅✅✅ PERIODIC CHECK: Duel status is finished! Transitioning to results');
          transitionToResults();
        }
      } catch (error) {
        console.error('[useDuelTransitions] Exception in periodic status check:', error);
      } finally {
        isVerifyingRef.current = false;
      }
    }, checkInterval);
    
    return () => clearInterval(statusCheckInterval);
  }, [isWaitingForOpponent, hasFinishedMyQuestions, duelId, transitionToResults, isMobileTelegram, setInterval, clearInterval]);

  // Backup: проверка статуса при обновлении счета соперника
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions || hasTransitionedRef.current || !duelId) {
      return;
    }

    // Если счет соперника обновился, проверяем статус дуэли как fallback
    if (state.opponentScore > 0) {
      console.log('[useDuelTransitions] 🔄 Opponent score updated while waiting - checking duel status as fallback');
      
      const checkTimer = setTimeout(async () => {
        if (hasTransitionedRef.current || isVerifyingRef.current) return;
        
        isVerifyingRef.current = true;
        try {
          const { data: duel, error } = await supabase
            .from('duels')
            .select('status')
            .eq('id', duelId)
            .single();
          
          if (error) {
            console.error('[useDuelTransitions] Error in fallback status check:', error);
            return;
          }
          
          if (duel?.status === 'finished' && !hasTransitionedRef.current) {
            console.log('[useDuelTransitions] ✅✅✅ FALLBACK: Duel status is finished! Transitioning to results');
            transitionToResults();
          }
        } catch (error) {
          console.error('[useDuelTransitions] Exception in fallback status check:', error);
        } finally {
          isVerifyingRef.current = false;
        }
      }, DUEL_TIMINGS.FALLBACK_CHECK_DELAY);
      
      return () => clearTimeout(checkTimer);
    }
  }, [state.opponentScore, isWaitingForOpponent, hasFinishedMyQuestions, duelId, transitionToResults, setTimeout]);

  // Сброс флага при изменении дуэли
  useEffect(() => {
    hasTransitionedRef.current = false;
    isVerifyingRef.current = false;
    lastStatusCheckRef.current = 0;
  }, [duelId]);

  return {
    hasTransitioned: hasTransitionedRef.current,
  };
}

