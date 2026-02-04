import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';

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
  setMyScore: React.Dispatch<React.SetStateAction<number>>;
  setCombo: React.Dispatch<React.SetStateAction<number>>;
  setIsAnswered: React.Dispatch<React.SetStateAction<boolean>>;
  setHasFinishedMyQuestions: React.Dispatch<React.SetStateAction<boolean>>;
  isFinishingRef: React.MutableRefObject<boolean>;
  moveToNextQuestion: () => void;
  finishDuel: () => Promise<void>;
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

    try {
      // Retry логика с экспоненциальной задержкой для timeout
      const maxRetries = 3;
      let data: any = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Edge Function не ответил за 20 секунд')), 20000);
          });

          const invokePromise = supabase.functions.invoke('duel-manager', {
            body: {
              action: 'submit_answer',
              duel_id: duelId,
              profile_id: profileId,
              duel_question_id: questions[currentIndex].id,
              selected_option_id: null,
              time_taken_ms: 60000,
            },
          });

          const result = await Promise.race([invokePromise, timeoutPromise]) as any;
          const { data: resultData, error: resultError } = result;

          if (resultError) {
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
              log(`[useDuelTimeout] ⏳ Retrying timeout submit in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw resultError;
          }

          data = resultData;
          log(`[useDuelTimeout] ✅ Timeout submit successful (attempt ${attempt + 1})`);
          break;
        } catch (attemptError: any) {
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            logWarn('[useDuelTimeout] ⚠️ Timeout submit failed, continuing anyway');
            data = null;
          }
        }
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
        await finishDuel();
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
          finishDuel();
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

