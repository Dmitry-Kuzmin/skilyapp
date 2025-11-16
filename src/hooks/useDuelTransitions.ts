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
 */
export function useDuelTransitions(
  duelId: string | null,
  isWaitingForOpponent: boolean,
  hasFinishedMyQuestions: boolean,
  onDuelFinished: () => void
) {
  const { state } = useDuelRealtime(duelId);
  const { setTimeout } = useDuelTimers();
  const hasTransitionedRef = useRef(false);
  const isVerifyingRef = useRef(false);

  // Определяем задержку перехода в зависимости от платформы
  const getTransitionDelay = useCallback(() => {
    const isMobileTelegram = typeof window !== 'undefined' && 
      window.Telegram?.WebApp && 
      (window.Telegram.WebApp.platform === 'ios' || window.Telegram.WebApp.platform === 'android');
    
    return isMobileTelegram 
      ? DUEL_TIMINGS.TRANSITION_DELAY_MOBILE 
      : DUEL_TIMINGS.TRANSITION_DELAY_DESKTOP;
  }, []);

  // Основной способ: переход через Realtime подписку
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions) {
      return;
    }

    // Используем state.duelFinished из useDuelRealtime (Realtime подписка)
    if (state.duelFinished && !hasTransitionedRef.current) {
      console.log('[useDuelTransitions] ✅✅✅ REALTIME: Duel finished! Transitioning to results');
      hasTransitionedRef.current = true;
      
      try {
        if (sounds?.victory) {
          sounds.victory();
        }
      } catch (soundError) {
        console.warn('[useDuelTransitions] Error playing victory sound:', soundError);
      }
      
      toast.success('🏁 Дуэль завершена!', { duration: 2000 });
      
      // Задержка для мобильной версии Telegram WebApp чтобы экран ожидания успел скрыться
      const delay = getTransitionDelay();
      setTimeout(() => {
        onDuelFinished();
      }, delay);
    }
  }, [state.duelFinished, isWaitingForOpponent, hasFinishedMyQuestions, onDuelFinished, getTransitionDelay, setTimeout]);

  // Backup: проверка статуса при обновлении счета соперника
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions || hasTransitionedRef.current) {
      return;
    }

    // Если счет соперника обновился, проверяем статус дуэли как fallback
    if (state.opponentScore > 0) {
      console.log('[useDuelTransitions] 🔄 Opponent score updated while waiting - checking duel status as fallback');
      
      const checkTimer = setTimeout(async () => {
        if (hasTransitionedRef.current || isVerifyingRef.current) return;
        
        isVerifyingRef.current = true;
        try {
          const { data: duel } = await supabase
            .from('duels')
            .select('status, num_questions')
            .eq('id', duelId)
            .single();
          
          if (duel?.status === 'finished' && !hasTransitionedRef.current) {
            console.log('[useDuelTransitions] ✅✅✅ FALLBACK: Duel status is finished! Transitioning to results');
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
          }
        } catch (error) {
          console.error('[useDuelTransitions] Error in fallback status check:', error);
        } finally {
          isVerifyingRef.current = false;
        }
      }, DUEL_TIMINGS.FALLBACK_CHECK_DELAY);
      
      return () => clearTimeout(checkTimer);
    }
  }, [state.opponentScore, isWaitingForOpponent, hasFinishedMyQuestions, duelId, onDuelFinished, getTransitionDelay, setTimeout]);

  // Backup: принудительный переход если дуэль завершена
  useEffect(() => {
    if (state.duelFinished && isWaitingForOpponent && hasFinishedMyQuestions && !hasTransitionedRef.current) {
      console.log('[useDuelTransitions] 🔥 BACKUP: Duel finished while waiting - forcing transition');
      hasTransitionedRef.current = true;
      
      const delay = getTransitionDelay();
      setTimeout(() => {
        onDuelFinished();
      }, delay);
    }
  }, [state.duelFinished, isWaitingForOpponent, hasFinishedMyQuestions, onDuelFinished, getTransitionDelay, setTimeout]);

  // Сброс флага при изменении дуэли
  useEffect(() => {
    hasTransitionedRef.current = false;
    isVerifyingRef.current = false;
  }, [duelId]);

  return {
    hasTransitioned: hasTransitionedRef.current,
  };
}

