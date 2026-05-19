import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { withRetry } from '@/hooks/useRetryableCall';
import { useDuelStore } from '@/store/duelStore';

// ОПТИМИЗАЦИЯ: Условное логирование только в development
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const logError = (...args: any[]) => {
  if (isDev) console.error(...args);
};
const logWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};

interface UseDuelTimeoutProps {
  duelId: string;
  profileId: string | null;
  questions: any[];
  currentIndex: number;
  isAnswered: boolean;
  setMyScore: (score: number) => void;
  setCombo: (combo: number) => void;
  setIsAnswered: (isAnswered: boolean) => void;
  setHasFinishedMyQuestions: (finished: boolean) => void;
  isFinishingRef: React.MutableRefObject<boolean>;
  moveToNextQuestion: () => void;
  finishDuel: (callerHasFinished?: boolean) => Promise<void>;
}

export function useDuelTimeout({
  duelId,
  profileId,
  questions,
  currentIndex,
  isAnswered,
  setMyScore,
  setCombo,
  setIsAnswered,
  setHasFinishedMyQuestions,
  isFinishingRef,
  moveToNextQuestion,
  finishDuel,
}: UseDuelTimeoutProps) {
  const handleTimeout = useCallback(async () => {
    if (isAnswered) return;

    if (questions.length === 0 || !questions[currentIndex]) {
      logError('[useDuelTimeout] Cannot handle timeout: questions not loaded or invalid currentIndex');
      return;
    }

    setIsAnswered(true);
    sounds.wrongAnswer();

    // Timeout is always wrong — mark progress dot immediately so it doesn't stay grey
    useDuelStore.getState().addAnswerToHistory(false);

    try {
      let data: any = null;

      try {
        const result = await withRetry(
          () => supabase.functions.invoke('duel-manager', {
            body: {
              action: 'submit_answer',
              duel_id: duelId,
              profile_id: profileId,
              duel_question_id: questions[currentIndex].id,
              selected_option_id: null,
              time_taken_ms: 60000,
            },
          }),
          {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000,
            timeoutMs: 20000,
            onRetry: (attempt, err) => log(`[useDuelTimeout] ⏳ Retrying timeout submit (attempt ${attempt}):`, err?.message),
          }
        ) as any;

        if (result?.error) throw result.error;
        data = result?.data ?? null;
        log('[useDuelTimeout] ✅ Timeout submit successful');
      } catch (_err) {
        logWarn('[useDuelTimeout] ⚠️ Timeout submit failed, continuing anyway');
        data = null;
      }

      // Update score and combo from server (combo should be 0 for timeout)
      if (data) {
        if (data.new_score !== undefined) {
          setMyScore(data.new_score);
        }
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);
        log('[useDuelTimeout] Timeout - Server combo:', serverCombo);
      }

      // Check if both players finished before showing waiting screen
      const isLastQuestion = currentIndex >= questions.length - 1;
      log('[useDuelTimeout] Timeout occurred:', {
        currentIndex,
        questionsLength: questions.length,
        isLastQuestion,
        willTransition: !isLastQuestion
      });

      if (isLastQuestion) {
        if (isFinishingRef.current) {
          log('[useDuelTimeout] Already finishing, skipping');
          return;
        }

        isFinishingRef.current = true;
        log('[useDuelTimeout] ✅ Last question timeout - checking duel status');

        setHasFinishedMyQuestions(true);
        await finishDuel(true);
      } else {
        log('[useDuelTimeout] Transitioning to next question after timeout in 1500ms');
        setTimeout(() => {
          log('[useDuelTimeout] Executing timeout transition to next question');
          moveToNextQuestion();
        }, 1500);
      }
    } catch (error) {
      logError('[useDuelTimeout] Error on timeout:', error);
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          moveToNextQuestion();
        } else {
          // КРИТИЧНО: Даже при ошибке помечаем, что мы закончили свои вопросы
          setHasFinishedMyQuestions(true);
          finishDuel(true);
        }
      }, 1500);
    }
  }, [
    isAnswered,
    questions,
    currentIndex,
    duelId,
    profileId,
    setMyScore,
    setCombo,
    setIsAnswered,
    setHasFinishedMyQuestions,
    isFinishingRef,
    moveToNextQuestion,
    finishDuel,
  ]);

  return { handleTimeout };
}

