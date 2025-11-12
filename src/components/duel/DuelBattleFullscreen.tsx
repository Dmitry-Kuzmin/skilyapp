import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Flame, Shield, Users, Trophy, Swords, ChevronDown, Sparkles, Timer, HelpCircle, SkipForward, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useSafeArea } from '@/hooks/useSafeArea';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NotificationToast } from '@/components/NotificationToast';
import { DuelWaitingReplay } from './DuelWaitingReplay';
import { DuelWidget } from './DuelWidget';
import Layout from '@/components/Layout';
import { getImageUrl } from '@/utils/imageUtils';

interface DuelBattleFullscreenProps {
  duelId: string;
  onExit: () => void;
  onDuelFinished: () => void;
  onHide?: () => void;
  onWidgetExpand?: () => void;
}

export function DuelBattleFullscreen({ duelId, onExit, onDuelFinished, onHide, onWidgetExpand }: DuelBattleFullscreenProps) {
  const [isWaitingHidden, setIsWaitingHidden] = useState(false);
  const { profileId } = useUserContext();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { state } = useDuelRealtime(duelId, myPlayerId);
  
  // Initialize notifications for this duel
  useNotifications({ showToasts: true, playSounds: true });
  
  // Get safe area insets from Telegram WebApp API
  const safeArea = useSafeArea();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60000);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [translationLanguage, setTranslationLanguage] = useState<'ru' | 'en' | null>(null);
  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    icon?: string;
  }>>([]);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [hasFinishedMyQuestions, setHasFinishedMyQuestions] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [translatePopoverOpen, setTranslatePopoverOpen] = useState<string | null>(null);
  const isVerifyingRef = useRef(false);
  const hasTransitionedRef = useRef(false);
  const [myName, setMyName] = useState<string>('Ты');
  const [opponentName, setOpponentName] = useState<string>('Соперник');

  useEffect(() => {
    if (!duelId || !profileId) return;
    
    loadQuestions();
    loadScores();
    loadBoosts();
  }, [duelId, profileId]);

  // Start countdown when duel starts
  useEffect(() => {
    if (state.duelStarted && !showCountdown && questions.length > 0) {
      console.log('[DuelBattleFullscreen] Duel started, starting countdown...');
      setShowCountdown(true);
      setCountdown(3);
      
      // Перезагружаем счет после старта дуэли
      setTimeout(() => loadScores(), 500);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            return null;
          }
          if (prev === 1) {
            sounds.countdownFinish();
            setTimeout(() => {
              setShowCountdown(false);
            }, 1000);
            return 0;
          }
          sounds.countdownTick();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state.duelStarted, questions.length, showCountdown]);

  // Update notifications when opponent answers and force score refresh
  useEffect(() => {
    if (state.opponentAnswered && state.opponentAnswerData) {
      console.log('[DuelBattleFullscreen] Opponent answered:', state.opponentAnswerData);
      
      const isCorrect = state.opponentAnswerData.is_correct;
      const points = state.opponentAnswerData.points_awarded || 0;
      
      // Обновляем счет сразу после ответа соперника
      // Realtime должен обновить счет автоматически, но на всякий случай обновляем напрямую
      if (state.opponentScore !== opponentScore) {
        setOpponentScore(state.opponentScore);
      }
      
      // NOTE: Уведомления показываются через useNotifications hook
      // Не нужно дублировать toast-уведомления здесь, чтобы избежать дублирования
      // Звук также играется в useNotifications
    }
  }, [state.opponentAnswered, state.opponentAnswerData, state.opponentScore, opponentScore, opponentName]);

  // Handle duel completion - CRITICAL: Verify opponent actually finished before transitioning
  useEffect(() => {
    if (state.duelFinished && isWaitingForOpponent && !isVerifyingRef.current) {
      // Realtime hook detected finished status - VERIFY opponent actually completed before transitioning
      console.log('[DuelBattleFullscreen] Realtime detected finished status - verifying opponent completed');
      
      // Prevent multiple simultaneous verifications
      isVerifyingRef.current = true;
      
      const verifyAndTransition = async () => {
        try {
          // Get opponent's player ID
          const { data: players } = await supabase
            .from('duel_players')
            .select('id, user_id')
            .eq('duel_id', duelId);

          if (!players || players.length < 2) {
            console.log('[DuelBattleFullscreen] Not enough players, ignoring');
            return;
          }

          const opponent = players.find((p: any) => p.user_id !== profileId);
          if (!opponent) {
            console.log('[DuelBattleFullscreen] Opponent not found, ignoring');
            return;
          }

          // Get required number of questions
          const { data: duelInfo } = await supabase
            .from('duels')
            .select('num_questions')
            .eq('id', duelId)
            .single();

          const requiredAnswers = duelInfo?.num_questions || 10;

          // Count opponent's actual answers
          const { count: opponentAnswers } = await supabase
            .from('duel_answers')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', opponent.id)
            .eq('duel_id', duelId);

          console.log('[DuelBattleFullscreen] Verification:', {
            opponentAnswers: opponentAnswers || 0,
            required: requiredAnswers,
            canTransition: (opponentAnswers || 0) >= requiredAnswers
          });

          // Only transition if opponent really finished
          if ((opponentAnswers || 0) >= requiredAnswers) {
            console.log('[DuelBattleFullscreen] ✅ Opponent finished all questions, transitioning to results');
            isVerifyingRef.current = false; // Reset before transition
            sounds.victory();
            toast.success('🏁 Соперник закончил! Смотрите результаты', { duration: 3000 });
            setTimeout(() => {
              onDuelFinished();
            }, 1000);
          } else {
            console.log('[DuelBattleFullscreen] ⚠️ Status is finished but opponent hasn\'t completed - staying on waiting screen');
            // Don't transition - stay on waiting screen
            isVerifyingRef.current = false; // Reset for next check
          }
        } catch (error) {
          console.error('[DuelBattleFullscreen] Error verifying opponent completion:', error);
          // On error, don't transition - better to wait than transition prematurely
          isVerifyingRef.current = false; // Reset on error
        }
      };

      verifyAndTransition();
    }
    
    // CRITICAL BACKUP: If we're waiting for opponent and duel is finished, force transition
    // This ensures transition even if DuelWaitingReplay doesn't detect it
    if (state.duelFinished && isWaitingForOpponent && hasFinishedMyQuestions) {
      console.log('[DuelBattleFullscreen] 🔥 BACKUP: Duel finished while waiting - forcing transition after delay');
      // Give DuelWaitingReplay time to handle it, but force transition if it doesn't
      const backupTimer = setTimeout(() => {
        console.log('[DuelBattleFullscreen] 🚀 BACKUP: Forcing transition to results');
        onDuelFinished();
      }, 2000); // 2 second delay - if DuelWaitingReplay didn't transition, we force it
      
      return () => clearTimeout(backupTimer);
    }
  }, [state.duelFinished, isWaitingForOpponent, hasFinishedMyQuestions, onDuelFinished, duelId, profileId]);

  // КРИТИЧНО: Периодическая проверка статуса дуэли когда ожидаем соперника
  // Это гарантирует переход к результатам даже если realtime не сработал
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions || !duelId || !profileId) {
      return;
    }

    // Сбрасываем флаг при монтировании
    hasTransitionedRef.current = false;

    console.log('[DuelBattleFullscreen] 🔄 Starting periodic duel status check while waiting for opponent');

    const checkDuelStatusPeriodically = async () => {
      // Предотвращаем множественные переходы
      if (hasTransitionedRef.current) {
        return;
      }

      try {
        // Проверяем статус дуэли напрямую из базы данных
        const { data: duel, error } = await supabase
          .from('duels')
          .select('status, num_questions')
          .eq('id', duelId)
          .single();

        if (error) {
          console.error('[DuelBattleFullscreen] Error checking duel status:', error);
          return;
        }

        // Если дуэль завершена, проверяем что соперник действительно закончил
        if (duel?.status === 'finished') {
          console.log('[DuelBattleFullscreen] ✅ Duel status is finished, verifying opponent completed');

          // Получаем игроков
          const { data: players } = await supabase
            .from('duel_players')
            .select('id, user_id')
            .eq('duel_id', duelId);

          if (!players || players.length < 2) {
            return;
          }

          const opponent = players.find((p: any) => p.user_id !== profileId);
          if (!opponent) {
            return;
          }

          // Проверяем количество ответов соперника
          const { count: opponentAnswers } = await supabase
            .from('duel_answers')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', opponent.id)
            .eq('duel_id', duelId);

          const requiredAnswers = duel.num_questions || 10;
          const opponentFinished = (opponentAnswers || 0) >= requiredAnswers;

          console.log('[DuelBattleFullscreen] Periodic check:', {
            duelStatus: duel.status,
            opponentAnswers: opponentAnswers || 0,
            required: requiredAnswers,
            opponentFinished
          });

          if (opponentFinished && !hasTransitionedRef.current) {
            console.log('[DuelBattleFullscreen] ✅✅✅ PERIODIC CHECK: Opponent finished! Transitioning to results');
            hasTransitionedRef.current = true; // Помечаем что переход уже произошел
            
            try {
              if (sounds?.victory) {
                sounds.victory();
              }
            } catch (soundError) {
              console.warn('[DuelBattleFullscreen] Error playing victory sound:', soundError);
            }
            
            toast.success('🏁 Дуэль завершена!', { duration: 2000 });
            // Вызываем onDuelFinished немедленно
            onDuelFinished();
          }
        }
      } catch (error) {
        console.error('[DuelBattleFullscreen] Error in periodic status check:', error);
      }
    };

    // Проверяем сразу при монтировании
    checkDuelStatusPeriodically();

    // Затем проверяем каждые 1.5 секунды
    const interval = setInterval(() => {
      checkDuelStatusPeriodically();
    }, 1500);

    return () => {
      clearInterval(interval);
      hasTransitionedRef.current = false; // Сбрасываем при размонтировании
      console.log('[DuelBattleFullscreen] Stopped periodic duel status check');
    };
  }, [isWaitingForOpponent, hasFinishedMyQuestions, duelId, profileId, onDuelFinished]);

  // Sync opponent score from realtime - основной способ обновления счета
  useEffect(() => {
    if (typeof state.opponentScore === 'number' && state.opponentScore >= 0 && state.opponentScore !== opponentScore) {
      console.log('[DuelBattleFullscreen] ✅ Updating opponent score from realtime:', state.opponentScore, '(was:', opponentScore, ')');
      setOpponentScore(state.opponentScore);
    }
  }, [state.opponentScore, opponentScore]);

  // Sync my score from realtime
  useEffect(() => {
    // Обновляем только если новое значение является валидным числом
    if (typeof state.myScore === 'number' && state.myScore >= 0) {
      setMyScore(prev => {
        // Если счет меняется
        if (prev !== state.myScore) {
          // Если текущий счет больше 0, а новое значение 0 - это подозрительно
          // Но обновляем, так как realtime - это источник истины
          if (prev > 0 && state.myScore === 0) {
            console.warn('[DuelBattleFullscreen] ⚠️ Score reset to 0 via realtime (was:', prev, ', new:', state.myScore, ')');
          } else if (prev !== state.myScore) {
            console.log('[DuelBattleFullscreen] ✅ Updating my score from realtime:', state.myScore, '(was:', prev, ')');
          }
          return state.myScore;
        }
        return prev;
      });
    }
  }, [state.myScore]);

  // Periodic score refresh as fallback (every 3 seconds) - только во время активной игры
  useEffect(() => {
    if (!duelId || !profileId || hasFinishedMyQuestions) return;
    if (!state.duelStarted) return; // Запускаем только когда дуэль началась
    
    console.log('[DuelBattleFullscreen] 🔄 Starting periodic score refresh');
    
    const interval = setInterval(async () => {
      try {
        // Используем Edge Function для загрузки игроков
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'get_players',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (edgeError) {
          // Fallback к прямому запросу
          const { data, error } = await supabase
            .from('duel_players')
            .select('id, user_id, score, correct_count')
            .eq('duel_id', duelId);
          
          if (error || !data || data.length < 2) return;
          
          const myPlayer = data.find(p => p.user_id === profileId);
          const opponent = data.find(p => p.user_id !== profileId);
          
          if (myPlayer?.id && !myPlayerId) {
            setMyPlayerId(myPlayer.id);
          }
          if (myPlayer && typeof myPlayer.score === 'number') {
            setMyScore(myPlayer.score);
          }
          if (opponent && typeof opponent.score === 'number') {
            setOpponentScore(opponent.score);
          }
          return;
        }

        const players = edgeData?.players || [];
        if (players.length >= 2) {
          const myPlayer = players.find((p: any) => p.user_id === profileId);
          const opponent = players.find((p: any) => p.user_id !== profileId);
          
          if (myPlayer?.id && !myPlayerId) {
            setMyPlayerId(myPlayer.id);
          }
          if (myPlayer && typeof myPlayer.score === 'number') {
            setMyScore(myPlayer.score);
          }
          if (opponent && typeof opponent.score === 'number') {
            setOpponentScore(opponent.score);
          }
          if (myPlayer?.name) {
            setMyName(myPlayer.name);
          }
          if (opponent?.name) {
            setOpponentName(opponent.name);
          }
        }
      } catch (error) {
        // Игнорируем ошибки в периодическом обновлении
      }
    }, 3000); // Проверяем каждые 3 секунды
    
    return () => {
      console.log('[DuelBattleFullscreen] 🛑 Stopping periodic score refresh');
      clearInterval(interval);
    };
  }, [duelId, profileId, hasFinishedMyQuestions, state.duelStarted, myPlayerId]);

  // Загружаем данные игроков при монтировании (с задержкой, чтобы игроки успели создаться)
  useEffect(() => {
    console.log('[DuelBattleFullscreen] 🔄 useEffect: Loading scores on mount', { profileId, duelId });
    if (profileId && duelId) {
      // Даем время на создание игроков в базе
      const timer = setTimeout(() => {
        loadScores();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [duelId, profileId]);

  // Перезагружаем когда дуэль началась (игроки должны быть точно созданы)
  useEffect(() => {
    if (state.duelStarted && duelId && profileId) {
      console.log('[DuelBattleFullscreen] 🔄 useEffect: Duel started, reloading scores', { myPlayerId });
      // Увеличиваем задержку, чтобы гарантировать что игроки созданы
      const timer = setTimeout(() => {
        loadScores();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.duelStarted, duelId, profileId]);

  // Timer countdown
  useEffect(() => {
    if (isAnswered || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 100);
        if (newTime === 0) handleTimeout();
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswered]);

  // Reset translation when moving to next question
  useEffect(() => {
    setTranslationLanguage(null);
  }, [currentIndex]);

  const loadQuestions = async () => {
    if (!duelId || !profileId) {
      console.warn('[DuelBattleFullscreen] ⚠️ Cannot load questions: missing duelId or profileId', { duelId, profileId });
      return;
    }

    try {
      setLoading(true);
      console.log('[DuelBattleFullscreen] 🔄 Loading questions for duel:', duelId, 'profile:', profileId);
      
      // Retry логика с экспоненциальной задержкой
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Увеличиваем таймаут для каждого запроса (30 секунд)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Edge Function не ответил за 30 секунд')), 30000);
          });

          const invokePromise = supabase.functions.invoke('duel-manager', {
            body: { action: 'get_questions', duel_id: duelId, profile_id: profileId },
          });

          const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

          console.log(`[DuelBattleFullscreen] Questions response (attempt ${attempt + 1}):`, { 
            hasData: !!data, 
            hasError: !!error,
            questionsCount: data?.questions?.length,
            error: error?.message 
          });

          if (error) {
            lastError = error;
            // Если это не последняя попытка, ждем перед повтором
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Экспоненциальная задержка: 1s, 2s, 4s (макс 5s)
              console.log(`[DuelBattleFullscreen] ⏳ Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }
          
          if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            console.log('[DuelBattleFullscreen] ✅ Loaded questions:', data.questions.length);
            console.log('[DuelBattleFullscreen] First question sample:', {
              id: data.questions[0]?.id,
              hasSnapshot: !!data.questions[0]?.question_snapshot,
              position: data.questions[0]?.position
            });
            setQuestions(data.questions);
            return; // Успешно загружено
          } else {
            console.error('[DuelBattleFullscreen] ❌ Invalid questions data:', {
              hasData: !!data,
              questionsType: typeof data?.questions,
              questionsIsArray: Array.isArray(data?.questions),
              questionsLength: data?.questions?.length,
              fullData: data
            });
            // Пробуем fallback
            break;
          }
        } catch (attemptError: any) {
          lastError = attemptError;
          console.warn(`[DuelBattleFullscreen] ⚠️ Attempt ${attempt + 1} failed:`, attemptError?.message);
          
          // Если это не последняя попытка, ждем перед повтором
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`[DuelBattleFullscreen] ⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Если все попытки не удались, пробуем fallback
      console.log('[DuelBattleFullscreen] 🔄 All retries failed, trying direct database query...');
      await loadQuestionsDirect();
      
    } catch (error: any) {
      console.error('[DuelBattleFullscreen] ❌ Exception loading questions:', error);
      console.error('[DuelBattleFullscreen] Error details:', JSON.stringify(error, null, 2));
      
      // Последняя попытка - прямой запрос
      try {
        await loadQuestionsDirect();
      } catch (fallbackError) {
        console.error('[DuelBattleFullscreen] ❌ Fallback also failed:', fallbackError);
        toast.error(`Ошибка загрузки вопросов: ${error?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback функция для прямого запроса к базе
  const loadQuestionsDirect = async () => {
    try {
      console.log('[DuelBattleFullscreen] 🔄 Loading questions directly from database...');
      
      const { data, error } = await supabase
        .from('duel_questions')
        .select('*')
        .eq('duel_id', duelId)
        .order('position');

      if (error) {
        console.error('[DuelBattleFullscreen] ❌ Error loading questions directly:', error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        console.log('[DuelBattleFullscreen] ✅ Loaded questions directly:', data.length);
        setQuestions(data);
      } else {
        console.error('[DuelBattleFullscreen] ❌ No questions found in database');
        toast.error('Вопросы не найдены. Попробуйте перезагрузить страницу.');
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] ❌ Exception in loadQuestionsDirect:', error);
      throw error;
    }
  };

  const loadScores = async () => {
    if (!duelId || !profileId) {
      console.warn('[DuelBattleFullscreen] ⚠️ Cannot load scores: missing duelId or profileId', { duelId, profileId });
      return;
    }

    console.log('[DuelBattleFullscreen] 🔄 Loading scores for duel:', duelId, 'profile:', profileId);

    try {
      // Используем Edge Function для загрузки игроков (обходит RLS и проблемы с транзакциями)
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'get_players',
          duel_id: duelId,
          profile_id: profileId
        }
      });

      if (edgeError) {
        console.error('[DuelBattleFullscreen] ❌ Error loading players via Edge Function:', edgeError);
        // Fallback к прямому запросу
        return await loadScoresDirect();
      }

      const players = edgeData?.players || [];
      console.log('[DuelBattleFullscreen] 📊 Players data received from Edge Function:', {
        count: players.length,
        players: players.map((p: any) => ({ id: p.id, user_id: p.user_id, score: p.score, name: p.name }))
      });

      if (players.length >= 2) {
        const myPlayer = players.find((p: any) => p.user_id === profileId);
        const opponent = players.find((p: any) => p.user_id !== profileId);
        
        console.log('[DuelBattleFullscreen] 🔍 Found players:', {
          myPlayer: myPlayer ? { id: myPlayer.id, score: myPlayer.score, name: myPlayer.name } : null,
          opponent: opponent ? { id: opponent.id, score: opponent.score, name: opponent.name } : null
        });
        
        // КРИТИЧНО: устанавливаем myPlayerId СРАЗУ
        if (myPlayer?.id) {
          console.log('[DuelBattleFullscreen] ✅ Setting myPlayerId:', myPlayer.id);
          setMyPlayerId(myPlayer.id);
        }
        
        // КРИТИЧНО: устанавливаем счета СРАЗУ
        if (typeof myPlayer?.score === 'number') {
          console.log('[DuelBattleFullscreen] ✅ Setting my score:', myPlayer.score);
          setMyScore(myPlayer.score);
        } else {
          setMyScore(0);
        }
        
        if (typeof opponent?.score === 'number') {
          console.log('[DuelBattleFullscreen] ✅ Setting opponent score:', opponent.score);
          setOpponentScore(opponent.score);
        } else {
          setOpponentScore(0);
        }
        
        // Устанавливаем имена игроков
        if (myPlayer?.name) {
          console.log('[DuelBattleFullscreen] Setting my name:', myPlayer.name);
          setMyName(myPlayer.name);
        } else {
          console.warn('[DuelBattleFullscreen] No name for my player:', myPlayer);
        }
        if (opponent?.name) {
          console.log('[DuelBattleFullscreen] Setting opponent name:', opponent.name);
          setOpponentName(opponent.name);
        } else {
          console.warn('[DuelBattleFullscreen] No name for opponent:', opponent);
          // Попробуем установить имя даже если оно "Игрок" - может быть это реальное имя
          if (opponent) {
            setOpponentName('Соперник');
          }
        }
      } else if (players.length === 1) {
        // Только один игрок
        const player = players[0];
        if (player.user_id === profileId && player.id) {
          setMyPlayerId(player.id);
          setMyScore(typeof player.score === 'number' ? player.score : 0);
          if (player.name) {
            setMyName(player.name);
          }
        }
      } else {
        // Нет игроков - повторяем попытку
        console.warn('[DuelBattleFullscreen] ⚠️ No players found! Will retry...');
        if (state.duelStarted) {
          setTimeout(() => {
            console.log('[DuelBattleFullscreen] 🔄 Retrying loadScores after no players found...');
            loadScores();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] ❌ Exception loading scores:', error);
      // Fallback к прямому запросу
      await loadScoresDirect();
    }
  };

  // Fallback функция для прямого запроса к базе
  const loadScoresDirect = async () => {
    try {
      const { data, error } = await supabase
        .from('duel_players')
        .select('id, user_id, score, correct_count')
        .eq('duel_id', duelId);

      if (error) {
        console.error('[DuelBattleFullscreen] ❌ Error loading scores directly:', error);
        return;
      }

      if (data && data.length >= 2) {
        const myPlayer = data.find(p => p.user_id === profileId);
        const opponent = data.find(p => p.user_id !== profileId);
        
        if (myPlayer?.id) {
          setMyPlayerId(myPlayer.id);
          setMyScore(myPlayer?.score || 0);
        }
        
        if (opponent) {
          setOpponentScore(opponent.score || 0);
        }
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] ❌ Exception in loadScoresDirect:', error);
    }
  };


  const loadBoosts = async () => {
    try {
      const { data, error } = await supabase
        .from('boost_inventory')
        .select('boost_type, quantity')
        .eq('user_id', profileId)
        .gt('quantity', 0);

      if (error) {
        console.error('Error loading boosts:', error);
        return;
      }

      if (data) setBoosts(data);
    } catch (error) {
      console.error('Exception loading boosts:', error);
    }
  };

  const handleBoostUse = async (boostType: string, language?: 'ru' | 'en') => {
    // КРИТИЧЕСКИ ВАЖНО: разблокируем AudioContext при первом использовании буста
    // Это гарантирует, что звуки будут работать в Telegram WebApp
    if (!sounds.isUnlocked()) {
      console.log('[DuelBattleFullscreen] 🔓 Разблокировка AudioContext при использовании буста');
      sounds.forceUnlock();
    }
    
    if (usedBoosts.includes(boostType) || isAnswered) return;
    
    const boost = boosts.find(b => b.boost_type === boostType);
    if (!boost || boost.quantity <= 0) return;

    setUsedBoosts(prev => [...prev, boostType]);

    try {
      if (boostType === 'fifty_fifty') {
        sounds.boostFiftyFifty();
        const question = questions[currentIndex];
        const incorrectOptions = (question.question_snapshot.answer_options || [])
          .filter((opt: any) => !question.correct_option_ids.includes(opt.id))
          .map((opt: any) => opt.id);
        
        const toEliminate = incorrectOptions.slice(0, 2);
        setEliminatedOptions(toEliminate);
      } else if (boostType === 'time_extend') {
        sounds.boostTimeExtend();
        // CRITICAL: Add +30s as specified in requirements, not +15s
        setTimeLeft(prev => Math.min(prev + 30000, 60000));
      } else if (boostType === 'hint') {
        sounds.boostHint();
        toast.info('💡 Подсказка: обратите внимание на детали!');
      } else if (boostType === 'skip') {
        sounds.boostSkip();
        setIsAnswered(true);
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsAnswered(false);
            setSelectedAnswer(null);
            setTimeLeft(60000);
            setUsedBoosts([]);
            setEliminatedOptions([]);
            setTranslationLanguage(null); // Сбрасываем перевод при переходе к следующему вопросу
          } else {
            finishDuel();
          }
        }, 500);
      } else if (boostType === 'translate' && language) {
        sounds.boostHint(); // Используем звук подсказки для перевода
        setTranslationLanguage(language);
        const langName = language === 'ru' ? 'русский' : 'английский';
        toast.success(`🌐 Перевод на ${langName} применён!`, { duration: 3000 });
      }

      // Проверяем, что вопросы загружены и текущий вопрос существует
      if (!questions || questions.length === 0 || !questions[currentIndex]) {
        console.error('[DuelBattleFullscreen] Cannot use boost: questions not loaded or invalid currentIndex');
        toast.error('Вопросы не загружены');
        return;
      }

      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: questions[currentIndex].id,
          boost_type: boostType,
          language: language, // Для translate бустера
        },
      });

      await loadBoosts();
    } catch (error) {
      console.error('Error using boost:', error);
    }
  };

  const handleAnswer = async (optionId: string) => {
    // КРИТИЧЕСКИ ВАЖНО: разблокируем AudioContext при первом клике в игре
    // Это гарантирует, что звуки будут работать в Telegram WebApp
    if (!sounds.isUnlocked()) {
      console.log('[DuelBattleFullscreen] 🔓 Разблокировка AudioContext при первом ответе');
      sounds.forceUnlock();
    }
    if (isAnswered) return;
    
    // Проверяем, что вопросы загружены и текущий вопрос существует
    if (!questions || questions.length === 0 || !questions[currentIndex]) {
      console.error('[DuelBattleFullscreen] Cannot handle answer: questions not loaded or invalid currentIndex');
      toast.error('Вопросы не загружены');
      return;
    }

    setSelectedAnswer(optionId);
    setIsAnswered(true);

    const question = questions[currentIndex];
    const isCorrect = question.correct_option_ids.includes(optionId);

    try {
      // Retry логика с экспоненциальной задержкой для submit_answer
      const maxRetries = 3;
      let data: any = null;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Таймаут 20 секунд на запрос (меньше чем для загрузки вопросов, т.к. это критично)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Edge Function не ответил за 20 секунд')), 20000);
          });

          const invokePromise = supabase.functions.invoke('duel-manager', {
            body: {
              action: 'submit_answer',
              duel_id: duelId,
              profile_id: profileId,
              duel_question_id: question.id,
              selected_option_id: optionId,
              time_taken_ms: 60000 - timeLeft,
            },
          });

          const result = await Promise.race([invokePromise, timeoutPromise]) as any;
          const { data: resultData, error: resultError } = result;

          if (resultError) {
            lastError = resultError;
            console.warn(`[DuelBattleFullscreen] ⚠️ Submit answer attempt ${attempt + 1} failed:`, resultError?.message);
            
            // Если это не последняя попытка, ждем перед повтором
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Экспоненциальная задержка: 1s, 2s, 4s (макс 5s)
              console.log(`[DuelBattleFullscreen] ⏳ Retrying submit_answer in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw resultError;
          }

          // Успешно получили ответ
          data = resultData;
          console.log(`[DuelBattleFullscreen] ✅ Submit answer successful (attempt ${attempt + 1})`);
          break; // Выходим из цикла retry
          
        } catch (attemptError: any) {
          lastError = attemptError;
          console.warn(`[DuelBattleFullscreen] ⚠️ Submit answer attempt ${attempt + 1} exception:`, attemptError?.message);
          
          // Если это не последняя попытка, ждем перед повтором
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`[DuelBattleFullscreen] ⏳ Retrying submit_answer in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Все попытки не удались - показываем ошибку, но продолжаем игру
            console.error('[DuelBattleFullscreen] ❌ All submit_answer attempts failed, continuing anyway');
            toast.error('Не удалось сохранить ответ, но игра продолжается');
            // Продолжаем выполнение без данных от сервера
            data = null;
          }
        }
      }

      if (lastError && !data) {
        // Если все попытки не удались, продолжаем игру без обновления счета
        console.warn('[DuelBattleFullscreen] ⚠️ Continuing without server response');
      }

      // ============================================================================
      // CRITICAL: USE SERVER SCORE AND COMBO - CLIENT NEVER CALCULATES
      // ============================================================================
      if (data && data.new_score !== undefined) {
        setMyScore(data.new_score);
        
        // CRITICAL: Always use server-provided combo value, even if it's 0
        // Server returns 0 when answer is incorrect or skipped - this resets combo
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        
        // ALWAYS update combo from server - this ensures correct combo after wrong answer
        // Server logic: wrong answer = combo 0, correct answer = combo increases
        setCombo(serverCombo);
        
        console.log('[DuelBattleFullscreen] Combo updated from server:', {
          oldCombo: combo,
          newCombo: serverCombo,
          isCorrect,
          expectedBehavior: isCorrect ? `Combo should be ${combo + 1}` : 'Combo should be 0'
        });
        
        console.log('[DuelBattleFullscreen] Server response:', {
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
            console.warn('[DuelBattleFullscreen] Warning: Server returned non-zero combo for incorrect answer:', serverCombo);
          }
        }
      } else {
        // Fallback: reload from DB if server doesn't return score
        await loadScores();
      }

      // Всегда переходим к следующему вопросу, даже если сервер не ответил
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
          setUsedBoosts([]);
          setEliminatedOptions([]);
        } else {
          finishDuel();
        }
      }, 1500);
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error submitting answer:', error);
      // Даже при ошибке продолжаем игру
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
          setUsedBoosts([]);
          setEliminatedOptions([]);
        } else {
          finishDuel();
        }
      }, 1500);
    }
  };

  const handleTimeout = async () => {
    if (isAnswered) return;
    
    // Проверяем, что вопросы загружены и текущий вопрос существует
    if (!questions || questions.length === 0 || !questions[currentIndex]) {
      console.error('[DuelBattleFullscreen] Cannot handle timeout: questions not loaded or invalid currentIndex');
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
              console.log(`[DuelBattleFullscreen] ⏳ Retrying timeout submit in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw resultError;
          }

          data = resultData;
          console.log(`[DuelBattleFullscreen] ✅ Timeout submit successful (attempt ${attempt + 1})`);
          break;
        } catch (attemptError: any) {
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.warn('[DuelBattleFullscreen] ⚠️ Timeout submit failed, continuing anyway');
            data = null;
          }
        }
      }

      // Update score and combo from server (combo should be 0 for timeout)
      if (data) {
        if (data.new_score !== undefined) {
          setMyScore(data.new_score);
        }
        // CRITICAL: Always set combo from server, even if 0 (timeout resets combo)
        const serverCombo = data.combo !== undefined ? data.combo : 0;
        setCombo(serverCombo);
        console.log('[DuelBattleFullscreen] Timeout - Server combo:', serverCombo);
      }
      
      // Всегда переходим к следующему вопросу, даже если сервер не ответил
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
          setUsedBoosts([]);
          setEliminatedOptions([]);
        } else {
          finishDuel();
        }
      }, 1500);
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error on timeout:', error);
      // Даже при ошибке продолжаем игру
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setTimeLeft(60000);
          setUsedBoosts([]);
          setEliminatedOptions([]);
        } else {
          finishDuel();
        }
      }, 1500);
    }
  };

  const finishDuel = async () => {
    console.log('[DuelBattleFullscreen] Finishing duel - I completed all questions');
    
    // Mark that I finished (but don't show waiting screen yet)
    setHasFinishedMyQuestions(true);
    
    // Small delay to ensure last answer is saved in DB
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Mark that I finished
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'finish_duel', duel_id: duelId, profile_id: profileId },
      });

      if (error) throw error;

      console.log('[DuelBattleFullscreen] Finish duel response:', data);

      // Server returns finished: true if both players finished, false if waiting
      // CRITICAL: If server says finished=true, go directly to results WITHOUT showing waiting screen
      if (data?.finished === true) {
        // Server confirmed both players finished - go to results IMMEDIATELY
        console.log('[DuelBattleFullscreen] ✅ Server confirmed both players finished, going directly to results');
        sounds.victory();
        toast.success('🏁 Дуэль завершена!', { duration: 2000 });
        // Go to results immediately - no waiting screen
        setTimeout(() => {
          onDuelFinished();
        }, 500);
      } else {
        // Wait for opponent - show waiting screen ONLY if server says waiting
        console.log('[DuelBattleFullscreen] Waiting for opponent to finish - showing waiting screen');
        setIsWaitingForOpponent(true);
        toast.info('⏳ Ты закончил первым! Ожидание соперника...', { duration: 4000 });
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error finishing duel:', error);
      toast.error('Ошибка завершения дуэли');
      // Reset waiting state on error
      setIsWaitingForOpponent(false);
    }
  };

  // ============================================================================
  // CRITICAL: WAITING FOR OPPONENT - LIVE REPLAY
  // ============================================================================
  // Show live replay screen when I finish first
  // Display opponent's progress in real-time
  // If hidden, DuelWaitingReplay will show widget via portal and return null
  // ============================================================================
  if (isWaitingForOpponent) {
    return (
      <DuelWaitingReplay
        duelId={duelId}
        myScore={myScore}
        totalQuestions={questions.length}
        onDuelFinished={onDuelFinished}
        onExpand={() => {
          // When widget expands, restore battle view
          setIsWaitingHidden(false);
          // Notify parent to restore battle mode
          if (onWidgetExpand) {
            onWidgetExpand();
          }
        }}
        onHide={(hidden) => {
          setIsWaitingHidden(hidden);
          if (hidden) {
            // Notify parent that game is hidden - parent will show menu
            if (onHide) {
              onHide();
            }
          } else {
            // Game is expanded again - reset state
            setIsWaitingHidden(false);
          }
        }}
      />
    );
  }

  // If waiting is hidden but we're not waiting for opponent (shouldn't happen)
  // Return null so parent can show menu
  if (isWaitingHidden) {
    return null;
  }

  if (loading || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Загрузка вопросов...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    console.error('[DuelBattleFullscreen] Invalid question data:', currentQuestion);
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <p className="text-lg text-destructive">Ошибка загрузки вопроса</p>
          <Button onClick={onExit}>Выйти</Button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Вычисляем общий верхний отступ: системный safe area + отступ от нативной панели Telegram
  // ПОЛНЫЕ ОТСТУПЫ для игры дуэль (увеличены по просьбе пользователя)
  // + дополнительный отступ для встроенной навигации Telegram (кнопки Назад, три точки, стрелка)
  const TELEGRAM_NAV_HEIGHT = 48; // Высота встроенной навигации Telegram WebApp
  const telegramNavPadding = safeArea.platform === 'telegram' ? TELEGRAM_NAV_HEIGHT : 0;
  
  const totalTopPadding = Math.round(safeArea.top + safeArea.contentTop + telegramNavPadding);
  const totalBottomPadding = Math.round(safeArea.bottom + safeArea.contentBottom);
  const totalLeftPadding = Math.round(safeArea.left);
  const totalRightPadding = Math.round(safeArea.right);

  // Логирование для отладки (отключено для уменьшения шума в консоли)
  // Раскомментируйте для отладки safe area:
  // console.log('[DuelBattleFullscreen] 🎮 Safe area values:', {
  //   platform: safeArea.platform,
  //   safeAreaTop: `${safeArea.top}px`,
  //   safeAreaContentTop: `${safeArea.contentTop}px (уменьшено в 2 раза)`,
  //   totalTopPadding: `${totalTopPadding}px (итоговый отступ)`,
  //   safeAreaLeft: `${safeArea.left}px`,
  //   safeAreaRight: `${safeArea.right}px`,
  //   totalLeftPadding: `${totalLeftPadding}px`,
  //   totalRightPadding: `${totalRightPadding}px`,
  //   willApplyPadding: totalTopPadding > 0,
  // });

  // Показываем countdown overlay если он активен
  if (showCountdown && countdown !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-8">
          {countdown > 0 ? (
            <>
              <motion.div 
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-9xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse"
              >
                {countdown}
              </motion.div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl text-muted-foreground"
              >
                Приготовьтесь к битве!
              </motion.div>
            </>
          ) : (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-4 animate-fade-in"
            >
              <div className="text-8xl animate-bounce">⚔️</div>
              <div className="text-6xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                START!
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 z-50 overflow-y-auto" 
      style={{
        paddingTop: `${totalTopPadding}px`,
        paddingLeft: `${totalLeftPadding}px`,
        paddingRight: `${totalRightPadding}px`,
        paddingBottom: `${totalBottomPadding}px`
      }}
    >
      {/* Toast Notifications */}
      {/* Учитываем отступы для Telegram WebApp */}
      <div 
        className="fixed z-50 space-y-2 max-w-sm"
        style={{
          top: `${totalTopPadding + 16}px`,
          right: `${totalRightPadding + 16}px`
        }}
      >
        <AnimatePresence mode="popLayout">
          {toastNotifications.map((notif) => (
            <NotificationToast
              key={notif.id}
              {...notif}
              onClose={() => setToastNotifications(prev => prev.filter(n => n.id !== notif.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress Bar - Duolingo Style */}
      {/* Учитываем отступы для Telegram WebApp */}
      <div 
        className="absolute left-0 right-0 h-1.5 bg-border"
        style={{
          top: `${totalTopPadding}px`,
          left: `${totalLeftPadding}px`,
          right: `${totalRightPadding}px`
        }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-400 shadow-lg shadow-green-500/50"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Exit Button - Top Left Corner - Скрыта на мобилке и в Telegram (есть встроенная кнопка Назад) */}
      {safeArea?.platform !== 'ios' && safeArea?.platform !== 'android' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="absolute z-10 rounded-full w-9 h-9 bg-card/80 backdrop-blur-sm hover:bg-card"
          style={{
            top: `${totalTopPadding + 8}px`,
            left: `${totalLeftPadding + 8}px`
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Main Content */}
      {/* Используем единую систему отступов через CSS переменные */}
      <div className="min-h-full flex flex-col p-3 md:p-4 pb-6 max-w-4xl mx-auto">
        {/* Header - Scores & Timer - Premium Design */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          {/* Scores - Enhanced - Центрированы в Telegram */}
          <div className={`flex items-center gap-3 md:gap-5 ${safeArea?.platform === 'telegram' ? 'flex-1 justify-center' : ''}`}>
            {/* My Score */}
            <motion.div 
              className="flex items-center gap-2 md:gap-3 group"
              whileHover={{ scale: 1.02 }}
              animate={myScore > opponentScore ? { 
                boxShadow: ['0 0 0px rgba(59, 130, 246, 0)', '0 0 20px rgba(59, 130, 246, 0.5)', '0 0 0px rgba(59, 130, 246, 0)']
              } : {}}
            >
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                {myScore > opponentScore && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{myName}</p>
                <motion.div 
                  key={myScore}
                  className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                  initial={{ scale: 1.2, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {myScore}
                </motion.div>
              </div>
            </motion.div>
            
            <div className="text-xl md:text-2xl font-bold text-muted-foreground/30 px-2">VS</div>
            
            {/* Opponent Score */}
            <motion.div 
              className="flex items-center gap-2 md:gap-3 group"
              whileHover={{ scale: 1.02 }}
              animate={state.opponentAnswered ? { scale: [1, 1.05, 1] } : {}}
            >
              <div>
                <p 
                  className="text-xs font-medium text-muted-foreground mb-0.5 text-right truncate max-w-[120px] ml-auto" 
                  title={opponentName}
                  key={`opponent-name-${opponentName}`}
                >
                  {opponentName || 'Соперник'}
                </p>
                <motion.div 
                  key={opponentScore}
                  className="text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent text-right"
                  initial={{ scale: 1.2, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {opponentScore}
                </motion.div>
              </div>
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                  <Swords className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                {opponentScore > myScore && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                {state.opponentAnswered && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Timer & Combo */}
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {combo > 1 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="relative"
                >
                  <Badge className="gradient-fire border-none text-white px-2 py-1 text-sm font-bold shadow-lg shadow-orange-500/50">
                    <Flame className="w-3 h-3 mr-1 animate-pulse" />
                    x{combo}
                  </Badge>
                  {/* Fire particles effect */}
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 0],
                      opacity: [1, 0.5, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div 
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full bg-muted/80 backdrop-blur-sm border border-border"
              animate={{ 
                scale: timeLeft < 10000 ? [1, 1.05, 1] : 1,
                borderColor: timeLeft < 10000 ? ['hsl(var(--border))', 'hsl(var(--destructive))', 'hsl(var(--border))'] : 'hsl(var(--border))'
              }}
              transition={{ duration: 0.5, repeat: timeLeft < 10000 ? Infinity : 0 }}
            >
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className={`font-mono font-bold text-xs md:text-sm ${timeLeft < 10000 ? 'text-destructive' : ''}`}>
                {Math.ceil(timeLeft / 1000)}s
              </span>
            </motion.div>
          </div>
        </div>

        {/* Question Progress */}
        <div className="text-center mb-3 md:mb-4">
          <p className="text-xs md:text-sm font-medium text-muted-foreground">
            Вопрос <span className="text-primary font-bold">{currentIndex + 1}</span> из {questions.length}
          </p>
        </div>

        {/* Boosts Section - Duolingo Style */}
        {boosts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex flex-wrap gap-2 justify-center"
          >
            {boosts.map((boost) => {
              const boostConfig = {
                fifty_fifty: { icon: Sparkles, label: '50/50', gradient: 'from-yellow-400 to-orange-500' },
                time_extend: { icon: Timer, label: '+30s', gradient: 'from-blue-400 to-cyan-500' },
                hint: { icon: HelpCircle, label: 'Hint', gradient: 'from-orange-400 to-amber-500' },
                skip: { icon: SkipForward, label: 'Skip', gradient: 'from-purple-400 to-pink-500' },
                translate: { icon: Globe, label: 'Translate', gradient: 'from-green-400 to-emerald-500' },
              }[boost.boost_type] || { icon: Zap, label: boost.boost_type, gradient: 'from-gray-500 to-gray-600' };
              
              const BoostIcon = boostConfig.icon;

              const isUsed = usedBoosts.includes(boost.boost_type);
              const isDisabled = isUsed || isAnswered || boost.quantity <= 0;

              // Для translate бустера показываем развернутую версию с выбором языка
              if (boost.boost_type === 'translate' && translatePopoverOpen === boost.boost_type && !isDisabled) {
                return (
                  <motion.div
                    key={boost.boost_type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex items-center gap-1"
                  >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => {
                          handleBoostUse(boost.boost_type, 'ru');
                          setTranslatePopoverOpen(null);
                        }}
                        variant="outline"
                        size="sm"
                        className="relative h-9 px-3 flex items-center gap-1.5 border transition-all duration-300 bg-gradient-to-br from-red-500 to-red-600 text-white border-white/20 hover:border-white/50 shadow-md hover:shadow-lg"
                      >
                        <span className="text-sm">🇷🇺</span>
                        <span className="text-xs font-bold">RU</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => {
                          handleBoostUse(boost.boost_type, 'en');
                          setTranslatePopoverOpen(null);
                        }}
                        variant="outline"
                        size="sm"
                        className="relative h-9 px-3 flex items-center gap-1.5 border transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-white/20 hover:border-white/50 shadow-md hover:shadow-lg"
                      >
                        <span className="text-sm">🇬🇧</span>
                        <span className="text-xs font-bold">EN</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setTranslatePopoverOpen(null)}
                        variant="outline"
                        size="sm"
                        className="relative h-9 w-9 p-0 flex items-center justify-center border transition-all duration-300 bg-muted/50 hover:bg-muted border-border"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                );
              }

              return (
                <motion.button
                  key={boost.boost_type}
                  onClick={() => {
                    if (boost.boost_type === 'translate') {
                      setTranslatePopoverOpen(boost.boost_type);
                    } else {
                      handleBoostUse(boost.boost_type);
                    }
                  }}
                  disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.05 } : {}}
                  whileTap={!isDisabled ? { scale: 0.95 } : {}}
                  className={`relative h-9 px-2.5 flex items-center gap-1.5 rounded-lg font-bold text-sm transition-all shadow-md border border-white/20 ${
                    isDisabled
                      ? 'bg-muted/50 border-border/30 opacity-50 cursor-not-allowed'
                      : `bg-gradient-to-br ${boostConfig.gradient} text-white hover:shadow-lg hover:scale-105 active:scale-95`
                  }`}
                >
                  <BoostIcon className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-bold">{boostConfig.label}</span>
                  {boost.boost_type === 'translate' && !isDisabled && (
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${translatePopoverOpen === boost.boost_type ? 'rotate-180' : ''}`} />
                  )}
                  <Badge 
                    variant="default" 
                    className="h-4 px-1.5 flex items-center justify-center bg-white/20 text-white border-white/30 text-[10px] font-bold ml-0.5 min-w-[18px]"
                  >
                    {boost.quantity}
                  </Badge>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Question Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-3xl p-4 md:p-6 lg:p-8 shadow-2xl flex-1 flex flex-col overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Question Image */}
            {currentQuestion.question_snapshot.image_url && getImageUrl(currentQuestion.question_snapshot.image_url) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-2xl overflow-hidden bg-muted/50"
              >
                <img
                  src={getImageUrl(currentQuestion.question_snapshot.image_url) || ''}
                  alt="Question"
                  className="w-full h-48 md:h-56 object-contain"
                />
              </motion.div>
            )}

            {/* Question Text */}
            <h2 className="text-xl md:text-2xl font-bold mb-6 leading-relaxed text-foreground break-words">
              {translationLanguage === 'ru' && currentQuestion.question_snapshot.question_ru
                ? currentQuestion.question_snapshot.question_ru
                : translationLanguage === 'en' && currentQuestion.question_snapshot.question_en
                ? currentQuestion.question_snapshot.question_en
                : currentQuestion.question_snapshot.question_es}
            </h2>

            {/* Answer Options */}
            <div className="grid gap-3">
              {(currentQuestion.question_snapshot.answer_options || [])
                .sort((a: any, b: any) => a.position - b.position)
                .map((option: any, idx: number) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = currentQuestion.correct_option_ids.includes(option.id);
                  const showResult = isAnswered;
                  const isEliminated = eliminatedOptions.includes(option.id);

                  if (isEliminated && !showResult) {
                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0, height: 0 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden"
                      />
                    );
                  }

                  return (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleAnswer(option.id)}
                      disabled={isAnswered || isEliminated}
                      whileHover={!isAnswered && !isEliminated ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered && !isEliminated ? { scale: 0.98 } : {}}
                      className={`p-3 md:p-4 rounded-2xl border-2 text-left transition-all font-semibold text-sm md:text-base leading-snug relative overflow-hidden min-h-[48px] md:min-h-[60px] break-words hyphens-auto ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-500/20 border-green-500 text-foreground shadow-lg'
                            : isSelected
                            ? 'bg-red-500/20 border-red-500 text-foreground shadow-lg'
                            : 'bg-muted/30 border-border/30 opacity-50'
                          : isSelected
                          ? 'bg-primary/20 border-primary shadow-lg'
                          : 'bg-card border-border hover:border-primary/50 hover:bg-primary/10 hover:shadow-md'
                      }`}
                    >
                      {showResult && (isCorrect || isSelected) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute top-2 md:top-3 right-2 md:right-3 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-white ${
                            isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        >
                          {isCorrect ? '✓' : '✗'}
                        </motion.div>
                      )}
                      <span className="block pr-10 text-base break-words hyphens-auto">
                        {translationLanguage === 'ru' && option.text_ru
                          ? option.text_ru
                          : translationLanguage === 'en' && option.text_en
                          ? option.text_en
                          : option.text_es}
                      </span>
                    </motion.button>
                  );
                })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
