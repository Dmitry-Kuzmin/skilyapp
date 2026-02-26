import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUtils';
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

interface UseDuelGameProps {
  duelId: string;
  profileId: string | null;
  // Callbacks
  onWrongAnswer?: () => void;
  onCorrectAnswer?: () => void;
  // External fetchers needed because they depend on other hooks/logic not in store
  fetchQuestions: () => Promise<any[]>;
  fetchPlayers: () => Promise<any>;
  finishDuel: (callerHasFinished?: boolean) => Promise<void>;
  moveToNextQuestion: () => void;
}

export function useDuelGame({
  duelId,
  profileId,
  finishDuel,
  moveToNextQuestion,
  fetchQuestions,
  fetchPlayers,
  onWrongAnswer,
  onCorrectAnswer,
}: UseDuelGameProps) {
  // Access store actions
  const setQuestions = useDuelStore(state => state.setQuestions);
  const updateQuestion = useDuelStore(state => state.updateQuestion);
  const setPlayersData = useDuelStore(state => state.setPlayersData);
  const setMyScore = useDuelStore(state => state.setMyScore);
  const setOpponentScore = useDuelStore(state => state.setOpponentScore);
  const setMyPlayerId = useDuelStore(state => state.setMyPlayerId);
  const setLoading = useDuelStore(state => state.setLoading);
  const setTimeLeft = useDuelStore(state => state.setTimeLeft);

  const setSelectedAnswer = useDuelStore(state => state.setAnswer);
  const setCombo = useDuelStore(state => state.setCombo);
  const setHasFinishedMyQuestions = useDuelStore(state => state.setFinishedMyQuestions);
  const setIsWaitingForOpponent = useDuelStore(state => state.setWaitingForOpponent);
  const setCurrentIndex = useDuelStore(state => state.setCurrentIndex);
  const setIsProcessingAnswer = useDuelStore(state => state.setIsProcessingAnswer);

  // Access store state needed for logic
  const questions = useDuelStore(state => state.questions);
  const currentIndex = useDuelStore(state => state.currentIndex);
  const isAnswered = useDuelStore(state => state.isAnswered);
  const timeLeft = useDuelStore(state => state.timeLeft);
  const combo = useDuelStore(state => state.combo);

  // Refs for tracking async state
  const playersLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isFinishingRef = useRef(false);

  // Sync initialization
  useEffect(() => {
    useDuelStore.getState().setDuelId(duelId);
    useDuelStore.getState().setProfileId(profileId);
  }, [duelId, profileId]);

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
    if (!savedState) return;

    try {
      const stored = JSON.parse(savedState);
      if (stored.duelId !== duelId) return;

      if (stored.mode === 'waiting' && (questionList?.length || 0) > 0) {
        log('[useDuelGame] ⏳ Storing from waiting mode - verified questions exist');
        setCurrentIndex(Math.max((questionList?.length || 1) - 1, 0));
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
      if (!players || !players.players || players.players.length === 0) {
        logWarn('[useDuelGame] ⚠️ No players data received');
        playersLoadedRef.current = false;
        return;
      }

      playersLoadedRef.current = true;
      log('[useDuelGame] ✅ Players loaded:', { count: players.players.length });

      setMyPlayerId(players.myPlayerId);
      setMyScore(players.myScore);
      setOpponentScore(players.opponentScore);

      const myPlayer = players.players.find((p: any) => p.user_id === profileId);
      const opponent = players.players.find((p: any) => p.user_id !== profileId);

      let opponentName = players.opponentName;
      let opponentPhotoUrl = null;

      if (opponent?.is_bot) {
        opponentName = opponent.bot_name || opponent.name || players.opponentName || 'CyberNinja';
        opponentPhotoUrl = null; // Bot avatar fallback
        console.log('[useDuelGame] Bot name set:', { bot_name: opponent.bot_name, name: opponent.name, final: opponentName });
      } else {
        opponentName = players.opponentName;
        if (opponent?.profiles?.photo_url) {
          opponentPhotoUrl = getImageUrl(opponent.profiles.photo_url);
        }
      }

      setPlayersData({
        myName: players.myName,
        opponentName: opponentName,
        myPhotoUrl: myPlayer?.profiles?.photo_url ? getImageUrl(myPlayer.profiles.photo_url) : null,
        opponentPhotoUrl
      });

    } catch (error) {
      logError('[useDuelGame] Error syncing players:', error);
      playersLoadedRef.current = false;
    }
  }, [fetchPlayers, profileId, setMyPlayerId, setMyScore, setOpponentScore, setPlayersData]);

  // Sync questions
  const syncQuestions = useCallback(async () => {
    if (isLoadingRef.current) {
      log('[useDuelGame] ⚠️ Questions already loading, skipping sync');
      return;
    }

    if (!playersLoadedRef.current) {
      logWarn('[useDuelGame] ⚠️ Players not loaded yet, waiting before loading questions...');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!playersLoadedRef.current) {
        logWarn('[useDuelGame] ⚠️ Players still not loaded after delay, attempting to load questions anyway');
      }
    }

    const maxRetries = 5;
    const retryDelay = 1000;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      log('[useDuelGame] 🔄 Loading questions...', { duelId, profileId, playersLoaded: playersLoadedRef.current });

      let questionList: any[] | null = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          questionList = await fetchQuestions();
          if (questionList && questionList.length > 0) {
            log('[useDuelGame] ✅ Questions loaded:', { count: questionList.length, attempt: attempt + 1 });
            break;
          }

          if (attempt < maxRetries - 1) {
            logWarn(`[useDuelGame] ⚠️ Questions empty, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        } catch (error: any) {
          lastError = error;
          const isNotFoundError = error?.message?.includes('не найдены') || error?.message?.includes('not found');

          if (isNotFoundError && attempt < maxRetries - 1) {
            logWarn(`[useDuelGame] ⚠️ Questions not found, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          throw error;
        }
      }

      if (!questionList || questionList.length === 0) {
        throw lastError || new Error('Вопросы не найдены после всех попыток');
      }

      hydrateQuestions(questionList);

      // ⚡️ ПРЕДЗАГРУЗКА ИЗОБРАЖЕНИЯ ПЕРВОГО ВОПРОСА
      // Чтобы не было "черной полосы" в начале дуэли, ждем загрузки картинки
      const firstQuestion = questionList[0];
      const imageUrl = firstQuestion?.question_snapshot?.image_url;
      if (imageUrl) {
        log('[useDuelGame] 🖼️ Waiting for first question image to preload...');
        const { preloadImage } = await import('@/utils/imageUtils');
        await preloadImage(imageUrl);
        log('[useDuelGame] ✅ First image preloaded');
      }
    } catch (error) {
      logError('[useDuelGame] Failed to load questions after retries:', error);
      toast.error(`Ошибка загрузки вопросов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, {
        description: 'Попробуйте обновить страницу'
      });
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [fetchQuestions, hydrateQuestions, duelId, profileId, setLoading, setQuestions]);

  // Handle answer submission
  const handleAnswer = useCallback(async (optionId: string) => {
    if (!sounds.isUnlocked()) {
      log('[useDuelGame] 🔓 Разблокировка AudioContext при первом ответе');
      sounds.forceUnlock();
    }

    // Check if already answered in store or refs
    if (useDuelStore.getState().isAnswered) return;

    const currentQuestions = useDuelStore.getState().questions;
    const currentIdx = useDuelStore.getState().currentIndex;

    if (!currentQuestions || currentQuestions.length === 0 || !currentQuestions[currentIdx]) {
      logError('[useDuelGame] Cannot handle answer: questions not loaded or invalid currentIndex');
      toast.error('Вопросы не загружены');
      return;
    }

    // Set answer in store immediately (optimistic UI)
    setSelectedAnswer(optionId);

    // 🆕 Show processing animation
    setIsProcessingAnswer(true);

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

    const question = currentQuestions[currentIdx];

    if (!question || !question.id) {
      logError('[useDuelGame] Invalid question:', { question, currentIndex: currentIdx });
      toast.error('Ошибка: вопрос не найден');
      return;
    }

    const currentTimeLeft = useDuelStore.getState().timeLeft;

    // Log intent
    log('[useDuelGame] Submitting answer:', {
      questionId: question.id,
      optionId,
      timeLeft: currentTimeLeft
    });

    try {
      const maxRetries = 3;
      let data: any = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Edge Function не ответил за 20 секунд')), 20000);
          });

          const timeTaken = Math.max(0, Math.min(60000, 60000 - currentTimeLeft));
          const requestBody = {
            action: 'submit_answer',
            duel_id: duelId,
            profile_id: profileId,
            duel_question_id: question.id,
            selected_option_id: optionId,
            time_taken_ms: timeTaken,
            is_timeout: false
          };

          log('[useDuelGame] Request body:', requestBody);

          const invokePromise = supabase.functions.invoke('duel-manager', { body: requestBody });
          const result = await Promise.race([invokePromise, timeoutPromise]) as any;
          const { data: resultData, error: resultError } = result;

          if (resultError) {
            lastError = resultError;
            const isRateLimited = resultError?.status === 429 || resultError?.message?.includes('429');

            logWarn(`[useDuelGame] ⚠️ Submit answer attempt ${attempt + 1} failed${isRateLimited ? ' (Rate Limited)' : ''}:`, {
              message: resultError?.message,
              status: resultError?.status,
              error: resultError
            });

            if (attempt < maxRetries - 1) {
              const delay = isRateLimited
                ? (4000 + Math.random() * 3000)
                : Math.min(1000 * Math.pow(2, attempt), 5000);

              log(`[useDuelGame] ⏳ Retrying submit_answer in ${Math.round(delay)}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw resultError;
          }

          data = resultData;
          log(`[useDuelGame] ✅ Submit answer successful (attempt ${attempt + 1})`);
          break;

        } catch (attemptError: any) {
          lastError = attemptError;
          logWarn(`[useDuelGame] ⚠️ Submit answer attempt ${attempt + 1} exception:`, attemptError?.message);

          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            logError('[useDuelGame] ❌ All submit_answer attempts failed, continuing anyway');
            const errorDetails = lastError instanceof Error ? lastError.message : String(lastError);
            toast.error(`Не удалось сохранить ответ (${errorDetails}), но игра продолжается`);
            data = null;
          }
        }
      }

      if (data && data.new_score !== undefined) {
        setMyScore(data.new_score);

        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);

        // 🔥 CRITICAL FIX: Update question.correct_option_ids based on server response for UI
        const serverIsCorrect = data.is_correct === true;

        updateQuestion(currentIdx, {
          correct_option_ids: serverIsCorrect ? [optionId] :
            question.question_snapshot?.answer_options
              ?.filter((opt: any) => opt.is_correct)
              ?.map((opt: any) => opt.id) || []
        });

        log('[useDuelGame] Server response:', { serverIsCorrect, serverCombo, points: data.points_awarded });

        if (serverIsCorrect) {
          sounds.correctAnswer();
          haptics.correctAnswer();
          onCorrectAnswer?.();
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
          onWrongAnswer?.();
        }
      } else {
        // Fallback
        await syncPlayers();
      }

      // 🆕 Hide processing animation
      setIsProcessingAnswer(false);

      const isLastQuestion = currentIdx >= currentQuestions.length - 1;

      if (isLastQuestion) {
        if (isFinishingRef.current) return;
        isFinishingRef.current = true;

        setHasFinishedMyQuestions(true);
        setIsWaitingForOpponent(true);
        finishDuel(true);
      } else {
        setTimeout(() => {
          moveToNextQuestion();
        }, 1000);
      }
    } catch (error) {
      logError('[useDuelGame] Error submitting answer:', error);
      setIsProcessingAnswer(false); // 🆕 Hide on error too
      setTimeout(() => {
        if (currentIdx < currentQuestions.length - 1) {
          moveToNextQuestion();
        } else {
          finishDuel(true);
        }
      }, 1000);
    }
  }, [
    duelId,
    profileId,
    onCorrectAnswer,
    onWrongAnswer,
    finishDuel,
    moveToNextQuestion,
    setMyScore,
    setCombo,
    updateQuestion,
    setSelectedAnswer,
    setHasFinishedMyQuestions,
    setIsWaitingForOpponent,
    setIsProcessingAnswer,
    syncPlayers
  ]);

  return {
    hydrateQuestions,
    syncPlayers,
    syncQuestions,
    handleAnswer,
  };
}
