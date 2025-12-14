import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUtils';

// ОПТИМИЗАЦИЯ: Условное логирование только в development
const isDev = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const logError = (...args: any[]) => {
  if (isDev) console.error(...args);
};
const logWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};

interface UseDuelGameProps {
  duelId: string;
  profileId: string | null;
  questions: any[];
  currentIndex: number;
  timeLeft: number;
  isAnswered: boolean;
  combo: number;
  usedBoosts: string[];
  eliminatedOptions: string[];
  isLoadingRef: React.MutableRefObject<boolean>;
  isFinishingRef: React.MutableRefObject<boolean>;
  // Setters
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAnswered: React.Dispatch<React.SetStateAction<boolean>>;
  setMyScore: React.Dispatch<React.SetStateAction<number>>;
  setCombo: React.Dispatch<React.SetStateAction<number>>;
  setUsedBoosts: React.Dispatch<React.SetStateAction<string[]>>;
  setEliminatedOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setHasFinishedMyQuestions: React.Dispatch<React.SetStateAction<boolean>>;
  setIsWaitingForOpponent: React.Dispatch<React.SetStateAction<boolean>>;
  setMyPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setOpponentScore: React.Dispatch<React.SetStateAction<number>>;
  setMyName: React.Dispatch<React.SetStateAction<string>>;
  setOpponentName: React.Dispatch<React.SetStateAction<string>>;
  setMyPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setOpponentPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setTranslationLanguage: React.Dispatch<React.SetStateAction<'ru' | 'en' | null>>;
  // Functions
  fetchQuestions: () => Promise<any[]>;
  fetchPlayers: () => Promise<any>;
  moveToNextQuestion: () => void;
  finishDuel: () => Promise<void>;
}

export function useDuelGame({
  duelId,
  profileId,
  questions,
  currentIndex,
  timeLeft,
  isAnswered,
  combo,
  usedBoosts,
  eliminatedOptions,
  isLoadingRef,
  isFinishingRef,
  setQuestions,
  setCurrentIndex,
  setTimeLeft,
  setSelectedAnswer,
  setIsAnswered,
  setMyScore,
  setCombo,
  setUsedBoosts,
  setEliminatedOptions,
  setHasFinishedMyQuestions,
  setIsWaitingForOpponent,
  setMyPlayerId,
  setOpponentScore,
  setMyName,
  setOpponentName,
  setMyPhotoUrl,
  setOpponentPhotoUrl,
  setLoading,
  setTranslationLanguage,
  fetchQuestions,
  fetchPlayers,
  moveToNextQuestion,
  finishDuel,
}: UseDuelGameProps) {
  // Hydrate questions from localStorage
  const hydrateQuestions = useCallback((questionList: any[]) => {
    log('[useDuelGame] 💧 Hydrating questions:', { 
      count: questionList?.length || 0,
      firstQuestion: questionList?.[0] ? {
        id: questionList[0].id,
        question_id: questionList[0].question_id,
        hasCorrectOptions: !!questionList[0].correct_option_ids
      } : null
    });
    setQuestions(questionList);

    const savedState = localStorage.getItem('active_duel_state');
    if (!savedState) {
      return;
    }

    try {
      const stored = JSON.parse(savedState);
      if (stored.duelId !== duelId) {
        return;
      }

      if (stored.mode === 'waiting') {
        setCurrentIndex(Math.max(questionList.length - 1, 0));
        setHasFinishedMyQuestions(true);
        setIsWaitingForOpponent(true);
        return;
      }

      if (
        typeof stored.currentIndex === 'number' &&
        stored.currentIndex >= 0 &&
        stored.currentIndex < questionList.length - 1
      ) {
        setCurrentIndex(stored.currentIndex);
      }
    } catch (error) {
      logError('[useDuelGame] Error parsing saved duel state:', error);
    }
  }, [duelId, setQuestions, setCurrentIndex, setHasFinishedMyQuestions, setIsWaitingForOpponent]);

  // Sync players data
  const syncPlayers = useCallback(async () => {
    try {
      const players = await fetchPlayers();
      if (!players) return;

      setMyPlayerId(players.myPlayerId);
      setMyScore(players.myScore);
      setOpponentScore(players.opponentScore);
      setMyName(players.myName);
      
      // Проверяем, является ли соперник ботом
      const myPlayer = players.players.find((p) => p.user_id === profileId);
      const opponent = players.players.find((p) => p.user_id !== profileId);
      
      // Устанавливаем имя соперника с учетом бота
      if (opponent?.is_bot) {
        // Для бота используем bot_name из данных (приоритет) или name
        const botName = opponent.bot_name || opponent.name || players.opponentName || 'CyberNinja';
        setOpponentName(botName);
        console.log('[useDuelGame] Bot name set:', { bot_name: opponent.bot_name, name: opponent.name, final: botName });
      } else {
        setOpponentName(players.opponentName);
      }

      if (myPlayer?.profiles?.photo_url) {
        setMyPhotoUrl(getImageUrl(myPlayer.profiles.photo_url));
      }
      
      // Для бота используем null, чтобы показывался fallback с инициалами
      // Для реального игрока - его фото
      if (opponent?.is_bot) {
        // Для бота всегда показываем аватар с инициалами
        setOpponentPhotoUrl(null);
      } else if (opponent?.profiles?.photo_url) {
        setOpponentPhotoUrl(getImageUrl(opponent.profiles.photo_url));
      } else {
        // Если у реального игрока нет фото - тоже показываем инициалы
        setOpponentPhotoUrl(null);
      }
    } catch (error) {
      logError('[useDuelGame] Error syncing players:', error);
    }
  }, [fetchPlayers, profileId, setMyPlayerId, setMyScore, setOpponentScore, setMyName, setOpponentName, setMyPhotoUrl, setOpponentPhotoUrl]);

  // Sync questions
  const syncQuestions = useCallback(async () => {
    // ОПТИМИЗАЦИЯ: Предотвращаем повторные вызовы если уже идет загрузка
    if (isLoadingRef.current) {
      log('[useDuelGame] ⚠️ Questions already loading, skipping sync');
      return;
    }
    
    // КРИТИЧНО: Retry логика для загрузки вопросов (может быть race condition при создании дуэли)
    const maxRetries = 5;
    const retryDelay = 1000; // 1 секунда между попытками
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      log('[useDuelGame] 🔄 Loading questions...', { duelId, profileId });
      
      let questionList: any[] | null = null;
      let lastError: any = null;
      
      // Пытаемся загрузить вопросы с retry
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          questionList = await fetchQuestions();
          if (questionList && questionList.length > 0) {
            log('[useDuelGame] ✅ Questions loaded:', { count: questionList.length, attempt: attempt + 1 });
            break; // Успешно загрузили, выходим из цикла
          }
          
          // Если вопросы пустые, пробуем еще раз
          if (attempt < maxRetries - 1) {
            logWarn(`[useDuelGame] ⚠️ Questions empty, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        } catch (error: any) {
          lastError = error;
          const isNotFoundError = error?.message?.includes('не найдены') || error?.message?.includes('not found');
          
          // Если это ошибка "не найдены" и не последняя попытка - ретраим
          if (isNotFoundError && attempt < maxRetries - 1) {
            logWarn(`[useDuelGame] ⚠️ Questions not found, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          // Для других ошибок или последней попытки - пробрасываем ошибку
          throw error;
        }
      }
      
      if (!questionList || questionList.length === 0) {
        throw lastError || new Error('Вопросы не найдены после всех попыток');
      }
      
      hydrateQuestions(questionList);
    } catch (error) {
      logError('[useDuelGame] Failed to load questions after retries:', error);
      toast.error(`Ошибка загрузки вопросов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, {
        description: 'Попробуйте обновить страницу'
      });
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [fetchQuestions, hydrateQuestions, duelId, profileId, isLoadingRef, setLoading]);

  // Handle answer submission
  const handleAnswer = useCallback(async (optionId: string) => {
    // КРИТИЧЕСКИ ВАЖНО: разблокируем AudioContext при первом клике в игре
    if (!sounds.isUnlocked()) {
      log('[useDuelGame] 🔓 Разблокировка AudioContext при первом ответе');
      sounds.forceUnlock();
    }
    if (isAnswered) return;

    // Проверяем, что вопросы загружены и текущий вопрос существует
    if (!questions || questions.length === 0 || !questions[currentIndex]) {
      logError('[useDuelGame] Cannot handle answer: questions not loaded or invalid currentIndex');
      toast.error('Вопросы не загружены');
      return;
    }

    setSelectedAnswer(optionId);
    setIsAnswered(true);

    // Обновляем статус активности на "answering"
    if (duelId && profileId) {
      supabase.functions.invoke('duel-manager', {
        body: {
          action: 'update_activity_status',
          duel_id: duelId,
          profile_id: profileId,
          status: 'answering'
        }
      }).catch(error => {
        logError('[useDuelGame] Error updating activity status to answering:', error);
      });
    }

    const question = questions[currentIndex];
    
    // Проверяем, что вопрос существует и имеет необходимые поля
    if (!question || !question.id) {
      logError('[useDuelGame] Invalid question:', { question, currentIndex, questionsLength: questions.length });
      toast.error('Ошибка: вопрос не найден');
      return;
    }

    const isCorrect = question.correct_option_ids?.includes(optionId) ?? false;

    log('[useDuelGame] Submitting answer:', {
      questionId: question.id,
      optionId,
      timeLeft,
      timeTaken: 60000 - timeLeft,
      isCorrect
    });

    try {
      // Retry логика с экспоненциальной задержкой для submit_answer
      const maxRetries = 3;
      let data: any = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Таймаут 20 секунд на запрос
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Edge Function не ответил за 20 секунд')), 20000);
          });

          const requestBody = {
            action: 'submit_answer',
            duel_id: duelId,
            profile_id: profileId,
            duel_question_id: question.id,
            selected_option_id: optionId,
            time_taken_ms: Math.max(0, Math.min(60000, 60000 - timeLeft)),
          };

          log('[useDuelGame] Request body:', requestBody);

          const invokePromise = supabase.functions.invoke('duel-manager', {
            body: requestBody,
          });

          const result = await Promise.race([invokePromise, timeoutPromise]) as any;
          const { data: resultData, error: resultError } = result;

          if (resultError) {
            lastError = resultError;
            logWarn(`[useDuelGame] ⚠️ Submit answer attempt ${attempt + 1} failed:`, {
              message: resultError?.message,
              status: resultError?.status,
              error: resultError,
              requestBody
            });

            // Если это не последняя попытка, ждем перед повтором
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
              log(`[useDuelGame] ⏳ Retrying submit_answer in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw resultError;
          }

          // Успешно получили ответ
          data = resultData;
          log(`[useDuelGame] ✅ Submit answer successful (attempt ${attempt + 1})`);
          break;

        } catch (attemptError: any) {
          lastError = attemptError;
          logWarn(`[useDuelGame] ⚠️ Submit answer attempt ${attempt + 1} exception:`, attemptError?.message);

          // Если это не последняя попытка, ждем перед повтором
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            log(`[useDuelGame] ⏳ Retrying submit_answer in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Все попытки не удались - показываем ошибку, но продолжаем игру
            logError('[useDuelGame] ❌ All submit_answer attempts failed, continuing anyway');
            toast.error('Не удалось сохранить ответ, но игра продолжается');
            // Продолжаем выполнение без данных от сервера
            data = null;
          }
        }
      }

      if (lastError && !data) {
        // Если все попытки не удались, продолжаем игру без обновления счета
        logWarn('[useDuelGame] ⚠️ Continuing without server response');
      }

      // ============================================================================
      // CRITICAL: USE SERVER SCORE AND COMBO - CLIENT NEVER CALCULATES
      // ============================================================================
      if (data && data.new_score !== undefined) {
        setMyScore(data.new_score);

        // CRITICAL: Always use server-provided combo value, even if it's 0
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);

        log('[useDuelGame] Combo updated from server:', {
          oldCombo: combo,
          newCombo: serverCombo,
          isCorrect,
          expectedBehavior: isCorrect ? `Combo should be ${combo + 1}` : 'Combo should be 0'
        });

        log('[useDuelGame] Server response:', {
          isCorrect,
          serverCombo,
          points: data.points_awarded
        });

        // Play sounds based on server response
        if (isCorrect) {
          sounds.correctAnswer();
          haptics.correctAnswer();
          if (serverCombo > 1) {
            sounds.combo(serverCombo);
            haptics.combo();
          }
          if (serverCombo >= 3) {
            sounds.confetti();
          }
        } else {
          sounds.wrongAnswer();
          haptics.wrongAnswer();
          // Combo should be 0 after wrong answer
          if (serverCombo !== 0) {
            logWarn('[useDuelGame] Warning: Server returned non-zero combo for incorrect answer:', serverCombo);
          }
        }
      } else {
        // Fallback: reload from DB if server doesn't return score
        await syncPlayers();
      }

      // IMPROVED: Check if both players finished before showing waiting screen
      const isLastQuestion = currentIndex >= questions.length - 1;
      log('[useDuelGame] Answer submitted:', {
        currentIndex,
        questionsLength: questions.length,
        isLastQuestion,
        willTransition: !isLastQuestion
      });

      if (isLastQuestion) {
        // Prevent duplicate calls
        if (isFinishingRef.current) {
          log('[useDuelGame] Already finishing, skipping');
          return;
        }

        isFinishingRef.current = true;
        log('[useDuelGame] ✅ Last question answered - checking duel status');

        setHasFinishedMyQuestions(true);
        // Call finishDuel to check if both players finished
        finishDuel();
      } else {
        // Normal transition to next question
        log('[useDuelGame] Transitioning to next question in 1500ms');
        setTimeout(() => {
          log('[useDuelGame] Executing transition to next question');
          moveToNextQuestion();
        }, 1500);
      }
    } catch (error) {
      logError('[useDuelGame] Error submitting answer:', error);
      // Даже при ошибке продолжаем игру
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
    timeLeft,
    combo,
    duelId,
    profileId,
    setSelectedAnswer,
    setIsAnswered,
    setMyScore,
    setCombo,
    setHasFinishedMyQuestions,
    isFinishingRef,
    syncPlayers,
    moveToNextQuestion,
    finishDuel,
  ]);

  return {
    hydrateQuestions,
    syncPlayers,
    syncQuestions,
    handleAnswer,
  };
}

