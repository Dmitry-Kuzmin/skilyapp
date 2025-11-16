import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Flame, Shield, Users, Trophy, Swords, ChevronDown, Sparkles, Timer, HelpCircle, SkipForward, Globe, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useActiveDuel } from '@/hooks/useActiveDuel';
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
import { QuestionProgressBar } from '@/components/QuestionProgressBar';
import { DuelSettingsMenu } from './DuelSettingsMenu';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { OpponentActivityIndicator } from './OpponentActivityIndicator';

const duelRiskMultiplierPreview = (betAmount: number) => {
  if (!betAmount || betAmount <= 0) return 1;
  if (betAmount >= 600) return 4;
  if (betAmount >= 450) return 3;
  if (betAmount >= 300) return 2.25;
  if (betAmount >= 200) return 1.75;
  if (betAmount >= 100) return 1.25;
  return 1.1;
};

const getSeasonBonusDisplay = (betAmount: number) => {
  return betAmount > 0 ? Math.round(20 * duelRiskMultiplierPreview(betAmount)) : 30;
};

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
  const { saveActiveDuel, updateActiveDuel } = useActiveDuel();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { state } = useDuelRealtime(duelId, myPlayerId);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  
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
  const [translatePopoverOpen, setTranslatePopoverOpen] = useState<string | null>(null);
  const isVerifyingRef = useRef(false);
  const hasTransitionedRef = useRef(false);
  const [myName, setMyName] = useState<string>('Ты');
  const [opponentName, setOpponentName] = useState<string>('Соперник');
  const [myPhotoUrl, setMyPhotoUrl] = useState<string | null>(null);
  const [opponentPhotoUrl, setOpponentPhotoUrl] = useState<string | null>(null);
  const [opponentActivityStatus, setOpponentActivityStatus] = useState<'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline'>('online');
  const [opponentLastSeen, setOpponentLastSeen] = useState<Date | null>(null);
  const previousActivityStatusRef = useRef<'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline'>('online');

  // Settings states
  const [showDuelSettings, setShowDuelSettings] = useState(false);
  const [voiceOver, setVoiceOver] = useState(() => {
    const saved = localStorage.getItem('duel-voice-over');
    return saved ? saved === 'true' : false;
  });
  const [ambientMusic, setAmbientMusic] = useState(() => {
    const saved = localStorage.getItem('duel-ambient-music');
    return saved ? saved === 'true' : false;
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('duel-font-size');
    return saved ? parseInt(saved) : 1; // 0 = small, 1 = default, 2 = large
  });
  const [isQuestionBookmarked, setIsQuestionBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [betInfo, setBetInfo] = useState<{
    betAmount: number;
    totalBank: number;
    isHost: boolean;
    hostInsurance: boolean;
    opponentInsurance: boolean;
    coverageHost: number;
    coverageOpponent: number;
  } | null>(null);
  const myInsuranceActive = betInfo ? (betInfo.isHost ? betInfo.hostInsurance : betInfo.opponentInsurance) : false;
  const myCoverageDisplay = betInfo ? Math.round(((betInfo.isHost ? betInfo.coverageHost : betInfo.coverageOpponent) || 0) * 100) : 0;
  const opponentInsuranceActive = betInfo ? (betInfo.isHost ? betInfo.opponentInsurance : betInfo.hostInsurance) : false;
  const opponentCoverageDisplay = betInfo ? Math.round(((betInfo.isHost ? betInfo.coverageOpponent : betInfo.coverageHost) || 0) * 100) : 0;
  const seasonBonusDisplay = betInfo ? getSeasonBonusDisplay(betInfo.betAmount) : 0;
  
  // Format time helper
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };
  
  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('duel-voice-over', String(voiceOver));
  }, [voiceOver]);
  
  useEffect(() => {
    localStorage.setItem('duel-ambient-music', String(ambientMusic));
  }, [ambientMusic]);

  useEffect(() => {
    localStorage.setItem('duel-font-size', String(fontSize));
  }, [fontSize]);
  
  // Check if question is bookmarked
  const checkIfBookmarked = async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_challenge_questions')
        .select('id')
        .eq('user_id', profileId)
        .eq('question_id', questions[currentIndex].id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      setIsQuestionBookmarked(!!data);
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error checking bookmark:', error);
    }
  };
  
  // Toggle bookmark
  const toggleBookmark = async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.id) return;
    
    setBookmarkLoading(true);
    const questionId = questions[currentIndex].id;
    
    try {
      if (isQuestionBookmarked) {
        const { error } = await supabase
          .from('user_challenge_questions')
          .delete()
          .eq('user_id', profileId)
          .eq('question_id', questionId);
        
        if (error) throw error;
        toast.success("Удалено из закладок");
        setIsQuestionBookmarked(false);
      } else {
        const { data: existing } = await supabase
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .maybeSingle();
        
        if (existing) {
          toast.success("Вопрос уже в закладках");
          setIsQuestionBookmarked(true);
        } else {
          const { error: insertError } = await supabase
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 0,
              last_wrong_at: new Date().toISOString(),
            });
          
          if (insertError) throw insertError;
          toast.success("Добавлено в закладки");
          setIsQuestionBookmarked(true);
          }
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Error toggling bookmark:', error);
      toast.error("Не удалось изменить закладку");
    } finally {
      setBookmarkLoading(false);
    }
  };
  
  // Check bookmark on question change
  useEffect(() => {
    if (profileId && questions.length > 0 && questions[currentIndex]?.id) {
      checkIfBookmarked();
    }
  }, [profileId, currentIndex, questions]);

  useEffect(() => {
    if (!duelId || !profileId) {
      console.log('[DuelBattleFullscreen] ⚠️ Missing duelId or profileId:', { duelId, profileId });
      return;
          }
    
    console.log('[DuelBattleFullscreen] 🚀 Component mounted, loading data...', { duelId, profileId });
    loadQuestions();
    loadScores();
    loadBoosts();
    loadBetInfo();
  }, [duelId, profileId]);

  // Heartbeat каждые 5 секунд для отслеживания активности
  useEffect(() => {
    if (!duelId || !profileId || !state.duelStarted) return;
    
    const heartbeatInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'heartbeat',
            duel_id: duelId,
            profile_id: profileId
          }
        });
        
        if (error) {
          console.error('[DuelBattleFullscreen] Heartbeat error:', error);
        } else if (data?.opponent_status) {
          // Обновляем статус соперника из ответа heartbeat
          setOpponentActivityStatus(data.opponent_status);
        }
      } catch (error) {
        console.error('[DuelBattleFullscreen] Heartbeat exception:', error);
      }
    }, 5000);
    
    return () => clearInterval(heartbeatInterval);
  }, [duelId, profileId, state.duelStarted]);

  // Синхронизация статуса активности из Realtime
  useEffect(() => {
    if (state.opponentActivityStatus) {
      setOpponentActivityStatus(state.opponentActivityStatus);
    }
    if (state.opponentLastSeen) {
      setOpponentLastSeen(state.opponentLastSeen);
    }
  }, [state.opponentActivityStatus, state.opponentLastSeen]);

  // Обновление статуса активности при чтении вопроса
  useEffect(() => {
    if (!duelId || !profileId || !questions.length || !state.duelStarted) return;
    
    // Когда показывается новый вопрос - статус "thinking"
    supabase.functions.invoke('duel-manager', {
      body: {
        action: 'update_activity_status',
        duel_id: duelId,
        profile_id: profileId,
        status: 'thinking'
      }
    }).catch(error => {
      console.error('[DuelBattleFullscreen] Error updating activity status to thinking:', error);
    });
  }, [currentIndex, duelId, profileId, questions.length, state.duelStarted]);

  // Уведомления о смене статуса активности соперника
  useEffect(() => {
    if (!opponentName || opponentActivityStatus === previousActivityStatusRef.current) return;
    
    const statusMessages: Record<string, { title: string; description: string; icon: string; duration: number }> = {
      online: {
        title: `${opponentName} вернулся`,
        description: 'Соперник снова онлайн',
        icon: '🟢',
        duration: 2000
      },
      thinking: {
        title: `${opponentName} думает`,
        description: 'Читает вопрос...',
        icon: '💭',
        duration: 1500
      },
      answering: {
        title: `${opponentName} отвечает!`,
        description: 'Торопится!',
        icon: '⚡',
        duration: 2000
      },
      reconnecting: {
        title: `${opponentName} переподключается`,
        description: 'Проблемы с соединением',
        icon: '🔄',
        duration: 3000
      },
      offline: {
        title: `${opponentName} офлайн`,
        description: 'Потеряно соединение',
        icon: '⚠️',
        duration: 3000
      }
    };
    
    const message = statusMessages[opponentActivityStatus];
    if (message && previousActivityStatusRef.current !== 'online') {
      toast.info(message.title, {
        description: message.description,
        duration: message.duration,
        icon: message.icon
      });
    }
    
    previousActivityStatusRef.current = opponentActivityStatus;
  }, [opponentActivityStatus, opponentName]);

  // Детекция переподключения
  useEffect(() => {
    if (!opponentLastSeen || opponentActivityStatus !== 'online') return;
    
    const checkReconnection = () => {
      if (!opponentLastSeen) return;
      
      const now = Date.now();
      const lastSeen = opponentLastSeen.getTime();
      const timeSinceLastSeen = now - lastSeen;
      
      // Если был офлайн > 5 секунд и вернулся - это переподключение
      if (timeSinceLastSeen > 5000 && previousActivityStatusRef.current === 'offline') {
        setOpponentActivityStatus('reconnecting');
        
        setTimeout(() => {
          setOpponentActivityStatus('online');
        }, 2000);
      }
    };
    
    const interval = setInterval(checkReconnection, 1000);
    return () => clearInterval(interval);
  }, [opponentLastSeen, opponentActivityStatus]);

  // Обработка disconnect при закрытии приложения/вкладки
  useEffect(() => {
    if (!duelId || !profileId || !state.duelStarted) return;
    
    const handleBeforeUnload = async () => {
      // Помечаем игрока как отключенного
      try {
        await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'handle_disconnect',
            duel_id: duelId,
            profile_id: profileId
          }
        });
      } catch (error) {
        console.error('[DuelBattleFullscreen] Error handling disconnect:', error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Также вызываем при размонтировании компонента
      handleBeforeUnload();
    };
  }, [duelId, profileId, state.duelStarted]);

  // Обработка timeout если игрок не отвечает > 30 секунд
  useEffect(() => {
    if (!state.duelStarted || isAnswered || !questions.length) return;
    
    const timeoutId = setTimeout(() => {
      if (!isAnswered && timeLeft < 30000) {
        // Игрок не ответил за 30 секунд - предупреждение
        toast.warning('Время истекает!', {
          description: 'Ответьте быстрее, иначе будет засчитано как пропуск',
          duration: 5000
        });
      }
    }, 30000);
    
    return () => clearTimeout(timeoutId);
  }, [currentIndex, state.duelStarted, isAnswered, timeLeft, questions.length]);

  // УБРАНО: Countdown - битва начинается сразу когда дуэль стартовала
  // Перезагружаем счет после старта дуэли
  useEffect(() => {
    if (state.duelStarted && questions.length > 0 && !loading) {
      console.log('[DuelBattleFullscreen] Duel started, loading scores...');
      setTimeout(() => loadScores(), 500);
    }
  }, [state.duelStarted, questions.length, loading]);

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

  // КРИТИЧНО: Переход к результатам через Realtime подписку (state.duelFinished)
  // useDuelRealtime уже подписывается на изменения статуса дуэли через Realtime
  // Это намного эффективнее чем периодические проверки
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions) {
      return;
    }

    // Используем state.duelFinished из useDuelRealtime (Realtime подписка)
    if (state.duelFinished && !hasTransitionedRef.current) {
      console.log('[DuelBattleFullscreen] ✅✅✅ REALTIME: Duel finished! Transitioning to results');
      hasTransitionedRef.current = true;
      
      try {
        if (sounds?.victory) {
          sounds.victory();
        }
      } catch (soundError) {
        console.warn('[DuelBattleFullscreen] Error playing victory sound:', soundError);
      }
      
      toast.success('🏁 Дуэль завершена!', { duration: 2000 });
      onDuelFinished();
    }
  }, [state.duelFinished, isWaitingForOpponent, hasFinishedMyQuestions, onDuelFinished]);

  // Sync opponent score from realtime - основной способ обновления счета
  useEffect(() => {
    if (typeof state.opponentScore === 'number' && state.opponentScore >= 0 && state.opponentScore !== opponentScore) {
      console.log('[DuelBattleFullscreen] ✅ Updating opponent score from realtime:', state.opponentScore, '(was:', opponentScore, ')');
      setOpponentScore(state.opponentScore);
      
      // FALLBACK: Если мы ждем соперника и счет обновился, проверяем статус дуэли
      // (на случай если Realtime подписка на статус не сработала)
      if (isWaitingForOpponent && hasFinishedMyQuestions && !hasTransitionedRef.current) {
        console.log('[DuelBattleFullscreen] 🔄 Opponent score updated while waiting - checking duel status as fallback');
        setTimeout(async () => {
          try {
            const { data: duel } = await supabase
              .from('duels')
              .select('status, num_questions')
              .eq('id', duelId)
              .single();
            
            if (duel?.status === 'finished' && !hasTransitionedRef.current) {
              console.log('[DuelBattleFullscreen] ✅✅✅ FALLBACK: Duel status is finished! Transitioning to results');
              hasTransitionedRef.current = true;
              
              try {
                if (sounds?.victory) {
                  sounds.victory();
                }
              } catch (soundError) {
                console.warn('[DuelBattleFullscreen] Error playing victory sound:', soundError);
              }
              
              toast.success('🏁 Дуэль завершена!', { duration: 2000 });
              onDuelFinished();
            }
          } catch (error) {
            console.error('[DuelBattleFullscreen] Error in fallback status check:', error);
          }
        }, 500);
      }
    }
  }, [state.opponentScore, opponentScore, isWaitingForOpponent, hasFinishedMyQuestions, duelId, onDuelFinished]);
  
  // FALLBACK для Telegram WebApp: периодическая проверка счета соперника
  // Если Realtime не работает, обновляем счет каждые 2 секунды
  useEffect(() => {
    if (!duelId || !myPlayerId || !state.duelStarted) return;
    
    // Проверяем счет каждые 2 секунды как fallback
    const scoreCheckInterval = setInterval(async () => {
      try {
        const { data: players, error } = await supabase
          .from('duel_players')
          .select('id, score, user_id')
          .eq('duel_id', duelId);
        
        if (error) {
          console.error('[DuelBattleFullscreen] Error checking opponent score (fallback):', error);
          return;
        }
        
        if (players && players.length >= 2) {
          const opponent = players.find((p: any) => p.id !== myPlayerId);
          if (opponent && typeof opponent.score === 'number' && opponent.score !== opponentScore) {
            console.log('[DuelBattleFullscreen] 🔄 Fallback: Updating opponent score:', opponent.score, '(was:', opponentScore, ')');
            setOpponentScore(opponent.score);
      }
        }
      } catch (error) {
        console.error('[DuelBattleFullscreen] Exception in score check fallback:', error);
      }
    }, 2000); // Каждые 2 секунды
    
    return () => clearInterval(scoreCheckInterval);
  }, [duelId, myPlayerId, state.duelStarted, opponentScore]);
  
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

  // УБРАНО: Периодическое обновление счета - теперь используется Realtime через useDuelRealtime
  // useDuelRealtime уже подписывается на изменения duel_players через postgres_changes
  // Это намного эффективнее и быстрее чем периодические запросы каждые 3 секунды

  // Загружаем код дуэли при монтировании
  useEffect(() => {
    if (duelId) {
      supabase
        .from('duels')
        .select('code')
        .eq('id', duelId)
        .single()
        .then(({ data }) => {
          if (data?.code) {
            setDuelCode(data.code);
          }
        });
    }
  }, [duelId]);

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

  // Сохраняем состояние активной дуэли при изменениях
  useEffect(() => {
    if (!duelId || !profileId || !questions.length || !duelCode) return;

    // Сохраняем состояние только если дуэль активна
    if (state.duelStarted && !state.duelFinished) {
      updateActiveDuel({
        duelId,
        duelCode,
        mode: isWaitingForOpponent ? 'waiting' : 'battle',
        currentIndex: isWaitingForOpponent ? undefined : currentIndex, // Не сохраняем currentIndex в режиме ожидания
        myScore,
        opponentScore,
        totalQuestions: questions.length,
        myName,
        opponentName,
      });
    }
  }, [duelId, duelCode, currentIndex, myScore, opponentScore, questions.length, myName, opponentName, isWaitingForOpponent, state.duelStarted, state.duelFinished, profileId, updateActiveDuel]);

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

  // Логирование safe area только при изменении значений (не при каждом рендере)
  useEffect(() => {
    const TELEGRAM_NAV_HEIGHT = 95;
    const telegramNavPadding = safeArea.platform === 'telegram' ? TELEGRAM_NAV_HEIGHT : 0;
    const totalTopPadding = Math.round(safeArea.top + safeArea.contentTop + telegramNavPadding);
    const totalLeftPadding = Math.round(safeArea.left);
    const totalRightPadding = Math.round(safeArea.right);
    const PROGRESS_BAR_HEIGHT = 60;

    console.log('[DuelBattleFullscreen] 🎮 Safe area values:', {
      platform: safeArea.platform,
      safeAreaTop: `${safeArea.top}px`,
      safeAreaContentTop: `${safeArea.contentTop}px (уменьшено в 2 раза)`,
      telegramNavHeight: `${TELEGRAM_NAV_HEIGHT}px`,
      telegramNavPadding: `${telegramNavPadding}px`,
      totalTopPadding: `${totalTopPadding}px (итоговый отступ)`,
      calculation: `${safeArea.top} + ${safeArea.contentTop} + ${telegramNavPadding} = ${totalTopPadding}`,
      safeAreaLeft: `${safeArea.left}px`,
      safeAreaRight: `${safeArea.right}px`,
      totalLeftPadding: `${totalLeftPadding}px`,
      totalRightPadding: `${totalRightPadding}px`,
      progressBarTop: `${totalTopPadding}px`,
      contentPaddingTop: `${totalTopPadding + PROGRESS_BAR_HEIGHT - (safeArea?.platform === 'telegram' ? 8 : 0)}px`,
    });
  }, [safeArea.platform, safeArea.top, safeArea.contentTop, safeArea.left, safeArea.right, safeArea.bottom, safeArea.contentBottom]);

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
        
        // Восстанавливаем currentIndex из сохраненного состояния
        const savedState = localStorage.getItem('active_duel_state');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            if (state.duelId === duelId && state.currentIndex !== undefined && state.currentIndex < data.questions.length) {
              console.log('[DuelBattleFullscreen] 🔄 Restoring currentIndex from saved state:', state.currentIndex);
              setCurrentIndex(state.currentIndex);
            }
          } catch (e) {
            console.error('[DuelBattleFullscreen] Error parsing saved state:', e);
          }
        }
        
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
        
        // Восстанавливаем currentIndex из сохраненного состояния
        const savedState = localStorage.getItem('active_duel_state');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            if (state.duelId === duelId && state.currentIndex !== undefined && state.currentIndex < data.length) {
              console.log('[DuelBattleFullscreen] 🔄 Restoring currentIndex from saved state:', state.currentIndex);
              setCurrentIndex(state.currentIndex);
            }
          } catch (e) {
            console.error('[DuelBattleFullscreen] Error parsing saved state:', e);
          }
        }
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
        players: players.map((p: any) => ({ 
          id: p.id, 
          user_id: p.user_id, 
          score: p.score, 
          name: p.name,
          hasName: !!p.name && p.name !== 'Игрок'
        }))
      });
      
      // КРИТИЧНО: Проверяем что имена получены
      const playersWithoutNames = players.filter((p: any) => !p.name || p.name === 'Игрок' || p.name.trim() === '');
      if (playersWithoutNames.length > 0) {
        console.warn('[DuelBattleFullscreen] ⚠️ Some players have no valid name from Edge Function:', playersWithoutNames.map((p: any) => ({ 
          user_id: p.user_id, 
          name: p.name,
          hasName: !!p.name && p.name !== 'Игрок'
        })));
        // Если Edge Function не вернул имена, используем fallback
        console.log('[DuelBattleFullscreen] 🔄 Falling back to direct query for names...');
        await loadScoresDirect();
        return; // Не продолжаем, так как loadScoresDirect уже установил имена
      }
        
      if (players.length >= 2) {
        const myPlayer = players.find((p: any) => p.user_id === profileId);
        const opponent = players.find((p: any) => p.user_id !== profileId);
        
        console.log('[DuelBattleFullscreen] 🔍 Found players:', {
          myPlayer: myPlayer ? { id: myPlayer.id, score: myPlayer.score, name: myPlayer.name, nameLength: myPlayer.name?.length } : null,
          opponent: opponent ? { id: opponent.id, score: opponent.score, name: opponent.name, nameLength: opponent.name?.length } : null
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
        
        // Устанавливаем имена игроков (проверяем что имя валидно и не пустое)
        if (myPlayer?.name && myPlayer.name.trim() && myPlayer.name !== 'Игрок' && myPlayer.name.trim() !== 'Игрок') {
          const trimmedName = myPlayer.name.trim();
          console.log('[DuelBattleFullscreen] ✅ Setting my name:', trimmedName);
          setMyName(trimmedName);
          } else {
          console.warn('[DuelBattleFullscreen] ⚠️ No valid name for my player, using fallback. Name was:', myPlayer?.name);
          setMyName('Вы');
        }
        
        if (opponent?.name && opponent.name.trim() && opponent.name !== 'Игрок' && opponent.name.trim() !== 'Игрок') {
          const trimmedName = opponent.name.trim();
          console.log('[DuelBattleFullscreen] ✅ Setting opponent name:', trimmedName);
          setOpponentName(trimmedName);
            } else {
          console.warn('[DuelBattleFullscreen] ⚠️ No valid name for opponent, using fallback. Name was:', opponent?.name);
          setOpponentName('Соперник');
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
      console.log('[DuelBattleFullscreen] 🔄 Loading scores directly from DB (separate queries)');
      
      // Загружаем игроков БЕЗ JOIN (чтобы избежать проблем с RLS)
      const { data: players, error: playersError } = await supabase
        .from('duel_players')
        .select('id, user_id, score, correct_count')
        .eq('duel_id', duelId);

      if (playersError) {
        console.error('[DuelBattleFullscreen] ❌ Error loading players:', playersError);
        return;
      }

      if (!players || players.length < 2) {
        console.warn('[DuelBattleFullscreen] ⚠️ Not enough players found:', players?.length || 0);
        return;
      }

      const myPlayer = players.find(p => p.user_id === profileId);
      const opponent = players.find(p => p.user_id !== profileId);
      
      if (myPlayer?.id) {
        setMyPlayerId(myPlayer.id);
        setMyScore(myPlayer?.score || 0);
      }
      
      if (opponent) {
        setOpponentScore(opponent.score || 0);
      }

      // Загружаем профили ОТДЕЛЬНО по одному (чтобы избежать проблем с .in() и RLS)
      const userIds = [myPlayer?.user_id, opponent?.user_id].filter(Boolean) as string[];
      
      if (userIds.length > 0) {
        console.log('[DuelBattleFullscreen] 🔄 Loading profiles one by one for userIds:', userIds);
        
        // Загружаем профили по одному через Promise.all
        const profilePromises = userIds.map(async (userId) => {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, first_name, username, photo_url')
            .eq('id', userId)
            .single();
          
          if (error) {
            console.error(`[DuelBattleFullscreen] ❌ Error loading profile for ${userId}:`, {
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            return null;
          }
          
          if (!profile) {
            console.warn(`[DuelBattleFullscreen] ⚠️ Profile not found for userId: ${userId}`);
            return null;
          }
          
          return { userId, profile };
        });
        
        const profileResults = await Promise.all(profilePromises);
        const profilesMap = new Map();
        
        profileResults.forEach((result) => {
          if (result && result.profile) {
            profilesMap.set(result.userId, result.profile);
          }
        });

        console.log('[DuelBattleFullscreen] ✅ Loaded profiles:', Array.from(profilesMap.entries()).map(([id, p]: [string, any]) => ({
          id,
          first_name: p.first_name,
          username: p.username,
        })));
        
        // Устанавливаем имена и фото
        if (myPlayer?.user_id) {
          const myProfile = profilesMap.get(myPlayer.user_id);
          if (myProfile) {
            const name = myProfile.first_name || myProfile.username || 'Вы';
            console.log('[DuelBattleFullscreen] ✅ Setting my name from direct query:', name);
            setMyName(name);
            if (myProfile.photo_url) {
              setMyPhotoUrl(getImageUrl(myProfile.photo_url));
            }
          } else {
            console.warn('[DuelBattleFullscreen] ⚠️ No profile found for my player');
            setMyName('Вы');
          }
        }

        if (opponent?.user_id) {
          const opponentProfile = profilesMap.get(opponent.user_id);
          if (opponentProfile) {
            const name = opponentProfile.first_name || opponentProfile.username || 'Соперник';
            console.log('[DuelBattleFullscreen] ✅ Setting opponent name from direct query:', name);
            setOpponentName(name);
            if (opponentProfile.photo_url) {
              setOpponentPhotoUrl(getImageUrl(opponentProfile.photo_url));
            }
          } else {
            console.warn('[DuelBattleFullscreen] ⚠️ No profile found for opponent');
            setOpponentName('Соперник');
          }
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

  const loadBetInfo = async () => {
    if (!duelId) {
      console.log('[DuelBattleFullscreen] ⚠️ No duelId provided for loadBetInfo');
      return;
    }
    
    const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;
    console.log('[DuelBattleFullscreen] 🔄 Loading bet info:', { duelId, profileId, isTelegram });
    
    try {
      const { data: duelData, error: duelError } = await supabase
        .from('duels')
        .select('bet_amount, host_user')
        .eq('id', duelId)
        .single();
      
      if (duelError) {
        console.error('[DuelBattleFullscreen] ❌ Error loading duel bet info:', {
          error: duelError,
          code: duelError.code,
          message: duelError.message,
          details: duelError.details,
          hint: duelError.hint,
          duelId,
          profileId,
          isTelegram
        });
        setBetInfo(null);
        return;
      }
      
      if (!duelData) {
        console.warn('[DuelBattleFullscreen] ⚠️ No duel data returned:', { duelId, profileId });
        setBetInfo(null);
        return;
      }
      
      if (!(duelData.bet_amount > 0)) {
        console.log('[DuelBattleFullscreen] ℹ️ No bet amount in duel:', { 
          betAmount: duelData.bet_amount, 
          duelId,
          profileId 
        });
        setBetInfo(null);
        return;
      }
      
      console.log('[DuelBattleFullscreen] ✅ Duel bet data loaded:', {
        betAmount: duelData.bet_amount,
        hostUser: duelData.host_user,
        isHost: duelData.host_user === profileId
      });
      
      const { data: betRow, error: betError } = await supabase
        .from('duel_bets')
        .select('host_insurance_enabled, host_coverage_rate, opponent_insurance_enabled, opponent_coverage_rate')
        .eq('duel_id', duelId)
        .maybeSingle();
      
      if (betError) {
        console.warn('[DuelBattleFullscreen] ⚠️ Error loading bet insurance info (non-critical):', betError);
        // Продолжаем без данных о страховке
      }
      
      const betInfoData = {
        betAmount: duelData.bet_amount,
        totalBank: duelData.bet_amount * 2,
        isHost: duelData.host_user === profileId,
        hostInsurance: !!betRow?.host_insurance_enabled,
        opponentInsurance: !!betRow?.opponent_insurance_enabled,
        coverageHost: betRow?.host_coverage_rate || 0,
        coverageOpponent: betRow?.opponent_coverage_rate || 0,
      };
      
      console.log('[DuelBattleFullscreen] ✅ Bet info set:', betInfoData);
      setBetInfo(betInfoData);
    } catch (error) {
      console.error('[DuelBattleFullscreen] ⚠️ Exception loading bet info:', {
        error,
        duelId,
        profileId,
        isTelegram,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      setBetInfo(null);
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
        console.error('[DuelBattleFullscreen] Error updating activity status to answering:', error);
      });
    }

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
    
    // CRITICAL: Increased delay to ensure last answer is fully saved in DB
    // This prevents race condition where second player's finish_duel is called
    // before their last answer is committed to database
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      // Mark that I finished
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'finish_duel', duel_id: duelId, profile_id: profileId },
      });

      if (error) throw error;

      console.log('[DuelBattleFullscreen] Finish duel response:', {
        finished: data?.finished,
        reason: data?.reason,
        message: data?.message,
        success: data?.success
      });

      // Server returns finished: true if both players finished, false if waiting
      // CRITICAL: If server says finished=true, go directly to results WITHOUT showing waiting screen
      if (data?.finished === true) {
        // Server confirmed both players finished - go to results IMMEDIATELY
        console.log('[DuelBattleFullscreen] ✅✅✅ Server confirmed both players finished, going directly to results');
        console.log('[DuelBattleFullscreen] Reason:', data?.reason || 'both_finished');
        
        // Prevent showing waiting screen
        setIsWaitingForOpponent(false);
        
        sounds.victory();
        toast.success('🏁 Дуэль завершена!', { duration: 2000 });
        
        // Go to results immediately - no waiting screen
        setTimeout(() => {
          console.log('[DuelBattleFullscreen] 🚀 Transitioning to results (both finished)');
          onDuelFinished();
        }, 500);
      } else {
        // Wait for opponent - show waiting screen ONLY if server says waiting
        console.log('[DuelBattleFullscreen] ⏳ Waiting for opponent to finish - showing waiting screen');
        console.log('[DuelBattleFullscreen] Server response:', data);
        
        setIsWaitingForOpponent(true);
        toast.info('⏳ Ты закончил первым! Ожидание соперника...', { duration: 4000 });
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] ❌ Error finishing duel:', error);
      toast.error('Ошибка завершения дуэли');
      // Reset waiting state on error
      setIsWaitingForOpponent(false);
      setHasFinishedMyQuestions(false);
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
    console.log('[DuelBattleFullscreen] 📦 Showing loading screen:', {
      loading,
      questionsCount: questions.length,
      duelId,
      profileId,
      duelStarted: state.duelStarted
    });
    
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Загрузка вопросов...</p>
          <p className="text-sm text-muted-foreground/70">
            {loading ? 'Загрузка данных...' : 'Ожидание вопросов...'}
          </p>
        </div>
      </div>
    );
  }

  // Проверяем валидность вопроса перед рендерингом
  if (!questions || questions.length === 0 || currentIndex < 0 || currentIndex >= questions.length) {
    // Если вопросы еще загружаются или индекс невалиден, показываем loading
    if (loading) {
      return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-lg text-muted-foreground">Загрузка вопросов...</p>
          </div>
        </div>
      );
    }
    // Если не загружается, но вопросов нет - ошибка
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <p className="text-lg text-destructive">Ошибка загрузки вопроса</p>
          <Button onClick={onExit}>Выйти</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    // Не логируем ошибку если это происходит во время загрузки
    if (!loading) {
      console.error('[DuelBattleFullscreen] Invalid question data:', {
        currentIndex,
        questionsLength: questions.length,
        currentQuestion,
        hasSnapshot: !!currentQuestion?.question_snapshot
      });
    }
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Загрузка вопроса...</p>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Вычисляем общий верхний отступ: системный safe area + отступ от нативной панели Telegram
  // ПОЛНЫЕ ОТСТУПЫ для игры дуэль (увеличены по просьбе пользователя)
  // + дополнительный отступ для встроенной навигации Telegram (кнопки Назад, три точки, стрелка)
  const TELEGRAM_NAV_HEIGHT = 95; // Высота встроенной навигации Telegram WebApp (увеличено для предотвращения перекрытия кнопкой "Назад")
  const telegramNavPadding = safeArea.platform === 'telegram' ? TELEGRAM_NAV_HEIGHT : 0;
  
  const totalTopPadding = Math.round(safeArea.top + safeArea.contentTop + telegramNavPadding);
  const totalBottomPadding = Math.round(safeArea.bottom + safeArea.contentBottom);
  const totalLeftPadding = Math.round(safeArea.left);
  const totalRightPadding = Math.round(safeArea.right);
  
  // Высота панели прогресс-бара (py-2 = 8px сверху/снизу + высота элементов ~44px = ~60px)
  const PROGRESS_BAR_HEIGHT = 60;

  // УБРАНО: Countdown экран - сразу начинаем битву без задержки

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

      {/* Unified Progress Bar - переиспользуемый компонент */}
      <div 
        className="absolute left-0 right-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/30"
        style={{
          top: `${totalTopPadding}px`,
          paddingLeft: `${totalLeftPadding}px`,
          paddingRight: `${totalRightPadding}px`,
          paddingTop: safeArea?.platform === 'telegram' ? '4px' : '8px',
          paddingBottom: safeArea?.platform === 'telegram' ? '4px' : '8px'
        }}
      >
        <div className="max-w-4xl mx-auto px-2">
          <QuestionProgressBar
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          onClose={safeArea?.platform !== 'ios' && safeArea?.platform !== 'android' && safeArea?.platform !== 'telegram' ? onExit : undefined}
          showClose={safeArea?.platform !== 'ios' && safeArea?.platform !== 'android' && safeArea?.platform !== 'telegram'}
          showQuestionMap={false}
          onToggleBookmark={profileId ? toggleBookmark : undefined}
          isBookmarked={isQuestionBookmarked}
          bookmarkLoading={bookmarkLoading}
          SettingsMenuComponent={
            <DuelSettingsMenu
              open={showDuelSettings}
              onOpenChange={setShowDuelSettings}
              voiceOver={voiceOver}
              onVoiceOverChange={setVoiceOver}
              ambientMusic={ambientMusic}
              onAmbientMusicChange={setAmbientMusic}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
            />
          }
          customLeftContent={
        <motion.div
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full bg-muted/80 backdrop-blur-sm border border-border shrink-0"
              animate={{ 
                scale: timeLeft < 10000 ? [1, 1.05, 1] : 1,
                borderColor: timeLeft < 10000 ? ['hsl(var(--border))', 'hsl(var(--destructive))', 'hsl(var(--border))'] : 'hsl(var(--border))'
              }}
              transition={{ duration: 0.5, repeat: timeLeft < 10000 ? Infinity : 0 }}
            >
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className={`font-mono font-bold text-xs md:text-sm ${timeLeft < 10000 ? 'text-destructive' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </motion.div>
          }
        />
        </div>
      </div>

      {/* Main Content */}
      {/* Используем единую систему отступов через CSS переменные */}
      {/* Динамический отступ от панели прогресса: totalTopPadding + высота панели (без зазора в Telegram) */}
      <div 
        className="min-h-full flex flex-col p-3 md:p-4 pb-6 max-w-4xl mx-auto"
        style={{
          paddingTop: `${totalTopPadding + PROGRESS_BAR_HEIGHT - (safeArea?.platform === 'telegram' ? 20 : 0)}px` // В Telegram убираем зазор между счетом и панелью прогресса (вычитаем 20px для плотного прилегания)
        }}
      >
        {/* Header - Scores & Boosts - Premium Design */}
        <div className={`flex items-center justify-between gap-3 flex-wrap ${safeArea?.platform === 'telegram' ? '-mt-4 mb-0' : 'mb-3 md:mb-4'}`}>
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
                {myPhotoUrl ? (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border-2 border-blue-500/50 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                    <img 
                      src={myPhotoUrl} 
                      alt={myName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                )}
                {/* Иконка страховки рядом с фото */}
                {myInsuranceActive && (
                  <div className="absolute -bottom-0.5 -left-0.5 z-10 bg-background rounded-full p-0.5 shadow-sm border border-green-500/50">
                    <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{myName}</p>
                  {myInsuranceActive && (
                    <Shield className="w-3 h-3 text-green-600 dark:text-green-400" title={`Страховка: ${myCoverageDisplay}%`} />
                  )}
                </div>
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
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  {opponentInsuranceActive && (
                    <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" title={`Страховка: ${opponentCoverageDisplay}%`} />
                  )}
                  <p 
                    className="text-xs font-medium text-muted-foreground truncate max-w-[120px]" 
                    title={opponentName}
                    key={`opponent-name-${opponentName}`}
                  >
                    {opponentName || 'Соперник'}
                  </p>
                </div>
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
                {opponentPhotoUrl ? (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border-2 border-orange-500/50 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                    <img 
                      src={opponentPhotoUrl} 
                      alt={opponentName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                    <Swords className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                )}
                
                {/* Индикатор активности соперника - компактный */}
                <div className="absolute -bottom-0.5 -right-0.5 z-10">
                  <OpponentActivityIndicator 
                    status={opponentActivityStatus}
                    showTooltip={true}
                  />
                </div>
                
                {/* Иконка страховки рядом с фото */}
                {opponentInsuranceActive && (
                  <div className="absolute -bottom-0.5 -left-0.5 z-10 bg-background rounded-full p-0.5 shadow-sm border border-blue-500/50">
                    <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                
                {/* Иконка молнии когда соперник отвечает */}
                {state.opponentAnswered && (
                  <motion.div
                    className="absolute -top-1 -right-1 z-20 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 border-2 border-white"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ 
                      scale: [0, 1.3, 1],
                      rotate: [180, 0],
                    }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ 
                      duration: 0.6,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                  >
                    <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-white fill-white" strokeWidth={2.5} />
                  </motion.div>
                )}
              </div>
            </motion.div>
            
            {/* Компактные индикаторы банка и награды - только для браузера */}
            {betInfo && safeArea?.platform !== 'telegram' && (
              <div className="flex items-center gap-2.5 ml-4">
                {/* Банк - компактный индикатор */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/20">
                  <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {betInfo.totalBank.toLocaleString('ru-RU')}
                  </span>
                </div>
                
                {/* SP награда - компактный индикатор */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-500/15 border border-purple-400/20">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                    +{seasonBonusDisplay}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Boosts & Combo */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Combo */}
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
            
            {/* Boosts - Premium Compact Design */}
        {boosts.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
            {boosts.map((boost) => {
              const boostConfig = {
                fifty_fifty: { icon: Sparkles, label: '50/50', gradient: 'from-yellow-400 via-orange-400 to-orange-500', bg: 'bg-gradient-to-br from-yellow-400/90 to-orange-500/90' },
                time_extend: { icon: Timer, label: '+30s', gradient: 'from-blue-400 via-cyan-400 to-cyan-500', bg: 'bg-gradient-to-br from-blue-400/90 to-cyan-500/90' },
                hint: { icon: HelpCircle, label: 'Hint', gradient: 'from-orange-400 via-amber-400 to-amber-500', bg: 'bg-gradient-to-br from-orange-400/90 to-amber-500/90' },
                skip: { icon: SkipForward, label: 'Skip', gradient: 'from-purple-400 via-pink-400 to-pink-500', bg: 'bg-gradient-to-br from-purple-400/90 to-pink-500/90' },
                translate: { icon: Globe, label: 'Translate', gradient: 'from-green-400 via-emerald-400 to-emerald-500', bg: 'bg-gradient-to-br from-green-400/90 to-emerald-500/90' },
              }[boost.boost_type] || { icon: Zap, label: boost.boost_type, gradient: 'from-gray-500 to-gray-600', bg: 'bg-gradient-to-br from-gray-500/90 to-gray-600/90' };
              
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
                        className="relative h-8 px-2.5 flex items-center gap-1 border transition-all duration-200 bg-gradient-to-br from-red-500 to-red-600 text-white border-white/30 shadow-sm hover:shadow-md"
                      >
                        <span className="text-xs">🇷🇺</span>
                        <span className="text-[10px] font-bold">RU</span>
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
                        className="relative h-8 px-2.5 flex items-center gap-1 border transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-white/30 shadow-sm hover:shadow-md"
                      >
                        <span className="text-xs">🇬🇧</span>
                        <span className="text-[10px] font-bold">EN</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setTranslatePopoverOpen(null)}
                        variant="outline"
                        size="sm"
                        className="relative h-8 w-8 p-0 flex items-center justify-center border transition-all duration-200 bg-muted/50 hover:bg-muted border-border"
                      >
                        <X className="h-3.5 w-3.5" />
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
                  className={`relative h-8 px-2 flex items-center gap-1 rounded-lg font-bold text-[11px] transition-all shadow-sm border ${
                    isDisabled
                      ? 'bg-muted/30 border-border/40 opacity-40 cursor-not-allowed grayscale'
                      : `${boostConfig.bg} text-white border-white/25 hover:shadow-md hover:border-white/40`
                  }`}
                >
                  <BoostIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap leading-none">{boostConfig.label}</span>
                  {boost.boost_type === 'translate' && !isDisabled && (
                    <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 shrink-0 ${translatePopoverOpen === boost.boost_type ? 'rotate-180' : ''}`} />
                  )}
                  <div className={`ml-0.5 h-4 px-1 flex items-center justify-center rounded text-white text-[9px] font-bold min-w-[16px] shrink-0 ${
                    isDisabled ? 'bg-white/10' : 'bg-white/30'
                  }`}>
                    {boost.quantity}
                  </div>
                </motion.button>
              );
            })}
              </div>
        )}
          </div>
        </div>

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
