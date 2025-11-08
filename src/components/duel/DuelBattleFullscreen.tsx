import { useState, useEffect, useRef, useCallback } from 'react';
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
import { isTelegramMiniApp, getTelegramWebApp } from '@/lib/telegram';

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
  const { notifications, markAsRead } = useNotifications({ showToasts: false, playSounds: true });
  
  // Обрабатываем уведомления о бустах соперника во время игры
  const processedBoostNotifications = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // Фильтруем только уведомления о бустах для текущей дуэли
    const boostNotifications = notifications.filter(
      n => n.type === 'boost' && n.duel_id === duelId && !n.is_read && !processedBoostNotifications.current.has(n.id)
    );
    
    if (boostNotifications.length > 0) {
      const latestBoost = boostNotifications[0]; // Берем последнее уведомление
      console.log('[DuelBattleFullscreen] ✅ Boost notification received:', latestBoost);
      
      // Помечаем как обработанное
      processedBoostNotifications.current.add(latestBoost.id);
      
      const isTelegram = isTelegramMiniApp();
      const webApp = getTelegramWebApp();
      
      // Показываем toast-уведомление о бусте
      const message = latestBoost.title || 'Соперник использовал буст!';
      
      console.log('[DuelBattleFullscreen] Showing boost toast:', message, 'isTelegram:', isTelegram);
      
      if (isTelegram && webApp?.showAlert) {
        try {
          webApp.showAlert(message);
          console.log('[DuelBattleFullscreen] ✅ Shown via Telegram WebApp.showAlert');
        } catch (e) {
          console.warn('[DuelBattleFullscreen] Telegram showAlert error:', e);
        }
      }
      
      toast.info(message, {
        duration: 3000,
        icon: '⚡',
        style: { 
          zIndex: 999999,
          fontSize: isTelegram ? '16px' : '14px',
          padding: isTelegram ? '16px' : '12px'
        }
      });
      
      // Вибрация для Telegram
      if (isTelegram && webApp?.HapticFeedback) {
        try {
          webApp.HapticFeedback.notificationOccurred('warning');
        } catch (e) {
          console.warn('[DuelBattleFullscreen] Haptic feedback error:', e);
        }
      }
      
      // Звук уведомления
      try {
        sounds.notificationPop();
      } catch (e) {
        console.warn('[DuelBattleFullscreen] Sound error:', e);
      }
      
      // Помечаем как прочитанное
      markAsRead(latestBoost.id);
    }
  }, [notifications, duelId, markAsRead]);
  
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
  const [myName, setMyName] = useState<string>('Ты');
  const [opponentName, setOpponentName] = useState<string>('Соперник');

  useEffect(() => {
    if (!duelId || !profileId) return;
    
    console.log('[DuelBattleFullscreen] Initializing duel:', { duelId, profileId });
    loadQuestions();
    loadScores(); // Важно: загружаем scores первым, чтобы установить myPlayerId
    loadBoosts();
  }, [duelId, profileId]);
  
  // Логируем установку myPlayerId
  useEffect(() => {
    if (myPlayerId) {
      console.log('[DuelBattleFullscreen] ✅ myPlayerId установлен:', myPlayerId);
    } else {
      console.warn('[DuelBattleFullscreen] ⚠️ myPlayerId еще не установлен');
    }
  }, [myPlayerId]);

  // Start countdown when duel starts
  // ВАЖНО: Countdown показываем только если вопросы уже загружены
  // И только один раз при старте (не при каждом обновлении state.duelStarted)
  const countdownStartedRef = useRef(false);
  
  useEffect(() => {
    // Показываем countdown только если:
    // 1. Duel начался
    // 2. Вопросы загружены
    // 3. Countdown еще не был показан
    // 4. Countdown не показывается сейчас
    if (state.duelStarted && questions.length > 0 && !countdownStartedRef.current && !showCountdown) {
      console.log('[DuelBattleFullscreen] Duel started, starting countdown...', {
        questionsLength: questions.length,
        duelStarted: state.duelStarted
      });
      
      countdownStartedRef.current = true;
      setShowCountdown(true);
      setCountdown(3);
      
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
  
  // Сбрасываем флаг countdown при размонтировании или смене дуэли
  useEffect(() => {
    return () => {
      countdownStartedRef.current = false;
    };
  }, [duelId]);

  // Update notifications when opponent answers
  useEffect(() => {
    if (state.opponentAnswered && state.opponentAnswerData) {
      console.log('[DuelBattleFullscreen] 🎯 Opponent answered event triggered!');
      console.log('[DuelBattleFullscreen] State:', {
        opponentAnswered: state.opponentAnswered,
        opponentAnswerData: state.opponentAnswerData,
        opponentName: opponentName
      });
      
      const isCorrect = state.opponentAnswerData.is_correct;
      const points = state.opponentAnswerData.points_awarded || 0;
      
      const isTelegram = isTelegramMiniApp();
      const webApp = getTelegramWebApp();
      
      console.log('[DuelBattleFullscreen] Platform check:', {
        isTelegram,
        hasWebApp: !!webApp,
        hasShowAlert: !!webApp?.showAlert,
        hasHapticFeedback: !!webApp?.HapticFeedback
      });
      
      // Используем имя соперника вместо "Соперник"
      const displayOpponentName = opponentName && opponentName !== 'Соперник' ? opponentName : 'Соперник';
      
      // Show notification - ВСЕГДА показываем toast, независимо от платформы
      if (isCorrect) {
        const message = `✅ ${displayOpponentName} ответил правильно! +${points} очков`;
        
        console.log('[DuelBattleFullscreen] Showing success toast:', message, 'isTelegram:', isTelegram, 'opponentName:', opponentName);
        
        // В Telegram пробуем показать через WebApp.showAlert как fallback
        if (isTelegram && webApp?.showAlert) {
          try {
            // Показываем через Telegram WebApp API
            webApp.showAlert(message);
            console.log('[DuelBattleFullscreen] ✅ Shown via Telegram WebApp.showAlert');
          } catch (e) {
            console.warn('[DuelBattleFullscreen] Telegram showAlert error, using toast:', e);
          }
        }
        
        // Всегда показываем toast (работает в браузере и Telegram)
        // ВАЖНО: Для Telegram используем более заметный стиль
        toast.success(message, {
          duration: 3000,
          icon: '⚡',
          style: { 
            zIndex: 999999,
            fontSize: isTelegram ? '18px' : '14px',
            padding: isTelegram ? '20px' : '12px',
            minWidth: isTelegram ? '320px' : '280px',
            backgroundColor: isTelegram ? 'var(--tg-theme-bg-color, white)' : undefined,
            color: isTelegram ? 'var(--tg-theme-text-color, black)' : undefined,
            border: isTelegram ? '2px solid var(--tg-theme-button-color, #007AFF)' : undefined,
            borderRadius: isTelegram ? '16px' : undefined,
            boxShadow: isTelegram ? '0 8px 24px rgba(0,0,0,0.3)' : undefined
          }
        });
        
        // Вибрация для Telegram
        if (isTelegram && webApp?.HapticFeedback) {
          try {
            webApp.HapticFeedback.notificationOccurred('success');
          } catch (e) {
            console.warn('[DuelBattleFullscreen] Haptic feedback error:', e);
          }
        }
      } else {
        const message = `❌ ${displayOpponentName} ошибся! Ваш шанс догнать!`;
        
        console.log('[DuelBattleFullscreen] Showing error toast:', message, 'isTelegram:', isTelegram, 'opponentName:', opponentName);
        
        // В Telegram пробуем показать через WebApp.showAlert как fallback
        if (isTelegram && webApp?.showAlert) {
          try {
            webApp.showAlert(message);
            console.log('[DuelBattleFullscreen] ✅ Shown via Telegram WebApp.showAlert');
          } catch (e) {
            console.warn('[DuelBattleFullscreen] Telegram showAlert error, using toast:', e);
          }
        }
        
        // Всегда показываем toast
        toast.error(message, {
          duration: 2000,
          icon: '🎯',
          style: { 
            zIndex: 999999,
            fontSize: isTelegram ? '18px' : '14px',
            padding: isTelegram ? '20px' : '12px',
            minWidth: isTelegram ? '320px' : '280px',
            backgroundColor: isTelegram ? 'var(--tg-theme-bg-color, white)' : undefined,
            color: isTelegram ? 'var(--tg-theme-text-color, black)' : undefined,
            border: isTelegram ? '2px solid var(--tg-theme-button-color, #007AFF)' : undefined,
            borderRadius: isTelegram ? '16px' : undefined,
            boxShadow: isTelegram ? '0 8px 24px rgba(0,0,0,0.3)' : undefined
          }
        });
        
        // Вибрация для Telegram
        if (isTelegram && webApp?.HapticFeedback) {
          try {
            webApp.HapticFeedback.notificationOccurred('warning');
          } catch (e) {
            console.warn('[DuelBattleFullscreen] Haptic feedback error:', e);
          }
        }
      }
      
      // Звук уведомления
      try {
        sounds.notificationPop();
      } catch (e) {
        console.warn('[DuelBattleFullscreen] Sound error:', e);
      }
      
      // Don't call loadScores() - realtime will update scores automatically
    }
  }, [state.opponentAnswered, state.opponentAnswerData, opponentName]);

  // Fallback: Polling для проверки новых ответов соперника в Telegram WebApp
  // Если realtime не работает, используем polling как запасной вариант
  const lastCheckedAnswerIdRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);
  const processedPollingAnswersRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!duelId || !myPlayerId) return;
    
    const isTelegram = isTelegramMiniApp();
    if (!isTelegram) return; // Polling только для Telegram WebApp
    
    console.log('[DuelBattleFullscreen] Starting polling fallback for opponent answers (Telegram WebApp)');
    
    // Загружаем последний ответ соперника при старте
    const loadLastOpponentAnswer = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      
      try {
        // Получаем всех игроков
        const { data: players } = await supabase
          .from('duel_players')
          .select('id, user_id')
          .eq('duel_id', duelId);
        
        if (!players || players.length < 2) {
          isPollingRef.current = false;
          return;
        }
        
        const opponent = players.find((p: any) => p.user_id !== profileId);
        if (!opponent) {
          isPollingRef.current = false;
          return;
        }
        
        // Получаем последний ответ соперника
        const { data: lastAnswer, error } = await supabase
          .from('duel_answers')
          .select('id, is_correct, points_awarded, created_at')
          .eq('duel_id', duelId)
          .eq('player_id', opponent.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('[DuelBattleFullscreen] Error loading last opponent answer:', error);
          isPollingRef.current = false;
          return;
        }
        
        if (lastAnswer) {
          // Проверяем, это новый ответ?
          if (lastCheckedAnswerIdRef.current !== lastAnswer.id && !processedPollingAnswersRef.current.has(lastAnswer.id)) {
            console.log('[DuelBattleFullscreen] 🎯 New opponent answer detected via polling!', lastAnswer);
            
            // Помечаем как обработанное
            processedPollingAnswersRef.current.add(lastAnswer.id);
            lastCheckedAnswerIdRef.current = lastAnswer.id;
            
            // Показываем уведомление напрямую через toast (fallback для Telegram WebApp)
            const isCorrect = lastAnswer.is_correct;
            const points = lastAnswer.points_awarded || 0;
            const displayOpponentName = opponentName && opponentName !== 'Соперник' ? opponentName : 'Соперник';
            const webApp = getTelegramWebApp();
            
            if (isCorrect) {
              const message = `✅ ${displayOpponentName} ответил правильно! +${points} очков`;
              
              console.log('[DuelBattleFullscreen] Showing polling fallback toast (success):', message);
              
              if (webApp?.showAlert) {
                try {
                  webApp.showAlert(message);
                } catch (e) {
                  console.warn('[DuelBattleFullscreen] Telegram showAlert error:', e);
                }
              }
              
              toast.success(message, {
                duration: 3000,
                icon: '⚡',
                style: { 
                  zIndex: 999999,
                  fontSize: '18px',
                  padding: '20px',
                  minWidth: '320px',
                  backgroundColor: 'var(--tg-theme-bg-color, white)',
                  color: 'var(--tg-theme-text-color, black)',
                  border: '2px solid var(--tg-theme-button-color, #007AFF)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }
              });
              
              if (webApp?.HapticFeedback) {
                try {
                  webApp.HapticFeedback.notificationOccurred('success');
                } catch (e) {
                  console.warn('[DuelBattleFullscreen] Haptic feedback error:', e);
                }
              }
            } else {
              const message = `❌ ${displayOpponentName} ошибся! Ваш шанс догнать!`;
              
              console.log('[DuelBattleFullscreen] Showing polling fallback toast (error):', message);
              
              if (webApp?.showAlert) {
                try {
                  webApp.showAlert(message);
                } catch (e) {
                  console.warn('[DuelBattleFullscreen] Telegram showAlert error:', e);
                }
              }
              
              toast.error(message, {
                duration: 2000,
                icon: '🎯',
                style: { 
                  zIndex: 999999,
                  fontSize: '18px',
                  padding: '20px',
                  minWidth: '320px',
                  backgroundColor: 'var(--tg-theme-bg-color, white)',
                  color: 'var(--tg-theme-text-color, black)',
                  border: '2px solid var(--tg-theme-button-color, #007AFF)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }
              });
              
              if (webApp?.HapticFeedback) {
                try {
                  webApp.HapticFeedback.notificationOccurred('warning');
                } catch (e) {
                  console.warn('[DuelBattleFullscreen] Haptic feedback error:', e);
                }
              }
            }
            
            // Звук уведомления
            try {
              sounds.notificationPop();
            } catch (e) {
              console.warn('[DuelBattleFullscreen] Sound error:', e);
            }
          }
        }
      } catch (error) {
        console.error('[DuelBattleFullscreen] Polling error:', error);
      } finally {
        isPollingRef.current = false;
      }
    };
    
    // Первая проверка
    loadLastOpponentAnswer();
    
    // Polling каждые 2 секунды
    const pollingInterval = setInterval(() => {
      loadLastOpponentAnswer();
    }, 2000);
    
    return () => {
      console.log('[DuelBattleFullscreen] Stopping polling fallback');
      clearInterval(pollingInterval);
      isPollingRef.current = false;
    };
  }, [duelId, myPlayerId, profileId, opponentName]);

  // Функция проверки завершения противника и перехода к результатам
  const checkAndTransitionToResults = useCallback(async () => {
    if (isVerifyingRef.current) {
      console.log('[DuelBattleFullscreen] Verification already in progress, skipping');
      return;
    }
    
    isVerifyingRef.current = true;
    
    try {
      console.log('[DuelBattleFullscreen] Checking if opponent finished and transitioning to results...');
      
      // Получаем информацию о дуэли
      const { data: duelInfo } = await supabase
        .from('duels')
        .select('status, num_questions')
        .eq('id', duelId)
        .single();

      if (!duelInfo) {
        console.log('[DuelBattleFullscreen] Duel not found');
        isVerifyingRef.current = false;
        return;
      }

      // Если дуэль не завершена, продолжаем ждать
      if (duelInfo.status !== 'finished') {
        console.log('[DuelBattleFullscreen] Duel not finished yet, status:', duelInfo.status);
        isVerifyingRef.current = false;
        return;
      }

      // Get opponent's player ID
      const { data: players } = await supabase
        .from('duel_players')
        .select('id, user_id')
        .eq('duel_id', duelId);

      if (!players || players.length < 2) {
        console.log('[DuelBattleFullscreen] Not enough players, ignoring');
        isVerifyingRef.current = false;
        return;
      }

      const opponent = players.find((p: any) => p.user_id !== profileId);
      if (!opponent) {
        console.log('[DuelBattleFullscreen] Opponent not found, ignoring');
        isVerifyingRef.current = false;
        return;
      }

      const requiredAnswers = duelInfo.num_questions || 10;

      // Count opponent's actual answers
      const { count: opponentAnswers } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', opponent.id)
        .eq('duel_id', duelId);

      console.log('[DuelBattleFullscreen] Verification:', {
        duelStatus: duelInfo.status,
        opponentAnswers: opponentAnswers || 0,
        required: requiredAnswers,
        canTransition: (opponentAnswers || 0) >= requiredAnswers
      });

      // Only transition if opponent really finished all questions
      if ((opponentAnswers || 0) >= requiredAnswers) {
        console.log('[DuelBattleFullscreen] ✅ Opponent finished all questions, transitioning to results');
        sounds.victory();
        toast.success('🏁 Соперник закончил! Смотрите результаты', { 
          duration: 3000,
          style: { zIndex: 999999 }
        });
        
        // В Telegram показываем через WebApp.showAlert
        const isTelegram = isTelegramMiniApp();
        const webApp = getTelegramWebApp();
        if (isTelegram && webApp?.showAlert) {
          try {
            webApp.showAlert('🏁 Соперник закончил! Переход к результатам...');
          } catch (e) {
            console.warn('[DuelBattleFullscreen] Telegram showAlert error:', e);
          }
        }
        
        setTimeout(() => {
          isVerifyingRef.current = false;
          onDuelFinished();
        }, 1500);
      } else {
        console.log('[DuelBattleFullscreen] ⚠️ Status is finished but opponent hasn\'t completed - staying on waiting screen');
        isVerifyingRef.current = false; // Reset for next check
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error verifying opponent completion:', error);
      isVerifyingRef.current = false; // Reset on error
    }
  }, [duelId, profileId, onDuelFinished]);

  // Handle duel completion via realtime - CRITICAL: Verify opponent actually finished before transitioning
  useEffect(() => {
    if (state.duelFinished && isWaitingForOpponent) {
      console.log('[DuelBattleFullscreen] Realtime detected finished status - verifying opponent completed');
      checkAndTransitionToResults();
    }
  }, [state.duelFinished, isWaitingForOpponent, duelId, profileId, onDuelFinished]);

  // Дополнительная проверка через polling для Telegram WebApp (на случай если realtime не работает)
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions) return;
    
    console.log('[DuelBattleFullscreen] Starting polling check for opponent completion (Telegram fallback)');
    
    // Проверяем каждые 2 секунды, если мы ждем противника
    const pollingInterval = setInterval(() => {
      if (!isWaitingForOpponent) {
        clearInterval(pollingInterval);
        return;
      }
      
      console.log('[DuelBattleFullscreen] Polling: checking if opponent finished...');
      checkAndTransitionToResults();
    }, 2000);

    return () => {
      console.log('[DuelBattleFullscreen] Stopping polling check');
      clearInterval(pollingInterval);
    };
  }, [isWaitingForOpponent, hasFinishedMyQuestions, duelId, profileId, onDuelFinished]);

  // Sync opponent score from realtime
  useEffect(() => {
    if (typeof state.opponentScore === 'number' && state.opponentScore !== opponentScore) {
      console.log('[DuelBattleFullscreen] Updating opponent score from realtime:', state.opponentScore);
      setOpponentScore(state.opponentScore);
    }
  }, [state.opponentScore, opponentScore]);

  // Reload opponent name if it's still "Соперник" after initial load
  useEffect(() => {
    if (!profileId || !duelId) return;
    
    const timer = setTimeout(() => {
      if (opponentName === 'Соперник') {
        console.log('[DuelBattleFullscreen] ⚠️ Opponent name is still default, reloading...');
        loadScores();
      } else {
        console.log('[DuelBattleFullscreen] ✅ Opponent name is set:', opponentName);
      }
    }, 1000); // Wait 1 second after mount before checking
    
    return () => clearTimeout(timer);
  }, [opponentName, profileId, duelId]);
  
  // Also reload when duelId or profileId changes
  useEffect(() => {
    if (profileId && duelId) {
      console.log('[DuelBattleFullscreen] DuelId or profileId changed, reloading scores...');
      loadScores();
    }
  }, [duelId, profileId]);

  // Sync my score from realtime
  useEffect(() => {
    if (typeof state.myScore === 'number' && state.myScore !== myScore) {
      console.log('[DuelBattleFullscreen] Updating my score from realtime:', state.myScore);
      setMyScore(state.myScore);
    }
  }, [state.myScore, myScore]);

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
    try {
      setLoading(true);
      console.log('[DuelBattleFullscreen] Loading questions for duel:', duelId, 'profile:', profileId);
      
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'get_questions', duel_id: duelId, profile_id: profileId },
      });

      console.log('[DuelBattleFullscreen] Questions response:', { data, error });

      if (error) throw error;
      if (data?.questions && Array.isArray(data.questions)) {
        console.log('[DuelBattleFullscreen] Loaded questions:', data.questions.length);
        setQuestions(data.questions);
      } else {
        console.error('[DuelBattleFullscreen] Invalid questions data:', data);
        toast.error('Некорректные данные вопросов');
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error loading questions:', error);
      toast.error('Ошибка загрузки вопросов');
    } finally {
      setLoading(false);
    }
  };

  const loadScores = async () => {
    try {
      const { data, error } = await supabase
        .from('duel_players')
        .select('*, profiles(first_name, username)')
        .eq('duel_id', duelId);

      if (error) {
        console.error('[DuelBattleFullscreen] Error loading scores:', error);
        return;
      }

      if (data && data.length > 0) {
        const myPlayer = data.find(p => p.user_id === profileId);
        const opponent = data.find(p => p.user_id !== profileId);
        
        console.log('[DuelBattleFullscreen] Players data:', {
          allPlayers: data.map(p => ({ user_id: p.user_id, id: p.id })),
          myPlayer: myPlayer ? { user_id: myPlayer.user_id, id: myPlayer.id } : null,
          opponent: opponent ? { user_id: opponent.user_id, id: opponent.id } : null,
          profileId
        });
        
        if (myPlayer?.id) setMyPlayerId(myPlayer.id);
        
        // Load player names - try different ways to access profile data
        let myProfile: any = null;
        let opponentProfile: any = null;
        
        // Try direct access
        if ((myPlayer as any)?.profiles) {
          myProfile = (myPlayer as any).profiles;
        }
        if ((opponent as any)?.profiles) {
          opponentProfile = (opponent as any).profiles;
        }
        
        // If profiles not loaded via join, fetch separately
        // Note: This should work now with the updated RLS policy
        if (!opponentProfile && opponent?.user_id) {
          console.log('[DuelBattleFullscreen] ⚠️ Profile not in join, fetching separately for opponent:', opponent.user_id);
          
          // Try to get profile data through duel_players join first
          const { data: playerWithProfile } = await supabase
            .from('duel_players')
            .select('profiles(first_name, username)')
            .eq('id', opponent.id)
            .eq('duel_id', duelId)
            .single();
          
          if (playerWithProfile && (playerWithProfile as any).profiles) {
            opponentProfile = (playerWithProfile as any).profiles;
            console.log('[DuelBattleFullscreen] ✅ Got opponent profile via duel_players join:', opponentProfile);
          } else {
            // Fallback: direct profile query (requires RLS policy update)
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('first_name, username')
              .eq('id', opponent.user_id)
              .single();
            
            if (profileError) {
              console.error('[DuelBattleFullscreen] ❌ Error fetching opponent profile:', profileError);
              console.error('[DuelBattleFullscreen] Profile error details:', JSON.stringify(profileError, null, 2));
            } else if (profileData) {
              opponentProfile = profileData;
              console.log('[DuelBattleFullscreen] ✅ Fetched opponent profile directly:', opponentProfile);
            } else {
              console.warn('[DuelBattleFullscreen] ⚠️ No profile data returned for opponent:', opponent.user_id);
            }
          }
        }
        
        console.log('[DuelBattleFullscreen] Loaded profiles:', {
          myProfile,
          opponentProfile,
          opponentUserId: opponent?.user_id
        });
        
        const myNameValue = myProfile?.first_name || myProfile?.username || 'Ты';
        const opponentNameValue = opponentProfile?.first_name || opponentProfile?.username || 'Соперник';
        
        console.log('[DuelBattleFullscreen] 🔥 Setting names:', {
          myName: myNameValue,
          opponentName: opponentNameValue,
          opponentProfileExists: !!opponentProfile,
          opponentProfileData: opponentProfile
        });
        
        setMyName(myNameValue);
        setOpponentName(opponentNameValue);
        
        // Force a check after setting
        setTimeout(() => {
          console.log('[DuelBattleFullscreen] After setting, opponentName state should be:', opponentNameValue);
        }, 100);
        
        // Initial scores - realtime will update them automatically
        setMyScore(myPlayer?.score || 0);
        setOpponentScore(opponent?.score || 0);
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Exception in loadScores:', error);
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

    setSelectedAnswer(optionId);
    setIsAnswered(true);

    const question = questions[currentIndex];
    const isCorrect = question.correct_option_ids.includes(optionId);

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: question.id,
          selected_option_id: optionId,
          time_taken_ms: 60000 - timeLeft,
        },
      });

      if (error) throw error;

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
      console.error('Error submitting answer:', error);
    }
  };

  const handleTimeout = async () => {
    if (isAnswered) return;
    setIsAnswered(true);
    sounds.wrongAnswer();
    
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'submit_answer',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: questions[currentIndex].id,
          selected_option_id: null,
          time_taken_ms: 60000,
        },
      });

      if (error) throw error;

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
      console.error('Error on timeout:', error);
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
  // УМЕНЬШАЕМ В 2 РАЗА для всего приложения, как просил пользователь
  const totalTopPadding = Math.round((safeArea.top + safeArea.contentTop) / 2);
  const totalBottomPadding = Math.round((safeArea.bottom + safeArea.contentBottom) / 2);
  const totalLeftPadding = Math.round(safeArea.left / 2);
  const totalRightPadding = Math.round(safeArea.right / 2);

  // Логирование для отладки
  console.log('[DuelBattleFullscreen] 🎮 Safe area values:', {
    platform: safeArea.platform,
    safeAreaTop: `${safeArea.top}px`,
    safeAreaContentTop: `${safeArea.contentTop}px (уменьшено в 2 раза)`,
    totalTopPadding: `${totalTopPadding}px (итоговый отступ)`,
    safeAreaLeft: `${safeArea.left}px`,
    safeAreaRight: `${safeArea.right}px`,
    totalLeftPadding: `${totalLeftPadding}px`,
    totalRightPadding: `${totalRightPadding}px`,
    willApplyPadding: totalTopPadding > 0,
  });

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

      {/* Exit Button - Top Left Corner */}
      {/* Учитываем отступы для Telegram WebApp */}
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

      {/* Main Content */}
      {/* Используем единую систему отступов через CSS переменные */}
      <div className="min-h-full flex flex-col p-3 md:p-4 pb-6 max-w-4xl mx-auto">
        {/* Header - Scores & Timer - Premium Design */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          {/* Scores - Enhanced */}
          <div className="flex items-center gap-3 md:gap-5">
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
                <p className="text-xs font-medium text-muted-foreground mb-0.5 hidden md:block">{myName}</p>
                <motion.div 
                  key={myScore}
                  className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent relative"
                  initial={{ scale: 1.3, y: -15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 15,
                    duration: 0.4
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.span
                    key={`score-${myScore}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: [0.8, 1.15, 1],
                      opacity: [0, 1, 1],
                      textShadow: [
                        "0 0 0px rgba(59, 130, 246, 0)",
                        "0 0 20px rgba(59, 130, 246, 0.8)",
                        "0 0 0px rgba(59, 130, 246, 0)"
                      ]
                    }}
                    transition={{ 
                      duration: 0.6,
                      ease: "easeOut"
                    }}
                    className="inline-block"
                  >
                    {myScore}
                  </motion.span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-lg blur-xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 0.6, 0],
                      scale: [0.8, 1.2, 1.5]
                    }}
                    transition={{ 
                      duration: 0.8,
                      ease: "easeOut"
                    }}
                  />
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
                  className="text-xs font-medium text-muted-foreground mb-0.5 hidden md:block text-right truncate max-w-[120px] ml-auto" 
                  title={opponentName}
                  key={`opponent-name-${opponentName}`}
                >
                  {opponentName || 'Соперник'}
                </p>
                <motion.div 
                  key={opponentScore}
                  className="text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent text-right relative"
                  initial={{ scale: 1.3, y: -15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 15,
                    duration: 0.4
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.span
                    key={`opponent-score-${opponentScore}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: [0.8, 1.15, 1],
                      opacity: [0, 1, 1],
                      textShadow: [
                        "0 0 0px rgba(234, 88, 12, 0)",
                        "0 0 20px rgba(234, 88, 12, 0.8)",
                        "0 0 0px rgba(234, 88, 12, 0)"
                      ]
                    }}
                    transition={{ 
                      duration: 0.6,
                      ease: "easeOut"
                    }}
                    className="inline-block"
                  >
                    {opponentScore}
                  </motion.span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-lg blur-xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 0.6, 0],
                      scale: [0.8, 1.2, 1.5]
                    }}
                    transition={{ 
                      duration: 0.8,
                      ease: "easeOut"
                    }}
                  />
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
