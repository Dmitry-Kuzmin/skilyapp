import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { 
  Clock, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  EyeOff,
  Eye,
  Zap,
  Target,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '@/lib/sounds';
import { DuelWidget } from './DuelWidget';
import { createPortal } from 'react-dom';

interface OpponentAnswer {
  question_number: number;
  is_correct: boolean;
  is_skipped: boolean;
  time_taken_ms: number;
  points_awarded: number;
}

interface DuelWaitingReplayProps {
  duelId: string;
  myScore: number;
  totalQuestions: number;
  onDuelFinished: () => void;
  onHide?: (hidden: boolean) => void;
  onExpand?: () => void; // Callback when widget is expanded
  initialHidden?: boolean; // Start in hidden state if true
}

export function DuelWaitingReplay({ 
  duelId, 
  myScore, 
  totalQuestions,
  onDuelFinished,
  onHide,
  onExpand,
  initialHidden = false
}: DuelWaitingReplayProps) {
  const { profileId } = useUserContext();
  const [opponentAnswers, setOpponentAnswers] = useState<OpponentAnswer[]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentName, setOpponentName] = useState('Соперник');
  const [myName, setMyName] = useState('Вы');
  const [isHidden, setIsHidden] = useState(initialHidden);
  const [isDuelFinished, setIsDuelFinished] = useState(false);
  const [opponentStatus, setOpponentStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const isCheckingFinishedRef = useRef(false);
  const isDuelFinishedRef = useRef(false); // Use ref to avoid stale closures
  const onDuelFinishedCalledRef = useRef(false); // Предотвращаем множественные вызовы
  const opponentPlayerIdRef = useRef<string | null>(null);
  // КРИТИЧНО: Используем state вместо ref для myPlayerId, чтобы useDuelRealtime мог переподписаться
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const questionPositionsRef = useRef<Map<string, number>>(new Map()); // Cache question positions
  // Refs для функций чтобы использовать в fallback useEffect
  const loadOpponentDataRef = useRef<(() => Promise<void>) | null>(null);
  const checkIfOpponentFinishedRef = useRef<((force?: boolean) => Promise<void>) | null>(null);
  
  // Используем useDuelRealtime для получения статуса дуэли через Realtime (вместо периодических проверок)
  // КРИТИЧНО: Передаем myPlayerId как state, а не ref.current
  const { state: realtimeState } = useDuelRealtime(duelId, myPlayerId);

  // Оптимизированная функция для безопасного вызова onDuelFinished (только один раз)
  const safeCallOnDuelFinished = useCallback(() => {
    if (onDuelFinishedCalledRef.current) {
      console.log('[DuelWaitingReplay] ⚠️ onDuelFinished already called, skipping');
      return;
    }
    
    onDuelFinishedCalledRef.current = true;
    isDuelFinishedRef.current = true;
    setIsDuelFinished(true);
    
    try {
      sounds.victory();
      toast.success('🏁 Дуэль завершена!', {
        description: 'Переход к результатам...',
        duration: 1500,
      });
      
      console.log('[DuelWaitingReplay] ⚡ Calling onDuelFinished (single call)');
      onDuelFinished();
    } catch (error) {
      console.error('[DuelWaitingReplay] ❌ Error calling onDuelFinished:', error);
      // Reset ref on error so it can be retried
      onDuelFinishedCalledRef.current = false;
    }
  }, [onDuelFinished]);

  // Load question positions once at start - cache them for fast access
  // КРИТИЧНО: Должна быть вызвана ПЕРЕД загрузкой ответов соперника
  const loadQuestionPositions = async () => {
    try {
      console.log('[DuelWaitingReplay] 🔄 Loading question positions for duel:', duelId);
      
      const { data: questions, error } = await supabase
        .from('duel_questions')
        .select('id, position')
        .eq('duel_id', duelId)
        .order('position', { ascending: true });
      
      if (error) {
        console.error('[DuelWaitingReplay] ❌ Error loading question positions:', error);
        // Fallback: пробуем через Edge Function
        try {
          const { data: edgeData } = await supabase.functions.invoke('duel-manager', {
            body: { action: 'get_questions', duel_id: duelId, profile_id: profileId }
          });
          if (edgeData?.questions) {
            const positionsMap = new Map(edgeData.questions.map((q: any) => [q.id, q.position]));
            questionPositionsRef.current = positionsMap;
            console.log('[DuelWaitingReplay] ✅ Loaded question positions via Edge Function:', positionsMap.size);
          }
        } catch (fallbackError) {
          console.error('[DuelWaitingReplay] ❌ Fallback also failed:', fallbackError);
        }
        return;
      }
      
      if (questions && questions.length > 0) {
        const positionsMap = new Map(questions.map(q => [q.id, q.position]));
        questionPositionsRef.current = positionsMap;
        console.log('[DuelWaitingReplay] ✅ Loaded question positions:', {
          count: questions.length,
          positions: Array.from(positionsMap.entries()).slice(0, 5) // Показываем первые 5 для логов
        });
      } else {
        console.warn('[DuelWaitingReplay] ⚠️ No questions found for duel:', duelId);
      }
    } catch (error) {
      console.error('[DuelWaitingReplay] ❌ Exception loading question positions:', error);
    }
  };

  useEffect(() => {
    const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    
    // Load question positions first (critical for Telegram WebApp)
    // КРИТИЧНО: Позиции должны быть загружены ДО загрузки ответов
    const initialize = async () => {
      console.log('[DuelWaitingReplay] 🚀 Initializing component...');
      
      // Шаг 1: Загружаем позиции вопросов (критично!)
      await loadQuestionPositions();
      
      // Небольшая задержка чтобы убедиться что кэш заполнен
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Шаг 2: Загружаем данные соперника (использует кэш позиций)
      await loadOpponentData();
      
      // Шаг 3: Подписываемся на Realtime обновления
      subscribeToOpponentProgress();
      
      console.log('[DuelWaitingReplay] ✅ Initialization complete');
    };
    
    // Initial load with delay for Telegram to ensure WebApp is ready
    if (isTelegram) {
      // Увеличенная задержка для Telegram WebApp чтобы убедиться что все готово
      setTimeout(() => {
        initialize();
      }, 500);
    } else {
      initialize();
    }
    
    // УБРАНО: Fallback логика перенесена в отдельный useEffect после определения функций
  }, [duelId]);
  
  // FALLBACK для Telegram WebApp: Периодическая проверка статуса и загрузка ответов
  // Realtime может работать нестабильно в Telegram WebApp, поэтому нужен fallback
  // ВАЖНО: Этот useEffect использует функции определенные ниже через refs
  useEffect(() => {
    const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    
    if (!isTelegram || isDuelFinishedRef.current) {
      return; // Не нужен fallback или уже закончили
    }
    
    console.log('[DuelWaitingReplay] 🔄 Telegram WebApp detected - enabling fallback polling every 5 seconds');
    
    // ОПТИМИЗАЦИЯ: Увеличен интервал fallback polling с 1.5 до 5 секунд для экономии запросов
    // Realtime подписка должна обрабатывать большинство обновлений
    const fallbackInterval = setInterval(() => {
      if (isDuelFinishedRef.current) {
        // Уже закончили, не нужно проверять
        clearInterval(fallbackInterval);
        return;
      }
      
      console.log('[DuelWaitingReplay] 🔄 Fallback: Checking opponent progress (Telegram WebApp)');
      
      // Проверяем статус дуэли и загружаем ответы соперника
      // Используем refs для доступа к функциям
      if (loadOpponentDataRef.current) {
        loadOpponentDataRef.current().catch(err => {
          console.error('[DuelWaitingReplay] Fallback: Error loading opponent data:', err);
        });
      }
      
      // Также проверяем статус через Edge Function
      if (checkIfOpponentFinishedRef.current) {
        checkIfOpponentFinishedRef.current(false).catch(err => {
          console.error('[DuelWaitingReplay] Fallback: Error checking opponent finished:', err);
        });
      }
    }, 5000); // ОПТИМИЗАЦИЯ: Увеличено с 1.5 до 5 секунд для экономии Edge Function вызовов
    
    return () => {
      console.log('[DuelWaitingReplay] 🧹 Cleaning up fallback interval');
      clearInterval(fallbackInterval);
    };
  }, [duelId, isDuelFinished]); // Зависимости для перезапуска при изменении
  
  // ОПТИМИЗИРОВАНО: Используем Realtime статус дуэли для МГНОВЕННОГО перехода к результатам
  // Это основной и самый быстрый способ определения завершения дуэли
  useEffect(() => {
    if (realtimeState.duelFinished && !isDuelFinishedRef.current) {
      console.log('[DuelWaitingReplay] ⚡⚡⚡ REALTIME: Duel finished! Transitioning IMMEDIATELY');
      
      // Переходим мгновенно без задержек
      isDuelFinishedRef.current = true;
      setIsDuelFinished(true);
      
      // Звук и уведомление в фоне, не блокируем переход
      try {
        sounds.victory();
      } catch (err) {
        console.warn('[DuelWaitingReplay] Error playing victory sound:', err);
      }
      
      toast.success('🏁 Дуэль завершена!', {
        description: 'Переход к результатам...',
        duration: 1500,
      });
      
      // Мгновенный переход без задержек
      safeCallOnDuelFinished();
    }
  }, [realtimeState.duelFinished, safeCallOnDuelFinished]);
  
  // Используем Realtime счет соперника (вместо периодических проверок)
  useEffect(() => {
    if (typeof realtimeState.opponentScore === 'number' && realtimeState.opponentScore >= 0) {
      setOpponentScore(realtimeState.opponentScore);
    }
  }, [realtimeState.opponentScore]);

  // Проверка отключения соперника каждые 5 секунд
  useEffect(() => {
    if (isDuelFinished || !duelId || !profileId) return;
    
    const checkOpponentDisconnect = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'auto_finish_on_opponent_disconnect',
            duel_id: duelId,
            profile_id: profileId
          }
        });
        
        if (error) {
          console.error('[DuelWaitingReplay] Error checking opponent disconnect:', error);
          return;
        }
        
        // Обновляем статус соперника
        if (data?.opponent_online === false) {
          setOpponentStatus('offline');
        } else if (data?.opponent_online === true) {
          setOpponentStatus('online');
        }
        
        if (data?.finished) {
          console.log('[DuelWaitingReplay] ✅ Opponent disconnected, duel finished automatically');
          isDuelFinishedRef.current = true;
          setIsDuelFinished(true);
          
          toast.success('🏁 Соперник покинул игру', {
            description: 'Дуэль завершена автоматически',
            duration: 3000
          });
          
          safeCallOnDuelFinished();
        } else if (data?.cancelled) {
          console.log('[DuelWaitingReplay] ✅ Opponent disconnected before start, duel cancelled');
          isDuelFinishedRef.current = true;
          setIsDuelFinished(true);
          
          toast.info('Соперник не присоединился', {
            description: 'Ставка возвращена',
            duration: 3000
          });
          
          // Переходим к результатам с сообщением об отмене
          safeCallOnDuelFinished();
        }
      } catch (error) {
        console.error('[DuelWaitingReplay] Exception checking opponent disconnect:', error);
      }
    };
    
    // Проверяем сразу и затем каждые 5 секунд
    checkOpponentDisconnect();
    const interval = setInterval(checkOpponentDisconnect, 5000);
    
    return () => clearInterval(interval);
  }, [duelId, profileId, isDuelFinished, safeCallOnDuelFinished]);

  // Максимальное время ожидания - 2 минуты
  useEffect(() => {
    if (isDuelFinished || !duelId) return;
    
    const maxWaitTimeout = setTimeout(() => {
      if (!isDuelFinishedRef.current) {
        console.log('[DuelWaitingReplay] ⏰ Max wait time exceeded, forcing finish');
        
        // Проверяем статус соперника в последний раз
        supabase.functions.invoke('duel-manager', {
          body: {
            action: 'auto_finish_on_opponent_disconnect',
            duel_id: duelId,
            profile_id: profileId
          }
        }).then(({ data }) => {
          if (data?.finished || data?.cancelled) {
            isDuelFinishedRef.current = true;
            setIsDuelFinished(true);
            safeCallOnDuelFinished();
          } else {
            // Если соперник все еще онлайн, принудительно завершаем
            console.log('[DuelWaitingReplay] ⚠️ Forcing finish after timeout');
            isDuelFinishedRef.current = true;
            setIsDuelFinished(true);
            safeCallOnDuelFinished();
          }
        }).catch(error => {
          console.error('[DuelWaitingReplay] Error on timeout check:', error);
          // Принудительно завершаем при ошибке
          isDuelFinishedRef.current = true;
          setIsDuelFinished(true);
          safeCallOnDuelFinished();
        });
      }
    }, 120000); // 2 минуты
    
    return () => clearTimeout(maxWaitTimeout);
  }, [duelId, profileId, isDuelFinished, safeCallOnDuelFinished]);
  
  // ОПТИМИЗИРОВАНО: Проверка при каждом обновлении ответов соперника
  // Если у соперника есть все ответы - переходим мгновенно (Realtime уже должен был обновить статус)
  useEffect(() => {
    // Пропускаем если уже завершено или Realtime уже сообщил о завершении
    if (isDuelFinishedRef.current || realtimeState.duelFinished) {
      return;
    }
    
    if (opponentAnswers.length >= totalQuestions) {
      console.log('[DuelWaitingReplay] 🔥 Opponent has ALL answers! Transitioning immediately...');
      console.log('[DuelWaitingReplay] Opponent answers:', opponentAnswers.length, 'Required:', totalQuestions);
      
      // Переходим мгновенно - Realtime должен был уже обновить статус
      // Если нет - делаем быструю проверку без задержек
      const quickCheck = async () => {
        if (isDuelFinishedRef.current) return;
        
        try {
          // Быстрая проверка статуса через Edge Function (без задержек)
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'check_status',
              duel_id: duelId,
              profile_id: profileId
            }
          });
          
          // Если статус finished или есть ошибка - переходим сразу
          if (data?.status === 'finished' || data?.finished === true || error) {
            if (!isDuelFinishedRef.current) {
              console.log('[DuelWaitingReplay] ✅✅✅ Transitioning to results immediately');
              isDuelFinishedRef.current = true;
              setIsDuelFinished(true);
              
              try {
                sounds.victory();
              } catch (err) {
                console.warn('[DuelWaitingReplay] Error playing victory sound:', err);
              }
              
              toast.success('🏁 Дуэль завершена!', {
                description: 'Переход к результатам...',
                duration: 1500,
              });
              
              safeCallOnDuelFinished();
            }
          }
        } catch (err) {
          console.error('[DuelWaitingReplay] Error in quick check:', err);
          // При ошибке переходим сразу - у соперника все ответы
          if (!isDuelFinishedRef.current) {
            console.log('[DuelWaitingReplay] 🔥 Transitioning on error - opponent has all answers');
            isDuelFinishedRef.current = true;
            setIsDuelFinished(true);
            safeCallOnDuelFinished();
          }
        }
      };
      
      // Выполняем проверку без задержек
      quickCheck();
    }
  }, [opponentAnswers.length, totalQuestions, duelId, profileId, safeCallOnDuelFinished, realtimeState.duelFinished]);

  // Check if opponent finished all questions
  // КРИТИЧНО: Используем Edge Function вместо прямого запроса к БД (обходит RLS проблемы)
  const checkIfOpponentFinished = async (force = false) => {
    try {
      // Prevent multiple simultaneous checks
      if (isCheckingFinishedRef.current && !force) {
        console.log('[DuelWaitingReplay] Already checking, skipping...');
        return;
      }
      
      // Use ref to avoid stale closure issues
      if (isDuelFinishedRef.current || isDuelFinished) {
        console.log('[DuelWaitingReplay] Already finished, skipping check');
        return; // Already finished
      }

      isCheckingFinishedRef.current = true;

      // Используем Edge Function вместо прямого запроса (обходит 406 ошибки)
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'check_status',
          duel_id: duelId,
          profile_id: profileId
        }
      });

      if (edgeError) {
        console.error('[DuelWaitingReplay] ❌ Error checking status via Edge Function:', edgeError);
        isCheckingFinishedRef.current = false;
        return;
      }

      if (!edgeData) {
        console.warn('[DuelWaitingReplay] No duel data returned from Edge Function');
        isCheckingFinishedRef.current = false;
        return;
      }

      console.log('[DuelWaitingReplay] Status check result:', {
        status: edgeData.status,
        finished: edgeData.finished,
        opponentAnswers: opponentAnswers.length,
        totalQuestions
      });

      // Check duel status first - if finished, transition immediately
      if (edgeData.status === 'finished' || edgeData.finished === true) {
        console.log('[DuelWaitingReplay] ✅✅✅ Duel is finished! Transitioning to results');
        isCheckingFinishedRef.current = false;
        isDuelFinishedRef.current = true;
        setIsDuelFinished(true);
        
        try {
          sounds.victory();
        } catch (err) {
          console.warn('[DuelWaitingReplay] Error playing victory sound:', err);
        }
        
        toast.success('🏁 Дуэль завершена!', {
          description: 'Переход к результатам...',
          duration: 1500,
        });
        
        safeCallOnDuelFinished();
        return;
      }

      // If not finished, check opponent's answer count
      const duel = edgeData;

      const { data: players } = await supabase
        .from('duel_players')
        .select('id, user_id')
        .eq('duel_id', duelId);

      if (!players || players.length < 2) {
        isCheckingFinishedRef.current = false;
        return;
      }

      const opponent = players.find((p: any) => p.user_id !== profileId);
      if (!opponent) {
        isCheckingFinishedRef.current = false;
        return;
      }

      // Count opponent's answers - use actual data, not just count
      const { data: opponentAnswersData, count: opponentAnswersCount } = await supabase
        .from('duel_answers')
        .select('id', { count: 'exact' })
        .eq('player_id', opponent.id)
        .eq('duel_id', duelId);

      const opponentAnswers = opponentAnswersCount || 0;
      const opponentFinished = opponentAnswers >= duel.num_questions;

      console.log('[DuelWaitingReplay] Checking if opponent finished:', {
        opponentAnswers,
        required: duel.num_questions,
        duelStatus: duel.status,
        isDuelFinished,
        isDuelFinishedRef: isDuelFinishedRef.current,
        opponentFinished,
        willTransition: opponentFinished || duel.status === 'finished'
      });

      // PRIORITY: If duel status is 'finished', transition IMMEDIATELY (most reliable)
      if (duel.status === 'finished') {
        if (isDuelFinishedRef.current) {
          console.log('[DuelWaitingReplay] Already marked as finished (ref), skipping transition');
          isCheckingFinishedRef.current = false;
          return;
        }
        
        console.log('[DuelWaitingReplay] ⚡⚡⚡ Duel status is FINISHED - TRANSITIONING IMMEDIATELY', {
          opponentAnswers,
          required: duel.num_questions,
          duelStatus: duel.status
        });
        
        // Transition immediately - не ждем дополнительных проверок
        isDuelFinishedRef.current = true;
        setIsDuelFinished(true);
        isCheckingFinishedRef.current = false;
        
        sounds.victory();
        toast.success('🏁 Дуэль завершена!', {
          description: 'Переход к результатам...',
          duration: 1500,
        });
        
        // Call once using safe wrapper
        console.log('[DuelWaitingReplay] 🚀🚀🚀 Calling onDuelFinished (status finished)...');
        safeCallOnDuelFinished();
        
        return;
      }
      
      // Also check if opponent finished (even if status is not 'finished' yet)
      if (opponentFinished) {
        if (isDuelFinishedRef.current) {
          console.log('[DuelWaitingReplay] Already marked as finished (ref), skipping transition');
          isCheckingFinishedRef.current = false;
          return;
        }
        
        console.log('[DuelWaitingReplay] ✅ Opponent finished (by answer count)! Transitioning to results', {
          opponentAnswers,
          required: duel.num_questions,
          duelStatus: duel.status,
          opponentFinished
        });
        
        // Set both state and ref atomically
        isDuelFinishedRef.current = true;
        setIsDuelFinished(true);
        isCheckingFinishedRef.current = false;
        
        sounds.victory();
        toast.success('🏁 Соперник закончил!', {
          description: 'Переход к результатам...',
          duration: 1500,
        });
        
        // Call once using safe wrapper
        console.log('[DuelWaitingReplay] 🚀 Calling onDuelFinished (opponent finished by count)...');
        safeCallOnDuelFinished();
      } else {
        isCheckingFinishedRef.current = false;
      }
    } catch (error) {
      console.error('[DuelWaitingReplay] Error checking if opponent finished:', error);
      isCheckingFinishedRef.current = false;
    }
  };

  // Check if duel is really finished - verify opponent actually completed all questions
  const checkDuelStatus = async () => {
    try {
      // Skip if already finished
      if (isDuelFinishedRef.current) return;
      
      const { data: duel } = await supabase
        .from('duels')
        .select('status, num_questions')
        .eq('id', duelId)
        .single();

      if (!duel) {
        console.log('[DuelWaitingReplay] checkDuelStatus: Duel not found');
        return;
      }

      console.log('[DuelWaitingReplay] checkDuelStatus: Checking duel status:', duel.status);

      // CRITICAL: If status is 'finished', transition immediately (most reliable)
      if (duel.status === 'finished') {
        if (isDuelFinishedRef.current) {
          console.log('[DuelWaitingReplay] checkDuelStatus: Already finished (ref), skipping');
          return;
        }
        
        console.log('[DuelWaitingReplay] ✅✅✅ checkDuelStatus: Duel status is FINISHED - TRANSITIONING IMMEDIATELY');
        isDuelFinishedRef.current = true;
        setIsDuelFinished(true);
        sounds.victory();
        toast.success('🏁 Дуэль завершена!', {
          description: 'Смотрите результаты',
          duration: 2000,
        });
        
        // Call immediately - multiple times
        console.log('[DuelWaitingReplay] 🚀🚀🚀 checkDuelStatus: Calling onDuelFinished');
        safeCallOnDuelFinished();
        return;
      }

      // If status is not 'finished', check opponent's answers as fallback
      // Get opponent's player ID
      const { data: players } = await supabase
        .from('duel_players')
        .select('id, user_id')
        .eq('duel_id', duelId);

      if (!players || players.length < 2) {
        console.log('[DuelWaitingReplay] checkDuelStatus: Not enough players');
        return;
      }

      const opponent = players.find((p: any) => p.user_id !== profileId);
      if (!opponent) {
        console.log('[DuelWaitingReplay] checkDuelStatus: Opponent not found');
        return;
      }

      // Count opponent's actual answers
      const { count: opponentAnswers } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', opponent.id)
        .eq('duel_id', duelId);

      console.log('[DuelWaitingReplay] checkDuelStatus: Opponent answers check:', {
        opponentAnswers: opponentAnswers || 0,
        required: duel.num_questions,
        status: duel.status
      });

      // If opponent finished all questions, transition (even if status is not 'finished' yet)
      if ((opponentAnswers || 0) >= duel.num_questions) {
        if (isDuelFinishedRef.current) {
          console.log('[DuelWaitingReplay] checkDuelStatus: Already finished (ref check), skipping');
          return;
        }
        
        console.log('[DuelWaitingReplay] ✅ checkDuelStatus: Opponent finished all questions, transitioning to results');
        isDuelFinishedRef.current = true;
        setIsDuelFinished(true);
        sounds.victory();
        toast.success('🏁 Дуэль завершена!', {
          description: 'Смотрите результаты',
          duration: 3000,
        });
        
        // Call using safe wrapper
        console.log('[DuelWaitingReplay] ✅ checkDuelStatus: Calling onDuelFinished');
        safeCallOnDuelFinished();
      } else {
        console.log('[DuelWaitingReplay] checkDuelStatus: Opponent hasn\'t finished yet');
        // Also run checkIfOpponentFinished as additional check
        await checkIfOpponentFinished(true);
      }
    } catch (error) {
      console.error('[DuelWaitingReplay] Error checking duel status:', error);
    }
  };

  const loadOpponentData = async () => {
    try {
      // Используем Edge Function для получения игроков (обходит RLS проблемы)
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'get_players',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (!edgeError && edgeData?.players) {
          const players = edgeData.players;
          const opponent = players.find((p: any) => p.user_id !== profileId);
          const myPlayer = players.find((p: any) => p.user_id === profileId);
          
          if (opponent) {
            // Используем имя из Edge Function (уже обработано)
            const name = opponent.name || 'Соперник';
            console.log('[DuelWaitingReplay] Setting opponent name from Edge Function:', {
              name,
              opponent: { id: opponent.id, user_id: opponent.user_id, score: opponent.score }
            });
            
            // Проверяем, что имя не пустое и не "Игрок" (может быть реальное имя)
            if (name && name.trim() && name !== 'Игрок') {
              setOpponentName(name);
            } else {
              console.warn('[DuelWaitingReplay] Opponent name is empty or "Игрок", using "Соперник"');
              setOpponentName('Соперник');
            }
            setOpponentScore(opponent.score || 0);
          } else {
            console.warn('[DuelWaitingReplay] No opponent found in Edge Function response');
          }
          
          if (myPlayer) {
            const myName = myPlayer.name || 'Вы';
            if (myName && myName.trim() && myName !== 'Игрок') {
              setMyName(myName);
            } else {
              setMyName('Вы');
            }
          }
        } else {
          console.error('[DuelWaitingReplay] Error loading players via Edge Function:', edgeError);
          // Fallback к прямому запросу БЕЗ JOIN (чтобы избежать ошибки 400)
      const { data: players, error: playersError } = await supabase
        .from('duel_players')
        .select('id, user_id, score, correct_count')
        .eq('duel_id', duelId);

      if (playersError) {
        console.error('[DuelWaitingReplay] Error loading players:', playersError);
        return;
      }

      if (players && players.length >= 2) {
        const opponent = players.find(p => p.user_id !== profileId);
        const myPlayer = players.find(p => p.user_id === profileId);
        
        if (opponent) {
          setOpponentScore(opponent.score || 0);
        }
        
        // Загружаем профили ОТДЕЛЬНО по одному (чтобы избежать проблем с .in() и RLS)
        const userIds = [myPlayer?.user_id, opponent?.user_id].filter(Boolean) as string[];
        if (userIds.length > 0) {
          // Загружаем профили по одному через Promise.all
          const profilePromises = userIds.map(async (userId) => {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, first_name, username')
              .eq('id', userId)
              .single();
            
            if (error) {
              console.error(`[DuelWaitingReplay] ❌ Error loading profile for ${userId}:`, error);
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
          
          if (opponent?.user_id) {
            const opponentProfile = profilesMap.get(opponent.user_id);
            if (opponentProfile) {
              const name = opponentProfile.first_name || opponentProfile.username || 'Соперник';
              console.log('[DuelWaitingReplay] ✅ Setting opponent name from direct query:', name);
              setOpponentName(name);
            }
          }
          
          if (myPlayer?.user_id) {
            const myProfile = profilesMap.get(myPlayer.user_id);
            if (myProfile) {
              const name = myProfile.first_name || myProfile.username || 'Вы';
              setMyName(name);
            }
          }
        }
      }
        }
      } catch (error) {
        console.error('[DuelWaitingReplay] Exception loading players:', error);
        // Fallback к прямому запросу БЕЗ JOIN
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count')
          .eq('duel_id', duelId);

        if (playersError) {
          console.error('[DuelWaitingReplay] Error loading players in fallback:', playersError);
          return;
        }

        if (players && players.length >= 2) {
          const opponent = players.find(p => p.user_id !== profileId);
          const myPlayer = players.find(p => p.user_id === profileId);
          
          if (opponent) {
            setOpponentScore(opponent.score || 0);
          }
          
          // Загружаем профили ОТДЕЛЬНО по одному (чтобы избежать проблем с .in() и RLS)
          const userIds = [myPlayer?.user_id, opponent?.user_id].filter(Boolean) as string[];
          if (userIds.length > 0) {
            // Загружаем профили по одному через Promise.all
            const profilePromises = userIds.map(async (userId) => {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, first_name, username')
                .eq('id', userId)
                .single();
              
              if (error) {
                console.error(`[DuelWaitingReplay] ❌ Error loading profile for ${userId} (fallback):`, error);
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
            
            if (opponent?.user_id) {
              const opponentProfile = profilesMap.get(opponent.user_id);
              if (opponentProfile) {
                const name = opponentProfile.first_name || opponentProfile.username || 'Соперник';
                console.log('[DuelWaitingReplay] ✅ Setting opponent name from fallback query:', name);
                setOpponentName(name);
              }
            }
          }
        }
      }

      // Get opponent's answers so far
      // First, get all players to find opponent's player ID
      const { data: allPlayers } = await supabase
        .from('duel_players')
        .select('id, user_id, score')
        .eq('duel_id', duelId);
      
      if (!allPlayers || allPlayers.length < 2) {
        console.warn('[DuelWaitingReplay] Not enough players found');
        return;
      }
      
      const myPlayer = allPlayers.find(p => p.user_id === profileId);
      const opponent = allPlayers.find(p => p.user_id !== profileId);
      
      if (!myPlayer || !opponent) {
        console.warn('[DuelWaitingReplay] Could not find my player or opponent');
        return;
      }
      
      // Store player IDs: myPlayerId as state (for useDuelRealtime re-subscription), opponent as ref
      // КРИТИЧНО: setMyPlayerId триггерит ре-рендер и useDuelRealtime переподпишется с правильным playerId
      setMyPlayerId(myPlayer.id);
      opponentPlayerIdRef.current = opponent.id;
      
      console.log('[DuelWaitingReplay] Stored player IDs:', {
        myPlayerId: myPlayer.id,
        opponentPlayerId: opponentPlayerIdRef.current
      });
      
      // Update opponent score
      setOpponentScore(opponent.score || 0);
      
      // Get opponent's answers using opponent's player ID (without JOIN - faster and more reliable)
      const { data: answers, error: answersError } = await supabase
        .from('duel_answers')
        .select('*')
        .eq('duel_id', duelId)
        .eq('player_id', opponent.id)
        .order('created_at', { ascending: true });

      if (answersError) {
        console.error('[DuelWaitingReplay] Error loading opponent answers:', answersError);
        return;
      }

      if (answers && answers.length > 0) {
        // КРИТИЧНО: Если кэш позиций пуст, перезагружаем его
        if (questionPositionsRef.current.size === 0) {
          console.warn('[DuelWaitingReplay] ⚠️ Question positions cache is empty, reloading...');
          await loadQuestionPositions();
        }
        
        const formattedAnswers = answers.map((ans: any) => {
          // Use cached position from questionPositionsRef
          let position = questionPositionsRef.current.get(ans.duel_question_id);
          
          // Fallback: если позиция не найдена, пробуем получить из created_at (временной порядок)
          if (!position && answers.length > 0) {
            const sortedAnswers = [...answers].sort((a: any, b: any) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            position = sortedAnswers.findIndex((a: any) => a.id === ans.id) + 1;
            console.warn('[DuelWaitingReplay] Using fallback position from created_at:', {
              answerId: ans.id,
              questionId: ans.duel_question_id,
              fallbackPosition: position
            });
          }
          
          return {
            question_number: position || 0,
          is_correct: ans.is_correct,
          is_skipped: ans.is_skipped || false,
          time_taken_ms: ans.time_taken_ms,
          points_awarded: ans.points_awarded || 0,
          };
        })
        // НЕ фильтруем ответы без позиций - используем fallback позиции
        .sort((a, b) => a.question_number - b.question_number);
        
        console.log('[DuelWaitingReplay] ✅ Loaded opponent answers in loadOpponentData:', {
          count: formattedAnswers.length,
          questionNumbers: formattedAnswers.map((a: any) => a.question_number),
          totalQuestions,
          previousCount: opponentAnswers.length,
          opponentPlayerId: opponent.id,
          myPlayerId: myPlayer.id,
          allFinished: formattedAnswers.length >= totalQuestions,
          isTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp
        });
        
        // КРИТИЧНО: Всегда обновляем opponentAnswers, даже если количество не изменилось
        // Это важно для Telegram WebApp где Realtime может не работать
        // Используем функциональное обновление для гарантии актуального состояния
        setOpponentAnswers(prev => {
          // Проверяем, изменилось ли что-то
          const hasChanged = prev.length !== formattedAnswers.length || 
            prev.some((p, idx) => {
              const newAnswer = formattedAnswers[idx];
              return !newAnswer || p.question_number !== newAnswer.question_number || 
                     p.is_correct !== newAnswer.is_correct;
            });
          
          if (hasChanged) {
            console.log('[DuelWaitingReplay] 🔄 Updating opponentAnswers - state changed:', {
              prevCount: prev.length,
              newCount: formattedAnswers.length,
              prevQuestions: prev.map(a => a.question_number),
              newQuestions: formattedAnswers.map(a => a.question_number)
            });
            return formattedAnswers;
          } else {
            console.log('[DuelWaitingReplay] ⏸️ No change in opponentAnswers, keeping previous state');
            return prev;
          }
        });
        
        // CRITICAL: Check if opponent finished after loading answers
        if (formattedAnswers.length >= totalQuestions && !isDuelFinishedRef.current) {
          console.log('[DuelWaitingReplay] 🔥 Opponent has all answers in loadOpponentData - checking finish');
          // Small delay to ensure state is updated, then check
          setTimeout(() => {
            if (!isDuelFinishedRef.current) {
              checkIfOpponentFinished(true).catch(err => {
                console.error('[DuelWaitingReplay] Error checking finish in loadOpponentData:', err);
              });
            }
          }, 100);
        }
      } else {
        console.log('[DuelWaitingReplay] No opponent answers found yet');
        // Reset to empty array if no answers
        setOpponentAnswers([]);
      }
    } catch (error) {
      console.error('Error loading opponent data:', error);
    }
  };

  const getMyPlayerId = async () => {
    const { data } = await supabase
      .from('duel_players')
      .select('id')
      .eq('duel_id', duelId)
      .eq('user_id', profileId)
      .single();
    return data?.id;
  };

  const subscribeToOpponentProgress = async () => {
    const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    
    // Get all players to find opponent's player ID
    const { data: allPlayers } = await supabase
      .from('duel_players')
      .select('id, user_id')
      .eq('duel_id', duelId);
    
    if (!allPlayers || allPlayers.length < 2) {
      console.error('[DuelWaitingReplay] Could not get players for subscription');
      return;
    }
    
    const myPlayer = allPlayers.find(p => p.user_id === profileId);
    const opponent = allPlayers.find(p => p.user_id !== profileId);
    
    if (!myPlayer || !opponent) {
      console.error('[DuelWaitingReplay] Could not find my player or opponent for subscription');
      return;
    }
    
    const myPlayerIdLocal = myPlayer.id;
    const opponentPlayerId = opponent.id;
    
    // Update state and ref
    // КРИТИЧНО: setMyPlayerId триггерит ре-рендер и useDuelRealtime переподпишется
    setMyPlayerId(myPlayerIdLocal);
    opponentPlayerIdRef.current = opponentPlayerId;
    
    console.log('[DuelWaitingReplay] Subscribing to opponent progress:', {
      duelId,
      myPlayerId: myPlayerIdLocal,
      opponentPlayerId,
      isTelegram
    });

    // Subscribe to new answers from opponent
    const channel = supabase
      .channel(`duel_waiting_${duelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_answers',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          const answer = payload.new as any;
          
          // Use ref to get current opponent player ID (handles closure issues)
          const currentOpponentPlayerId = opponentPlayerIdRef.current;
          
          if (!currentOpponentPlayerId) {
            console.warn('[DuelWaitingReplay] Opponent player ID not set in subscription');
            return;
          }
          
          // Check if it's opponent's answer using opponent player ID from ref
          if (answer.player_id === currentOpponentPlayerId) {
            console.log('[DuelWaitingReplay] ✅ Opponent answered!', {
              answerId: answer.id,
              playerId: answer.player_id,
              opponentPlayerId: currentOpponentPlayerId,
              questionId: answer.duel_question_id,
              isCorrect: answer.is_correct
            });

            // Get question position from cache (much faster than DB query)
            const position = questionPositionsRef.current.get(answer.duel_question_id);

            if (position) {
              const newAnswer: OpponentAnswer = {
                question_number: position,
                is_correct: answer.is_correct,
                is_skipped: answer.is_skipped || false,
                time_taken_ms: answer.time_taken_ms,
                points_awarded: answer.points_awarded || 0,
              };

              // УБРАНО: Прямой запрос к базе для обновления счета
              // Теперь счет обновляется через Realtime подписку на duel_players (useDuelRealtime)
              // Это намного эффективнее и быстрее

              // NOTE: Уведомления показываются через useNotifications hook, не нужно дублировать здесь
              // Только обновляем состояние и данные

              // Reload all answers from database to ensure we have the latest state
              // This is more reliable than trying to update state manually
              // Using cached positions (no JOIN needed - faster in Telegram WebApp)
              try {
                const { data: reloadedAnswers, error: reloadError } = await supabase
                  .from('duel_answers')
                  .select('*')
                  .eq('duel_id', duelId)
                  .eq('player_id', currentOpponentPlayerId)
                  .order('created_at', { ascending: true });
                
                if (reloadError) {
                  console.error('[DuelWaitingReplay] Error reloading answers:', reloadError);
                  // Fallback: update state manually
                  setOpponentAnswers(prev => {
                    const existing = prev.find(a => a.question_number === position);
                    if (existing) {
                      console.log('[DuelWaitingReplay] Answer already exists, skipping:', position);
                      return prev;
                    }
                    const updated = [...prev, newAnswer].sort((a, b) => a.question_number - b.question_number);
                    return updated;
                  });
                } else if (reloadedAnswers && reloadedAnswers.length > 0) {
                  const formatted = reloadedAnswers.map((ans: any) => {
                    const pos = questionPositionsRef.current.get(ans.duel_question_id);
                    if (!pos) {
                      console.warn('[DuelWaitingReplay] Answer without cached position in reload:', {
                        answerId: ans.id,
                        questionId: ans.duel_question_id
                      });
                    }
                    return {
                      question_number: pos || 0,
                      is_correct: ans.is_correct,
                      is_skipped: ans.is_skipped || false,
                      time_taken_ms: ans.time_taken_ms,
                      points_awarded: ans.points_awarded || 0,
                    };
                  })
                  .filter((a: any) => a.question_number > 0)
                  .sort((a, b) => a.question_number - b.question_number);
              
                  console.log('[DuelWaitingReplay] ✅ Reloaded opponent answers after new answer:', {
                    count: formatted.length,
                    questionNumbers: formatted.map(a => a.question_number),
                    totalQuestions,
                    allFinished: formatted.length >= totalQuestions
                  });
                  
                  setOpponentAnswers(formatted);
                  
                  // КРИТИЧНО: Если соперник ответил на все вопросы - сразу переходим к результатам
                  if (formatted.length >= totalQuestions && !isDuelFinishedRef.current) {
                    console.log('[DuelWaitingReplay] 🔥🔥🔥 Opponent answered ALL questions in reload! Transitioning IMMEDIATELY', {
                      answerCount: formatted.length,
                      totalQuestions
                    });
                    
                    isDuelFinishedRef.current = true;
                    setIsDuelFinished(true);
                    
                    sounds.victory();
                    toast.success('🏁 Соперник закончил!', {
                      description: 'Переход к результатам...',
                      duration: 1500,
                    });
                
                    // Вызываем onDuelFinished немедленно
                    safeCallOnDuelFinished();
                    
                    // Также проверяем статус через Edge Function для надежности
                  setTimeout(() => {
                      supabase.functions.invoke('duel-manager', {
                        body: {
                          action: 'check_status',
                          duel_id: duelId,
                          profile_id: profileId
                        }
                      }).then(({ data }) => {
                        if (data?.status === 'finished') {
                          console.log('[DuelWaitingReplay] ✅ Edge Function confirms duel is finished');
                        }
                      }).catch(err => {
                        console.error('[DuelWaitingReplay] Error in final status check:', err);
                      });
                    }, 500);
                  }
                } else {
                  console.warn('[DuelWaitingReplay] No answers found after reload');
                  // Fallback: update state manually
                  setOpponentAnswers(prev => {
                    const existing = prev.find(a => a.question_number === position);
                    if (existing) return prev;
                    const updated = [...prev, newAnswer].sort((a, b) => a.question_number - b.question_number);
                return updated;
              });
                }
              } catch (error) {
                console.error('[DuelWaitingReplay] Exception reloading answers:', error);
                // Fallback: update state manually
                setOpponentAnswers(prev => {
                  const existing = prev.find(a => a.question_number === position);
                  if (existing) return prev;
                  const updated = [...prev, newAnswer].sort((a, b) => a.question_number - b.question_number);
                  return updated;
                });
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          const updatedPlayer = payload.new as any;
          
          // Use ref to get current opponent player ID
          const currentOpponentPlayerId = opponentPlayerIdRef.current;
          
          if (!currentOpponentPlayerId) {
            return;
          }
          
          // Check if this is opponent's score update using opponent player ID from ref
          if (updatedPlayer.id === currentOpponentPlayerId) {
            console.log('[DuelWaitingReplay] ✅ Opponent score UPDATE:', {
              playerId: updatedPlayer.id,
              opponentPlayerId: currentOpponentPlayerId,
              score: updatedPlayer.score,
              correctCount: updatedPlayer.correct_count
            });
            // Use server score as source of truth
            setOpponentScore(updatedPlayer.score || 0);
            
            // If opponent's correct_count is set, check if they finished
            // Get totalQuestions from duel to avoid stale closure
            if (updatedPlayer.correct_count !== undefined && !isDuelFinishedRef.current) {
              // Get duel to check total questions
              const { data: duel } = await supabase
                .from('duels')
                .select('num_questions')
                .eq('id', duelId)
                .single();
              
              if (duel && updatedPlayer.correct_count >= duel.num_questions) {
                console.log('[DuelWaitingReplay] 🎯 Opponent correct_count matches totalQuestions - triggering finish check', {
                  correctCount: updatedPlayer.correct_count,
                  totalQuestions: duel.num_questions
                });
                setTimeout(() => {
                  if (!isDuelFinishedRef.current) {
                    checkIfOpponentFinished(true).catch(err => {
                      console.error('[DuelWaitingReplay] Error checking finish on score update:', err);
                    });
                  }
                }, 100);
              }
            }
          }
        }
      )
      // УБРАНО: Подписка на UPDATE дуэли - теперь используется useDuelRealtime
      // useDuelRealtime уже подписывается на изменения статуса дуэли через Realtime
      // Это предотвращает дублирование подписок и улучшает производительность
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };
  
  // Сохраняем ссылки на функции для fallback механизма (после их определения)
  useEffect(() => {
    // Сохраняем ссылки на функции для использования в fallback useEffect
    loadOpponentDataRef.current = loadOpponentData;
    checkIfOpponentFinishedRef.current = checkIfOpponentFinished;
  }, [duelId]); // Пересохраняем при изменении duelId

  const progress = (opponentAnswers.length / totalQuestions) * 100;

  // Notify parent when hide state changes
  useEffect(() => {
    if (onHide) {
      onHide(isHidden);
    }
  }, [isHidden, onHide]);

  // When hidden, show widget as portal and return null so parent can show normal content
  if (isHidden && !isDuelFinished) {
    // Render widget via portal to document.body
    // Portal renders to body, but component returns null so parent can show menu
    return createPortal(
      <DuelWidget
        myScore={myScore}
        opponentScore={opponentScore}
        myName={myName}
        opponentName={opponentName}
        progress={progress}
        totalQuestions={totalQuestions}
        currentQuestion={opponentAnswers.length + 1}
        onExpand={() => {
          setIsHidden(false);
          // Notify parent to switch back to battle mode
          if (onHide) {
            onHide(false);
          }
          // Also call onExpand callback if provided
          if (onExpand) {
            onExpand();
          }
        }}
      />,
      document.body
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4"
    >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl space-y-6"
            >
        {/* Header */}
        <Card className="p-6 bg-card border border-border/50 shadow-lg">
          <div className="text-center space-y-5">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Trophy className="w-8 h-8 text-white" />
            </motion.div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Вы закончили первым!</h2>
              <p className="text-muted-foreground">
                Ожидание ответа от <span className="font-semibold text-foreground">{opponentName}</span>
              </p>
              
              {/* Индикатор статуса соперника */}
              {opponentStatus === 'offline' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                >
                  <p className="text-red-600 dark:text-red-400 font-semibold text-sm flex items-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    ⚠️ Соперник офлайн
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Дуэль будет завершена автоматически через несколько секунд
                  </p>
                </motion.div>
              )}
            </div>

            {/* Scores */}
            <div className="flex items-center justify-center gap-8 pt-3 pb-2">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Вы</div>
                <motion.div 
                  className="text-3xl font-black text-primary"
                  key={myScore}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {myScore}
                </motion.div>
              </div>
              <div className="text-xl font-bold text-muted-foreground/40">VS</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">{opponentName}</div>
                <motion.div 
                  className="text-3xl font-black text-secondary"
                  key={opponentScore}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {opponentScore}
                </motion.div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Прогресс: {opponentAnswers.length}/{totalQuestions}
                </span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Hide/Show Toggle */}
        <div className="flex justify-center">
          <Button
            variant={isHidden ? "default" : "outline"}
            size="lg"
            onClick={() => setIsHidden(!isHidden)}
            className="gap-2"
          >
            {isHidden ? (
              <>
                <Eye className="w-5 h-5" />
                Показать прогресс
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5" />
                Скрыть игру
              </>
            )}
          </Button>
        </div>

        {/* Compact Live Progress */}
        <AnimatePresence>
          {!isHidden && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                {/* Visual Progress Timeline */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Ход игры {opponentName !== 'Соперник' ? opponentName : ''}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {opponentAnswers.length} / {totalQuestions}
                    </span>
                  </div>
                  
                  {/* Compact Visual Timeline */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: totalQuestions }).map((_, idx) => {
                      const questionNum = idx + 1;
                      const answer = opponentAnswers.find(a => a.question_number === questionNum);
                      const isAnswered = !!answer;
                      
                      // Determine current question: next unanswered question after all answered ones
                      // Get all answered question numbers sorted
                      const answeredQuestionNumbers = opponentAnswers
                        .map(a => a.question_number)
                        .filter(n => n >= 1 && n <= totalQuestions)
                        .sort((a, b) => a - b);
                      
                      // Current question is the next unanswered question
                      // If answered [1, 2, 3, 4], current is 5
                      // If answered [1, 2, 4, 5], current is 3 (first gap)
                      // If all answered, no current question
                      let currentQuestionNumber: number | null = null;
                      if (answeredQuestionNumbers.length < totalQuestions) {
                        // Find first unanswered question
                        for (let i = 1; i <= totalQuestions; i++) {
                          if (!answeredQuestionNumbers.includes(i)) {
                            currentQuestionNumber = i;
                            break;
                          }
                        }
                      }
                      
                      const isCurrent = currentQuestionNumber !== null && questionNum === currentQuestionNumber && !isAnswered;

                      return (
                        <motion.div
                          key={questionNum}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                            isAnswered 
                              ? answer.is_skipped
                                ? 'bg-muted text-muted-foreground'
                                : answer.is_correct 
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                              : isCurrent
                              ? 'bg-primary/20 text-primary border-2 border-primary animate-pulse'
                              : 'bg-muted/30 text-muted-foreground border border-border/30'
                          }`}
                          title={
                            isAnswered 
                              ? answer.is_skipped
                                ? `Вопрос ${questionNum}: Пропущено`
                                : answer.is_correct 
                                ? `Вопрос ${questionNum}: Правильно (+${answer.points_awarded})`
                                : `Вопрос ${questionNum}: Неправильно`
                              : isCurrent
                              ? 'Отвечает...'
                              : 'Ожидание'
                          }
                        >
                          {isAnswered ? (
                            answer.is_skipped ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : answer.is_correct ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            questionNum
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity - Last 3 Answers */}
                {opponentAnswers.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-3">
                      Последние ответы
                    </div>
                    {opponentAnswers.slice(-3).reverse().map((answer, idx) => (
                      <motion.div
                        key={`${answer.question_number}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          answer.is_skipped
                            ? 'bg-muted/20'
                            : answer.is_correct 
                            ? 'bg-green-500/10' 
                            : 'bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {answer.is_skipped ? (
                            <>
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Вопрос {answer.question_number} пропущен
                              </span>
                            </>
                          ) : answer.is_correct ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="font-medium">
                                Вопрос {answer.question_number} — Правильно
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="font-medium">
                                Вопрос {answer.question_number} — Неправильно
                              </span>
                            </>
                          )}
                        </div>
                        {!answer.is_skipped && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(answer.time_taken_ms / 1000).toFixed(1)}с</span>
                            {answer.points_awarded > 0 && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                +{answer.points_awarded}
                              </Badge>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Mode Message */}
        {isHidden && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Card className="p-8 bg-muted/50">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <EyeOff className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium mb-2">Игра скрыта</p>
              <p className="text-sm text-muted-foreground">
                Вы получите уведомление, когда соперник закончит
              </p>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
