import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Users } from 'lucide-react';
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
import { BoostFeedback } from './BoostFeedback';
import { NotificationToast } from '@/components/NotificationToast';
import { DuelWaitingReplay } from './DuelWaitingReplay';
import { DuelWidget } from './DuelWidget';
import Layout from '@/components/Layout';
import { getImageUrl } from '@/utils/imageUtils';
import { QuestionProgressBar } from '@/components/QuestionProgressBar';
import { DuelSettingsMenu } from './DuelSettingsMenu';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { OpponentActivityIndicator } from './OpponentActivityIndicator';
import { useDuelData } from '@/hooks/useDuelData';
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram';
import { DuelTimer } from './DuelTimer';
import { DuelScoreBoard } from './DuelScoreBoard';
import { DuelBoostsPanel } from './DuelBoostsPanel';
import { DuelQuestionCard } from './DuelQuestionCard';
import { useDuelGameState } from '@/hooks/useDuelGameState';
import { useDuelSync } from '@/hooks/useDuelSync';
import { useDuelSettings } from '@/hooks/useDuelSettings';
import { useQuestionBookmark } from '@/hooks/useQuestionBookmark';
import { useDuelTimeout } from '@/hooks/useDuelTimeout';
import { useDuelGame } from '@/hooks/useDuelGame';
import { useBotOpponent } from '@/hooks/useBotOpponent';
// 🆕 Компоненты атак
import { OilSplashAttack } from './attacks/OilSplashAttack';
import { PoliceBackdoorAttack } from './attacks/PoliceBackdoorAttack';
import { InputLagWrapper } from './attacks/InputLagWrapper';

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
  // КРИТИЧНО: Логируем duelId при монтировании для отладки
  useEffect(() => {
    if (duelId) {
      console.log('[DuelBattleFullscreen] 🔍 DUEL_ID:', duelId);
      console.log('[DuelBattleFullscreen] 📋 SQL запрос для проверки exploits:');
      console.log(`SELECT * FROM duel_active_exploits WHERE duel_id = '${duelId}' ORDER BY activated_at DESC LIMIT 5;`);
    }
  }, [duelId]);

  const [isWaitingHidden, setIsWaitingHidden] = useState(false);
  const { profileId } = useUserContext();
  const { activeDuel, saveActiveDuel, updateActiveDuel } = useActiveDuel();
  const { fetchQuestions, fetchPlayers, fetchBoostInventory, fetchBetInfo } = useDuelData(duelId, profileId);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { state, refreshExploits } = useDuelRealtime(duelId, myPlayerId);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  
  // 🆕 Состояние для активных exploits
  const [activeExploits, setActiveExploits] = useState<Map<string, { expiresAt: number; passed?: boolean }>>(new Map());
  
  // 🆕 Обработка активных exploits из Realtime
  useEffect(() => {
    // КРИТИЧНО: Детальное логирование для отладки в Telegram (ВСЕГДА, не только в dev)
    console.log('[DuelBattleFullscreen] 🔄 activeExploits update:', {
      stateActiveExploits: state.activeExploits,
      stateActiveExploitsLength: state.activeExploits?.length || 0,
      stateActiveExploitsTypes: state.activeExploits?.map(e => e.type) || [],
      currentActiveExploits: Array.from(activeExploits.entries()),
      screenInjector: state.activeExploits?.find(e => e.type === 'screen_injector'),
      screenInjectorDetails: state.activeExploits?.find(e => e.type === 'screen_injector') ? {
        type: state.activeExploits.find(e => e.type === 'screen_injector')?.type,
        expiresAt: state.activeExploits.find(e => e.type === 'screen_injector')?.expiresAt,
        expiresAtISO: new Date(state.activeExploits.find(e => e.type === 'screen_injector')?.expiresAt || 0).toISOString(),
        receivedAt: state.activeExploits.find(e => e.type === 'screen_injector')?.receivedAt
      } : null
    });

    if (!state.activeExploits || state.activeExploits.length === 0) {
      setActiveExploits(new Map());
      return;
    }

    // КРИТИЧНО: Используем функциональное обновление для сохранения passed статуса
    setActiveExploits(prev => {
      const exploitsMap = new Map<string, { expiresAt: number; passed?: boolean }>();
      
      state.activeExploits.forEach(exploit => {
        const existing = prev.get(exploit.type);
        const isNew = !existing;
        
        exploitsMap.set(exploit.type, {
          expiresAt: exploit.expiresAt,
          passed: existing?.passed || false, // Сохраняем passed статус если был
        });
        
        // КРИТИЧНО: Логируем добавление нового exploit (ВСЕГДА, не только в dev)
        if (isNew) {
          console.log('[DuelBattleFullscreen] ✅ New exploit added to Map:', exploit.type, {
            expiresAt: new Date(exploit.expiresAt).toISOString(),
            receivedAt: new Date(exploit.receivedAt).toISOString(),
            expiresIn: Math.round((exploit.expiresAt - Date.now()) / 1000) + 's'
          });
        }
      });
      
      console.log('[DuelBattleFullscreen] 📊 Final exploits Map:', {
        mapSize: exploitsMap.size,
        mapEntries: Array.from(exploitsMap.entries()).map(([type, data]) => ({
          type,
          expiresAt: new Date(data.expiresAt).toISOString(),
          passed: data.passed
        }))
      });
      
      return exploitsMap;
    });
  }, [state.activeExploits]);

  // 🆕 Очистка истекших exploits
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveExploits(prev => {
        const updated = new Map(prev);
        let changed = false;
        prev.forEach((value, key) => {
          if (value.expiresAt <= now) {
            updated.delete(key);
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000); // Проверяем каждую секунду

    return () => clearInterval(interval);
  }, []);

  // Initialize notifications for this duel
  useNotifications({ showToasts: true, playSounds: true });

  // Get safe area insets from Telegram WebApp API
  const safeArea = useSafeArea();

  // ОПТИМИЗАЦИЯ: Используем хук для управления состоянием игры
  const gameState = useDuelGameState();
  const {
    questions,
    setQuestions,
    currentIndex,
    setCurrentIndex,
    timeLeft,
    setTimeLeft,
    selectedAnswer,
    setSelectedAnswer,
    isAnswered,
    setIsAnswered,
    myScore,
    setMyScore,
    opponentScore,
    setOpponentScore,
    combo,
    setCombo,
    boosts,
    setBoosts,
    usedBoosts,
    setUsedBoosts,
    eliminatedOptions,
    setEliminatedOptions,
    translationLanguage,
    setTranslationLanguage,
    loading,
    setLoading,
    isLoadingRef,
    isWaitingForOpponent,
    setIsWaitingForOpponent,
    hasFinishedMyQuestions,
    setHasFinishedMyQuestions,
    isFinishingRef,
    isVerifyingRef,
    hasTransitionedRef,
  } = gameState;

  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    icon?: string;
  }>>([]);
  const [translatePopoverOpen, setTranslatePopoverOpen] = useState<string | null>(null);
  // 🆕 Состояние для визуальной обратной связи при использовании буста
  const [boostFeedback, setBoostFeedback] = useState<{ isActive: boolean; boostName: string; boostType: string }>({
    isActive: false,
    boostName: '',
    boostType: '',
  });
  const [myName, setMyName] = useState<string>('Ты');
  const [opponentName, setOpponentName] = useState<string>('Соперник');
  const [myPhotoUrl, setMyPhotoUrl] = useState<string | null>(null);
  const [opponentPhotoUrl, setOpponentPhotoUrl] = useState<string | null>(null);
  const [opponentActivityStatus, setOpponentActivityStatus] = useState<'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline'>('online');
  const [opponentLastSeen, setOpponentLastSeen] = useState<Date | null>(null);
  const previousActivityStatusRef = useRef<'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline'>('online');

  // Settings states
  const [showDuelSettings, setShowDuelSettings] = useState(false);
  // ОПТИМИЗАЦИЯ: Используем хук для управления настройками
  const { voiceOver, setVoiceOver, ambientMusic, setAmbientMusic, fontSize, setFontSize } = useDuelSettings();
  // ОПТИМИЗАЦИЯ: Используем хук для управления закладками
  const { isQuestionBookmarked, bookmarkLoading, toggleBookmark } = useQuestionBookmark({
    profileId,
    questions,
    currentIndex,
  });
  const [betInfo, setBetInfo] = useState<{
    betAmount: number;
    totalBank: number;
    isHost: boolean;
    hostInsurance: boolean;
    opponentInsurance: boolean;
    coverageHost: number;
    coverageOpponent: number;
  } | null>(null);
  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления для предотвращения лишних пересчетов
  const myInsuranceActive = useMemo(() => 
    betInfo ? (betInfo.isHost ? betInfo.hostInsurance : betInfo.opponentInsurance) : false,
    [betInfo]
  );
  const myCoverageDisplay = useMemo(() => 
    betInfo ? Math.round(((betInfo.isHost ? betInfo.coverageHost : betInfo.coverageOpponent) || 0) * 100) : 0,
    [betInfo]
  );
  const opponentInsuranceActive = useMemo(() => 
    betInfo ? (betInfo.isHost ? betInfo.opponentInsurance : betInfo.hostInsurance) : false,
    [betInfo]
  );
  const opponentCoverageDisplay = useMemo(() => 
    betInfo ? Math.round(((betInfo.isHost ? betInfo.coverageOpponent : betInfo.coverageHost) || 0) * 100) : 0,
    [betInfo]
  );
  const seasonBonusDisplay = useMemo(() => 
    betInfo ? getSeasonBonusDisplay(betInfo.betAmount) : 0,
    [betInfo]
  );

  // ОПТИМИЗАЦИЯ: Используем хук для синхронизации данных
  const { syncBoostInventory, syncBetInfo } = useDuelSync({
    fetchBoostInventory,
    fetchBetInfo,
    setBoosts,
    setBetInfo,
  });

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию для перехода к следующему вопросу (должно быть выше useDuelGame)
  const moveToNextQuestion = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setTimeLeft(60000);
    setUsedBoosts([]);
    setEliminatedOptions([]);
  }, [setCurrentIndex, setIsAnswered, setSelectedAnswer, setTimeLeft, setUsedBoosts, setEliminatedOptions]);

  // ОПТИМИЗАЦИЯ: Мемоизируем finishDuel с useCallback (должно быть выше useDuelGame)
  const finishDuel = useCallback(async () => {
    log('[DuelBattleFullscreen] Finishing duel - I completed all questions');

    // IMPROVED: Don't set hasFinishedMyQuestions here - it's already set when showing waiting screen
    // setHasFinishedMyQuestions(true); // ← REMOVED (already set earlier)

    // IMPROVED: Reduced delay from 500ms to 300ms
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: { action: 'finish_duel', duel_id: duelId, profile_id: profileId },
      });

      if (error) throw error;

      log('[DuelBattleFullscreen] Finish duel response:', {
        finished: data?.finished,
        reason: data?.reason,
        message: data?.message,
        success: data?.success
      });

      // CRITICAL FIX: Only transition to results if both players finished
      // Don't change waiting state if we're already waiting
      if (data?.finished === true) {
        log('[DuelBattleFullscreen] ✅ Both players finished, going to results');

        // Hide waiting screen and go to results
        setIsWaitingForOpponent(false);
        sounds.victory();
        toast.success('🏁 Финиш! Подводим итоги...', { duration: 2000 });

        setTimeout(() => {
          log('[DuelBattleFullscreen] 🚀 Transitioning to results');
          onDuelFinished();
        }, 500);
      } else {
        // IMPROVED: Show waiting screen ONLY if opponent hasn't finished yet
        log('[DuelBattleFullscreen] ⏳ Opponent still playing - showing waiting screen');
        setIsWaitingForOpponent(true);
        toast.info('⏳ Ждём соперника...', { duration: 3000 });
      }
    } catch (error) {
      logError('[DuelBattleFullscreen] ❌ Error finishing duel:', error);
      toast.error('Ошибка завершения дуэли');
      // IMPROVED: Keep waiting state - don't reset on error
      // Player stays on waiting screen, realtime will handle transition when opponent finishes
      // setIsWaitingForOpponent(false); // ← REMOVED
      // setHasFinishedMyQuestions(false); // ← REMOVED
    }
  }, [duelId, profileId, setIsWaitingForOpponent, onDuelFinished]);

  // ОПТИМИЗАЦИЯ: Используем хук для логики игры
  const { hydrateQuestions, syncPlayers, syncQuestions, handleAnswer } = useDuelGame({
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
  });

  // Загружаем игроков для хука бота
  const [players, setPlayers] = useState<any[]>([]);
  useEffect(() => {
    const loadPlayers = async () => {
      const playersData = await fetchPlayers();
      if (playersData?.players) {
        setPlayers(playersData.players);
      }
    };
    if (duelId && profileId) {
      loadPlayers();
    }
  }, [duelId, profileId, fetchPlayers, state.duelStarted]);

  // Подключаем хук для автоматических ответов бота
  const currentQuestionId = questions[currentIndex]?.id || null;
  useBotOpponent({
    duelId,
    currentQuestionId,
    currentQuestionIndex: currentIndex,
    totalQuestions: questions.length,
    players,
    profileId,
  });

  // ОПТИМИЗАЦИЯ: Мемоизируем formatTime
  const formatTime = useCallback((ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }, []);

  useEffect(() => {
    if (!duelId || !profileId) {
      log('[DuelBattleFullscreen] ⚠️ Missing duelId or profileId:', { duelId, profileId });
      return;
    }

    log('[DuelBattleFullscreen] 🚀 Component mounted, syncing data...', { duelId, profileId });
    // КРИТИЧНО: Сначала загружаем игроков, потом вопросы (чтобы избежать race condition)
    // Особенно важно для дуэлей с ботами - вопросы могут не существовать до создания игроков
    syncPlayers().then(() => {
      // После загрузки игроков загружаем вопросы
      syncQuestions();
    }).catch((error) => {
      logError('[DuelBattleFullscreen] Error loading players, retrying questions anyway:', error);
      // Даже при ошибке загрузки игроков пытаемся загрузить вопросы
      syncQuestions();
    });
    syncBoostInventory();
    syncBetInfo();
  }, [duelId, profileId, syncBetInfo, syncBoostInventory, syncPlayers, syncQuestions]);

  // ОПТИМИЗАЦИЯ: Heartbeat используется только как fallback при отсутствии Realtime
  // Realtime подписка отслеживает активность в реальном времени через useDuelRealtime
  // Heartbeat вызывается только если Realtime не работает (каждые 60 секунд)
  useEffect(() => {
    if (!duelId || !profileId || !state.duelStarted) return;

    let heartbeatInterval: NodeJS.Timeout | null = null;
    let lastRealtimeEvent = state.lastEventAt || Date.now();
    const REALTIME_TIMEOUT = 30000; // 30 секунд без событий = Realtime не работает

    // Проверяем, работает ли Realtime (есть ли события)
    const checkRealtimeHealth = () => {
      const timeSinceLastEvent = Date.now() - lastRealtimeEvent;
      return timeSinceLastEvent < REALTIME_TIMEOUT && state.connectionStatus === 'connected';
    };

    // Heartbeat только как fallback
    heartbeatInterval = setInterval(async () => {
      // Если Realtime работает, heartbeat не нужен
      if (checkRealtimeHealth()) {
        log('[DuelBattleFullscreen] Realtime active, skipping heartbeat');
        return;
      }

      // Realtime не работает - используем heartbeat как fallback
      log('[DuelBattleFullscreen] Realtime inactive, using heartbeat fallback');
      try {
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'heartbeat',
            duel_id: duelId,
            profile_id: profileId
          }
        });

        if (error) {
          logError('[DuelBattleFullscreen] Heartbeat error:', error);
        } else if (data?.opponent_status) {
          setOpponentActivityStatus(data.opponent_status);
        }
      } catch (error) {
        logError('[DuelBattleFullscreen] Heartbeat exception:', error);
      }
    }, 60000); // Увеличено до 60 секунд - только fallback

    // Обновляем lastRealtimeEvent при событиях Realtime
    // (useDuelRealtime уже отслеживает изменения через lastEventAt)

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [duelId, profileId, state.duelStarted, state.lastEventAt, state.connectionStatus]);

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
      logError('[DuelBattleFullscreen] Error updating activity status to thinking:', error);
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
        logError('[DuelBattleFullscreen] Error handling disconnect:', error);
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
        toast.warning('⏰ Поторопись! Осталось 10 секунд!', {
          duration: 3000,
          className: "font-bold border-red-500/50 bg-red-500/10 text-red-500"
        });
      }
    }, 30000);

    return () => clearTimeout(timeoutId);
  }, [currentIndex, state.duelStarted, isAnswered, timeLeft, questions.length]);

  // УБРАНО: Countdown - битва начинается сразу когда дуэль стартовала
  // Перезагружаем счет после старта дуэли
  useEffect(() => {
    if (state.duelStarted && questions.length > 0 && !loading) {
      log('[DuelBattleFullscreen] Duel started, loading scores...');
      setTimeout(() => {
        syncPlayers();
      }, 500);
    }
  }, [state.duelStarted, questions.length, loading]);

  // Update notifications when opponent answers and force score refresh
  useEffect(() => {
    if (state.opponentAnswered && state.opponentAnswerData) {
      log('[DuelBattleFullscreen] Opponent answered:', state.opponentAnswerData);

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
      log('[DuelBattleFullscreen] Realtime detected finished status - verifying opponent completed');

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
            log('[DuelBattleFullscreen] Not enough players, ignoring');
            return;
          }

          const opponent = players.find((p: any) => p.user_id !== profileId);
          if (!opponent) {
            log('[DuelBattleFullscreen] Opponent not found, ignoring');
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

          log('[DuelBattleFullscreen] Verification:', {
            opponentAnswers: opponentAnswers || 0,
            required: requiredAnswers,
            canTransition: (opponentAnswers || 0) >= requiredAnswers
          });

          // Only transition if opponent really finished
          if ((opponentAnswers || 0) >= requiredAnswers) {
            log('[DuelBattleFullscreen] ✅ Opponent finished all questions, transitioning to results');
            isVerifyingRef.current = false; // Reset before transition
            sounds.victory();
            toast.info('🏁 Соперник финишировал! Подводим итоги...', { duration: 3000 });
            setTimeout(() => {
              onDuelFinished();
            }, 1000);
          } else {
            log('[DuelBattleFullscreen] ⚠️ Status is finished but opponent hasn\'t completed - staying on waiting screen');
            // Don't transition - stay on waiting screen
            isVerifyingRef.current = false; // Reset for next check
          }
        } catch (error) {
          logError('[DuelBattleFullscreen] Error verifying opponent completion:', error);
          // On error, don't transition - better to wait than transition prematurely
          isVerifyingRef.current = false; // Reset on error
        }
      };

      verifyAndTransition();
    }

    // CRITICAL BACKUP: If we're waiting for opponent and duel is finished, force transition
    // This ensures transition even if DuelWaitingReplay doesn't detect it
    if (state.duelFinished && isWaitingForOpponent && hasFinishedMyQuestions) {
      log('[DuelBattleFullscreen] 🔥 BACKUP: Duel finished while waiting - forcing transition after delay');
      // Give DuelWaitingReplay time to handle it, but force transition if it doesn't
      const backupTimer = setTimeout(() => {
        log('[DuelBattleFullscreen] 🚀 BACKUP: Forcing transition to results');
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
      log('[DuelBattleFullscreen] ✅✅✅ REALTIME: Duel finished! Transitioning to results');
      hasTransitionedRef.current = true;

      try {
        if (sounds?.victory) {
          sounds.victory();
        }
      } catch (soundError) {
        logWarn('[DuelBattleFullscreen] Error playing victory sound:', soundError);
      }

      toast.success('🏁 Дуэль завершена!', { duration: 2000 });
      onDuelFinished();
    }
  }, [state.duelFinished, isWaitingForOpponent, hasFinishedMyQuestions, onDuelFinished]);

  // CRITICAL FALLBACK: Проверка статуса дуэли каждые 3 секунды (если Realtime не сработал)
  useEffect(() => {
    if (!isWaitingForOpponent || !hasFinishedMyQuestions || hasTransitionedRef.current) {
      return;
    }

    log('[DuelBattleFullscreen] 🔄 Starting fallback status check (every 3 seconds)');

    const checkDuelStatus = async () => {
      if (hasTransitionedRef.current) {
        return;
      }

      try {
        const { data: duel, error } = await supabase
          .from('duels')
          .select('status')
          .eq('id', duelId)
          .single();

        if (error) {
          logError('[DuelBattleFullscreen] Error checking duel status:', error);
          return;
        }

        if (!duel) {
          logWarn('[DuelBattleFullscreen] Duel not found');
          return;
        }

        // КРИТИЧНО: Если статус finished - переходим немедленно
        if (duel.status === 'finished' && !hasTransitionedRef.current) {
          log('[DuelBattleFullscreen] ✅✅✅ FALLBACK: Duel status is FINISHED! Transitioning NOW');
          hasTransitionedRef.current = true;

          try {
            if (sounds?.victory) {
              sounds.victory();
            }
          } catch (soundError) {
            logWarn('[DuelBattleFullscreen] Error playing victory sound:', soundError);
          }

          toast.success('🏁 Дуэль завершена!', { duration: 2000 });
          onDuelFinished();
        }
      } catch (error) {
        logError('[DuelBattleFullscreen] Error in fallback check:', error);
      }
    };

    // Проверяем сразу при монтировании
    checkDuelStatus();

    // Затем каждые 3 секунды
    const interval = setInterval(() => {
      if (!hasTransitionedRef.current) {
        checkDuelStatus();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [duelId, isWaitingForOpponent, hasFinishedMyQuestions, onDuelFinished]);

  // Обработка Telegram BackButton для дуэли
  useEffect(() => {
    if (!isTelegramMiniApp()) return;

    const webApp = getTelegramWebApp();
    if (!webApp || !webApp.BackButton) return;

    // Показываем BackButton в дуэли
    webApp.BackButton.show();

    // Обработчик для выхода из дуэли
    const handleBack = () => {
      log('[DuelBattleFullscreen] BackButton clicked - exiting duel');
      onExit();
    };

    // Вешаем обработчик
    webApp.BackButton.onClick(handleBack);

    // Cleanup
    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [onExit]);

  // Sync opponent score from realtime - основной способ обновления счета
  useEffect(() => {
    if (typeof state.opponentScore === 'number' && state.opponentScore >= 0 && state.opponentScore !== opponentScore) {
      log('[DuelBattleFullscreen] ✅ Updating opponent score from realtime:', state.opponentScore, '(was:', opponentScore, ')');
      setOpponentScore(state.opponentScore);

      // FALLBACK: Если мы ждем соперника и счет обновился, проверяем статус дуэли
      // (на случай если Realtime подписка на статус не сработала)
      // ВАЖНО: Дебаунсим проверку, чтобы не делать лишние запросы
      if (isWaitingForOpponent && hasFinishedMyQuestions && !hasTransitionedRef.current) {
        const statusCheckTimeout = setTimeout(async () => {
          try {
            const { data: duel } = await supabase
              .from('duels')
              .select('status, num_questions')
              .eq('id', duelId)
              .single();

            if (duel?.status === 'finished' && !hasTransitionedRef.current) {
              log('[DuelBattleFullscreen] ✅✅✅ FALLBACK: Duel status is finished! Transitioning to results');
              hasTransitionedRef.current = true;

              try {
                if (sounds?.victory) {
                  sounds.victory();
                }
              } catch (soundError) {
                logWarn('[DuelBattleFullscreen] Error playing victory sound:', soundError);
              }

              toast.info('🏁 Финиш! Подводим итоги...', { duration: 2000 });
              onDuelFinished();
            }
          } catch (error) {
            logError('[DuelBattleFullscreen] Error in fallback status check:', error);
          }
        }, 1000); // Увеличено с 500 до 1000 для дебаунса

        return () => clearTimeout(statusCheckTimeout);
      }
    }
  }, [state.opponentScore, opponentScore, isWaitingForOpponent, hasFinishedMyQuestions, duelId, onDuelFinished]);

  // FALLBACK для Telegram WebApp: периодическая проверка счета соперника
  // Если Realtime не работает, обновляем счет каждые 3 секунды
  // ВАЖНО: Не обновляем, если realtime активен (проверяем по последнему обновлению state.opponentScore)
  const lastRealtimeUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (typeof state.opponentScore === 'number') {
      lastRealtimeUpdateRef.current = Date.now();
    }
  }, [state.opponentScore]);

  useEffect(() => {
    if (!duelId || !myPlayerId || !state.duelStarted || isWaitingForOpponent) return;

    // Проверяем счет каждые 3 секунды как fallback (только если realtime неактивен)
    const scoreCheckInterval = setInterval(async () => {
      try {
        // Если realtime обновлялся менее 5 секунд назад - пропускаем fallback
        const timeSinceRealtimeUpdate = Date.now() - lastRealtimeUpdateRef.current;
        if (timeSinceRealtimeUpdate < 5000) {
          return; // Realtime активен, не используем fallback
        }

        const { data: players, error } = await supabase
          .from('duel_players')
          .select('id, score, user_id')
          .eq('duel_id', duelId);

        if (error) {
          logError('[DuelBattleFullscreen] Error checking opponent score (fallback):', error);
          return;
        }

        if (players && players.length >= 2) {
          const opponent = players.find((p: any) => p.id !== myPlayerId);
          if (opponent && typeof opponent.score === 'number' && opponent.score !== opponentScore) {
            log('[DuelBattleFullscreen] 🔄 Fallback: Updating opponent score:', opponent.score, '(was:', opponentScore, ')');
            setOpponentScore(opponent.score);
          }
        }
      } catch (error) {
        logError('[DuelBattleFullscreen] Exception in score check fallback:', error);
      }
    }, 3000); // Каждые 3 секунды (увеличено с 2 до 3 для снижения нагрузки)

    return () => clearInterval(scoreCheckInterval);
  }, [duelId, myPlayerId, state.duelStarted, opponentScore, isWaitingForOpponent]);

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
            logWarn('[DuelBattleFullscreen] ⚠️ Score reset to 0 via realtime (was:', prev, ', new:', state.myScore, ')');
          } else if (prev !== state.myScore) {
            log('[DuelBattleFullscreen] ✅ Updating my score from realtime:', state.myScore, '(was:', prev, ')');
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
    log('[DuelBattleFullscreen] 🔄 useEffect: Loading scores on mount', { profileId, duelId });
    if (profileId && duelId) {
      // Даем время на создание игроков в базе
      const timer = setTimeout(() => {
        syncPlayers();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [duelId, profileId]);

  // ОПТИМИЗАЦИЯ: Сохраняем состояние активной дуэли с debounce (раз в 2 секунды)
  // Это уменьшает количество операций записи в localStorage и ререндеров
  const saveActiveDuelRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!duelId || !profileId || !questions.length || !duelCode) return;

    // Сохраняем состояние только если дуэль активна
    if (state.duelStarted && !state.duelFinished) {
      // Очищаем предыдущий таймер
      if (saveActiveDuelRef.current) {
        clearTimeout(saveActiveDuelRef.current);
      }

      // ОПТИМИЗАЦИЯ: Используем requestIdleCallback для сохранения состояния
      // Это предотвращает блокировку основного потока
      const saveState = () => {
        const stateToSave = {
          duelId,
          duelCode,
          mode: isWaitingForOpponent ? 'waiting' : 'battle',
          currentIndex: isWaitingForOpponent ? undefined : currentIndex, // Не сохраняем currentIndex в режиме ожидания
          myScore,
          opponentScore,
          totalQuestions: questions.length,
          myName,
          opponentName,
        };

        // Используем saveActiveDuel если activeDuel еще не существует, иначе updateActiveDuel
        if (activeDuel) {
          updateActiveDuel(stateToSave);
        } else {
          saveActiveDuel(stateToSave);
        }
      };

      // Устанавливаем новый таймер с debounce 2 секунды
      // Используем requestIdleCallback если доступен для некритического сохранения
      saveActiveDuelRef.current = setTimeout(() => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(saveState, { timeout: 1000 });
        } else {
          saveState();
        }
      }, 2000); // Debounce 2 секунды
    }

    return () => {
      if (saveActiveDuelRef.current) {
        clearTimeout(saveActiveDuelRef.current);
      }
    };
  }, [duelId, duelCode, currentIndex, myScore, opponentScore, questions.length, myName, opponentName, isWaitingForOpponent, state.duelStarted, state.duelFinished, profileId, activeDuel, saveActiveDuel, updateActiveDuel]);

  // Перезагружаем когда дуэль началась (игроки должны быть точно созданы)
  useEffect(() => {
    if (state.duelStarted && duelId && profileId) {
      log('[DuelBattleFullscreen] 🔄 useEffect: Duel started, reloading scores', { myPlayerId });
      // Увеличиваем задержку, чтобы гарантировать что игроки созданы
      const timer = setTimeout(() => {
        syncPlayers();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.duelStarted, duelId, profileId]);

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления safe area (должно быть выше useEffect, который их использует)
  const isTelegramMobile = safeArea.platform === 'ios' || safeArea.platform === 'android';
  const isTelegramDesktop = safeArea.platform === 'telegram' && !isTelegramMobile;

  const safeAreaValues = useMemo(() => {
    // Вычисляем общий верхний отступ: системный safe area + отступ от нативной панели Telegram
    // Для мобильной версии Telegram: используем меньший отступ для навигации
    // Для десктопной версии Telegram: отступ не нужен
    const TELEGRAM_NAV_HEIGHT_MOBILE = 35; // Высота встроенной навигации Telegram WebApp для мобильных
    const telegramNavPadding = isTelegramMobile ? TELEGRAM_NAV_HEIGHT_MOBILE : 0;

    const totalTopPadding = Math.round(safeArea.top + safeArea.contentTop + telegramNavPadding);
    const totalBottomPadding = Math.round(safeArea.bottom + safeArea.contentBottom);
    const totalLeftPadding = Math.round(safeArea.left);
    const totalRightPadding = Math.round(safeArea.right);

    // Высота панели прогресс-бара (py-2 = 8px сверху/снизу + высота элементов ~44px = ~60px)
    // Исправленная высота прогресс-бара (реальная высота компонента около 50-60px)
    const PROGRESS_BAR_HEIGHT = 64;

    // Для мобильной версии Telegram: поднимаем прогресс-бар выше на 15px
    const progressBarTop = isTelegramMobile
      ? totalTopPadding - 15
      : totalTopPadding;

    // Вычисляем отступ для контента:
    // Для десктопа добавляем отступ, чтобы контент не заезжал под фиксированный прогресс-бар
    const contentTopPadding =
      isTelegramMobile
        ? progressBarTop + PROGRESS_BAR_HEIGHT + 4 // Минимальный отступ для мобильной версии (4px вместо -20px)
        : progressBarTop + PROGRESS_BAR_HEIGHT + 16; // Для десктопа больше воздуха

    return {
      totalTopPadding,
      totalBottomPadding,
      totalLeftPadding,
      totalRightPadding,
      progressBarTop,
      contentTopPadding,
      PROGRESS_BAR_HEIGHT,
    };
  }, [safeArea.top, safeArea.contentTop, safeArea.bottom, safeArea.contentBottom, safeArea.left, safeArea.right, isTelegramMobile]);

  const { totalTopPadding, totalBottomPadding, totalLeftPadding, totalRightPadding, progressBarTop, contentTopPadding, PROGRESS_BAR_HEIGHT } = safeAreaValues;

  // ОПТИМИЗАЦИЯ: Логирование safe area только при изменении значений (используем мемоизированные значения)
  useEffect(() => {
    log('[DuelBattleFullscreen] 🎮 Safe area values:', {
      platform: safeArea.platform,
      isTelegramMobile,
      safeAreaTop: `${safeArea.top}px`,
      safeAreaContentTop: `${safeArea.contentTop}px`,
      totalTopPadding: `${totalTopPadding}px`,
      progressBarTop: `${progressBarTop}px`,
      contentTopPadding: `${contentTopPadding}px`,
      gapBetweenProgressAndContent: isTelegramMobile ? `${progressBarTop + PROGRESS_BAR_HEIGHT - contentTopPadding}px` : 'N/A',
    });
  }, [safeArea.platform, safeArea.top, safeArea.contentTop, totalTopPadding, progressBarTop, contentTopPadding, PROGRESS_BAR_HEIGHT, isTelegramMobile]);

  // ОПТИМИЗАЦИЯ: Используем хук для обработки таймаута (должно быть выше useEffect таймера)
  const { handleTimeout } = useDuelTimeout({
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
  });

  // Timer logic with timestamp fix (endTime pattern) - работает даже при переключении вкладок
  const questionEndTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const TIME_LIMIT_MS = 60000; // 60 seconds

  // КРИТИЧНО: Устанавливаем время окончания при загрузке нового вопроса
  // Этот useEffect должен выполняться ПЕРВЫМ и устанавливать таймер
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // КРИТИЧНО: Детальное логирование условий для отладки (ВСЕГДА, не только в dev)
    console.log('[DuelBattleFullscreen] ⏱️ Timer setup check:', {
      questionsLength: questions.length,
      isAnswered,
      isWaitingForOpponent,
      hasFinishedMyQuestions,
      currentIndex,
      allConditionsMet: questions.length > 0 && !isAnswered && !isWaitingForOpponent && !hasFinishedMyQuestions,
      currentIndexValid: currentIndex >= 0 && currentIndex < questions.length
    });

    // Проверяем условия для запуска таймера
    if (!questions.length || isAnswered || isWaitingForOpponent || hasFinishedMyQuestions) {
      console.warn('[DuelBattleFullscreen] ⚠️ Timer NOT starting - conditions not met:', {
        noQuestions: !questions.length,
        isAnswered,
        isWaitingForOpponent,
        hasFinishedMyQuestions
      });
      questionEndTimeRef.current = null;
      setTimeLeft(TIME_LIMIT_MS); // Устанавливаем начальное значение даже если таймер не запускается
      return;
    }

    // КРИТИЧНО: Убеждаемся, что currentIndex валиден
    if (currentIndex < 0 || currentIndex >= questions.length) {
      console.warn('[DuelBattleFullscreen] ⚠️ Timer NOT starting - invalid currentIndex:', {
        currentIndex,
        questionsLength: questions.length
      });
      questionEndTimeRef.current = null;
      setTimeLeft(TIME_LIMIT_MS);
      return;
    }

    // Устанавливаем время окончания = Сейчас + 60 секунд
    const targetTime = Date.now() + TIME_LIMIT_MS;
    questionEndTimeRef.current = targetTime;
    setTimeLeft(TIME_LIMIT_MS);

    // КРИТИЧНО: Логируем запуск таймера ВСЕГДА (не только в dev)
    console.log('[DuelBattleFullscreen] ⏱️✅✅✅ TIMER STARTED ✅✅✅', {
      questionNumber: currentIndex + 1,
      totalQuestions: questions.length,
      endTime: new Date(targetTime).toISOString(),
      currentTime: new Date().toISOString(),
      timeLimitMs: TIME_LIMIT_MS
    });
    
    // КРИТИЧНО: Принудительно проверяем exploits при старте таймера (для Telegram Mini App)
    // Это нужно, потому что polling может не запуститься вовремя или потерять контекст
    if (refreshExploits) {
      console.log('[DuelBattleFullscreen] 🔄🔄🔄 Forcing exploit refresh on timer start 🔄🔄🔄');
      refreshExploits().catch((error) => {
        console.error('[DuelBattleFullscreen] ❌ Error refreshing exploits on timer start:', error);
      });
    }

    // КРИТИЧНО: Функция обновления таймера (вынесена для переиспользования)
    const updateTimer = () => {
      if (!questionEndTimeRef.current) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        return;
      }

      const now = Date.now();
      const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000; // В миллисекундах

      if (secondsRemaining <= 0) {
        // 🛑 Время вышло
        log('[DuelBattleFullscreen] ⏱️ Timer expired for question', currentIndex + 1);
        setTimeLeft(0);
        questionEndTimeRef.current = null;
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        handleTimeout();
      } else {
        // ✅ Обновляем UI
        setTimeLeft(secondsRemaining);
      }
    };

    // Запускаем таймер сразу
    timerIntervalRef.current = setInterval(updateTimer, 250); // Обновляем 4 раза в секунду для плавности
    
    // КРИТИЧНО: Также обновляем сразу при запуске (на случай если прошло время)
    updateTimer();

    // Cleanup при размонтировании или изменении зависимостей
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [currentIndex, questions.length, isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, handleTimeout, setTimeLeft]);

  // Обработчик visibilitychange - мгновенное обновление при возвращении на вкладку
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && questionEndTimeRef.current && !isAnswered && !isWaitingForOpponent && !hasFinishedMyQuestions) {
        // Мгновенный пересчет при возвращении
        const now = Date.now();
        const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;
        
        log('[DuelBattleFullscreen] 👁️ Tab became visible, recalculating timer. Remaining:', secondsRemaining, 'ms');
        
        if (secondsRemaining <= 0) {
          setTimeLeft(0);
          questionEndTimeRef.current = null;
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          handleTimeout();
        } else {
          setTimeLeft(secondsRemaining);
          
          // КРИТИЧНО: Всегда перезапускаем интервал при возвращении на вкладку
          // Браузер может замедлить или остановить интервалы в фоновых вкладках
          // Перезапуск гарантирует, что таймер продолжит работать корректно
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          
          log('[DuelBattleFullscreen] 🔄 Restarting timer interval after tab visibility');
          timerIntervalRef.current = setInterval(() => {
            if (!questionEndTimeRef.current) {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              return;
            }

            const now = Date.now();
            const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;

            if (secondsRemaining <= 0) {
              log('[DuelBattleFullscreen] ⏱️ Timer expired for question', currentIndex + 1);
              setTimeLeft(0);
              questionEndTimeRef.current = null;
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              handleTimeout();
            } else {
              setTimeLeft(secondsRemaining);
            }
          }, 250);
        }
      } else if (document.visibilityState === 'hidden') {
        // При скрытии вкладки логируем, но не останавливаем таймер
        // Таймер продолжит работать в фоне и обновится при возвращении
        log('[DuelBattleFullscreen] 👁️ Tab hidden, timer continues in background');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, handleTimeout, setTimeLeft, currentIndex]);

  // ОПТИМИЗАЦИЯ: Сброс дополнительных состояний при смене вопроса
  useEffect(() => {
    // НЕ сбрасываем questionEndTimeRef здесь - это делается в основном useEffect выше
    setTranslationLanguage(null);
  }, [currentIndex]);

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию для сброса usedBoosts
  const setUsedBoostsReset = useCallback(() => {
    setUsedBoosts([]);
  }, [setUsedBoosts]);

  // ОПТИМИЗАЦИЯ: Мемоизируем handleBoostUse с useCallback
  const handleBoostUse = useCallback(async (boostType: string, language?: 'ru' | 'en') => {
    // КРИТИЧЕСКИ ВАЖНО: разблокируем AudioContext при первом использовании буста
    if (!sounds.isUnlocked()) {
      sounds.forceUnlock();
    }

    if (usedBoosts.includes(boostType) || isAnswered) return;

    const boost = boosts.find(b => b.boost_type === boostType);
    if (!boost || boost.quantity <= 0) return;

    // 🆕 Определяем, является ли буст Root Mode exploit (атакой)
    const rootModeExploits = ['screen_injector', 'input_lag', 'gps_spoofing', 'police_backdoor', 'firewall'];
    const isExploit = rootModeExploits.includes(boostType);

    // 🆕 Названия бустов для отображения
    const boostNames: Record<string, string> = {
      screen_injector: 'Data Leak',
      input_lag: 'Input Lag',
      gps_spoofing: 'GPS Spoofing',
      police_backdoor: 'Police Backdoor',
      firewall: 'Firewall',
      rewind: 'Rewind',
    };

    // 🆕 Мгновенная визуальная обратная связь (Optimistic UI)
    if (isExploit) {
      // Вибрация при нажатии
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Показываем Hacking Overlay
      setBoostFeedback({
        isActive: true,
        boostName: boostNames[boostType] || boostType,
        boostType,
      });

      // Скрываем overlay через 1.5 секунды
      setTimeout(() => {
        setBoostFeedback(prev => ({ ...prev, isActive: false }));
      }, 1500);
    }

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
        // Обновляем endTime при использовании буста time_extend (+30 секунд)
        if (questionEndTimeRef.current) {
          const now = Date.now();
          const currentRemaining = questionEndTimeRef.current - now;
          const newEndTime = now + Math.min(currentRemaining + 30000, TIME_LIMIT_MS);
          questionEndTimeRef.current = newEndTime;
          setTimeLeft(Math.min(currentRemaining + 30000, TIME_LIMIT_MS));
        } else {
          // Если endTime не установлен, просто добавляем время
          setTimeLeft(prev => Math.min(prev + 30000, TIME_LIMIT_MS));
        }
      } else if (boostType === 'hint') {
        sounds.boostHint();
        toast.info('💡 Подсказка: обратите внимание на детали!');
      } else if (boostType === 'skip') {
        sounds.boostSkip();
        setIsAnswered(true);
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            moveToNextQuestion();
            setTranslationLanguage(null); // Сбрасываем перевод при переходе к следующему вопросу
          } else {
            finishDuel();
          }
        }, 500);
      } else if (boostType === 'translate' && language) {
        sounds.boostHint();
        setTranslationLanguage(language);
        const langName = language === 'ru' ? 'русский' : 'английский';
        toast.success(`🌐 Перевод на ${langName} применён!`, { duration: 2000 });
      }

      if (!questions || questions.length === 0 || !questions[currentIndex]) {
        toast.error('Вопросы не загружены');
        setBoostFeedback(prev => ({ ...prev, isActive: false }));
        return;
      }

      // 🆕 Показываем toast для Root Mode exploits
      if (isExploit) {
        const toastId = toast.loading("INITIALIZING EXPLOIT...", {
          style: { 
            background: '#000', 
            color: '#fff', 
            border: '1px solid #ef4444',
            fontFamily: 'monospace'
          }
        });

        try {
      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: questions[currentIndex].id,
          boost_type: boostType,
          language: language,
        },
      });

          // Успех - обновляем toast
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]); // Двойная вибрация "Бзз-Бзз"
          }

          toast.success("MALWARE UPLOADED", {
            id: toastId,
            description: "Атака успешно отправлена сопернику",
            style: { 
              background: '#020617', 
              color: '#4ade80', 
              border: '1px solid #4ade80',
              fontFamily: 'monospace'
            },
            icon: '💉',
            duration: 3000,
          });

      // Уменьшаем количество буста локально (не синхронизируем с БД - буст уже использован)
      setBoosts(prev => prev.map(b => 
        b.boost_type === boostType 
          ? { ...b, quantity: Math.max(0, b.quantity - 1) }
          : b
      ));
        } catch (error) {
          // Ошибка
          if (navigator.vibrate) {
            navigator.vibrate(500); // Длинная вибрация ошибки
          }
          toast.error("UPLOAD FAILED", { 
            id: toastId,
            description: 'Не удалось отправить атаку',
            style: {
              background: '#7f1d1d',
              color: '#fca5a5',
              border: '1px solid #ef4444',
              fontFamily: 'monospace'
            }
          });
          setBoostFeedback(prev => ({ ...prev, isActive: false }));
          throw error;
        }
      } else {
        // Обычные бусты (Safe Mode) - без специальной обработки
        await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'use_boost',
            duel_id: duelId,
            profile_id: profileId,
            duel_question_id: questions[currentIndex].id,
            boost_type: boostType,
            language: language,
          },
        });

        // Уменьшаем количество буста локально (не синхронизируем с БД - буст уже использован)
        setBoosts(prev => prev.map(b => 
          b.boost_type === boostType 
            ? { ...b, quantity: Math.max(0, b.quantity - 1) }
            : b
        ));
      }
    } catch (error) {
      logError('Error using boost:', error);
      setUsedBoosts(prev => prev.filter(b => b !== boostType));
      // Скрываем overlay при ошибке
      setBoostFeedback(prev => ({ ...prev, isActive: false }));
      
      // ВАЖНО: При ошибке НЕ уменьшаем количество буста - он не был использован
      // Количество остается прежним, так как Edge Function не выполнил уменьшение
      
      // Определяем isExploit заново для catch блока
      const rootModeExploits = ['screen_injector', 'input_lag', 'gps_spoofing', 'police_backdoor', 'firewall'];
      const isExploitError = rootModeExploits.includes(boostType);
      
      if (!isExploitError) {
      toast.error('Не удалось использовать буст');
      }
    }
  }, [
    usedBoosts,
    isAnswered,
    boosts,
    questions,
    currentIndex,
    duelId,
    profileId,
    setUsedBoosts,
    setEliminatedOptions,
    setTimeLeft,
    setTranslationLanguage,
    setIsAnswered,
    setCurrentIndex,
    setSelectedAnswer,
    setUsedBoostsReset,
    setBoosts,
    finishDuel,
    moveToNextQuestion,
    setBoostFeedback,
  ]);

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
            // Сохраняем состояние при сворачивании на экране ожидания
            if (duelId && duelCode && profileId && questions.length > 0) {
              const stateToSave = {
                duelId,
                duelCode,
                mode: 'waiting' as const,
                currentIndex: undefined, // Не сохраняем currentIndex в режиме ожидания
                myScore,
                opponentScore,
                totalQuestions: questions.length,
                myName,
                opponentName,
              };

              // Используем saveActiveDuel если activeDuel еще не существует, иначе updateActiveDuel
              if (activeDuel) {
                updateActiveDuel(stateToSave);
              } else {
                saveActiveDuel(stateToSave);
              }
            }
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
    log('[DuelBattleFullscreen] 📦 Showing loading screen:', {
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
      logError('[DuelBattleFullscreen] Invalid question data:', {
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

  // 🆕 Определяем активные exploits
  const inputLagExploit = state.activeExploits?.find(e => e.type === 'input_lag');
  const inputLagActive = !!inputLagExploit && !activeExploits.get('input_lag')?.passed;

  // УБРАНО: Countdown экран - сразу начинаем битву без задержки

  return (
    <div
      className="fixed inset-0 bg-background z-50 overflow-y-auto"
      style={{
        paddingTop: `${totalTopPadding}px`,
        paddingLeft: `${totalLeftPadding}px`,
        paddingRight: `${totalRightPadding}px`,
        paddingBottom: `${totalBottomPadding}px`,
        // Убеждаемся, что не блокируем touch события для EdgeSwipeBack
        touchAction: 'pan-y pinch-zoom'
      }}
    >
      {/* 🆕 Визуальный индикатор Input Lag */}
      {inputLagActive && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9997] 
                      bg-red-950/90 border border-red-500/50 rounded-lg p-3 
                      backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <span className="text-red-400 animate-pulse">🕸️</span>
            <span className="text-red-300 text-sm font-semibold">
              СИСТЕМА ПЕРЕГРУЖЕНА! Враг применил Input Lag
            </span>
          </div>
        </motion.div>
      )}
      {/* Toast Notifications */}
      {/* Учитываем отступы для Telegram WebApp: разные для мобильной и десктопной версии */}
      <div
        className="fixed z-50 space-y-2 max-w-sm"
        style={{
          top: `${progressBarTop + PROGRESS_BAR_HEIGHT + (isTelegramMobile ? 12 : isTelegramDesktop ? 8 : 16)}px`, // Отступ 12px от верха прогресс-бара для мобильной версии Telegram (уменьшено с 40px)
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
        className="absolute left-0 right-0 z-[5] bg-background/95 backdrop-blur-md border-b border-border/30"
        style={{
          top: `${progressBarTop}px`,
          paddingLeft: `${totalLeftPadding}px`,
          paddingRight: `${totalRightPadding}px`,
          paddingTop: isTelegramMobile || isTelegramDesktop ? '4px' : '8px',
          paddingBottom: isTelegramMobile || isTelegramDesktop ? '4px' : '8px'
        }}
      >
        <div className="max-w-4xl mx-auto px-2">
          <QuestionProgressBar
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            onClose={!isTelegramMobile && !isTelegramDesktop ? onExit : undefined}
            showClose={!isTelegramMobile && !isTelegramDesktop}
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
              <DuelTimer timeLeft={timeLeft} formatTime={formatTime} />
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
          paddingTop: `${contentTopPadding}px`
        }}
      >
        {/* Header - Scores & Boosts - Premium Design */}
        <div className={`relative z-20 ${isTelegramMobile 
          ? 'flex flex-col gap-1 mb-0' // Компактная вертикальная компоновка для мобильной версии
          : 'flex items-center justify-between gap-3 flex-wrap'
        } ${isTelegramMobile
          ? 'mb-0' // Нулевой отступ для мобильной версии Telegram
          : isTelegramDesktop
            ? 'mb-3 md:mb-4' // Обычный отступ для десктопной версии
            : 'mb-3 md:mb-4' // Обычный отступ для браузера
          }`}>
          {/* Scores - Enhanced - Центрированы в мобильной версии Telegram */}
          <DuelScoreBoard
            myScore={myScore}
            opponentScore={opponentScore}
            myName={myName}
            opponentName={opponentName}
            myPhotoUrl={myPhotoUrl}
            opponentPhotoUrl={opponentPhotoUrl}
            myInsuranceActive={myInsuranceActive}
            myCoverageDisplay={myCoverageDisplay}
            opponentInsuranceActive={opponentInsuranceActive}
            opponentCoverageDisplay={opponentCoverageDisplay}
            opponentActivityStatus={opponentActivityStatus}
            opponentAnswered={state.opponentAnswered}
            betInfo={betInfo}
            seasonBonusDisplay={seasonBonusDisplay}
            isTelegramMobile={isTelegramMobile}
          />

          {/* Right Side - Boosts & Combo */}
          <div className={`flex items-center gap-1.5 flex-wrap ${isTelegramMobile ? 'w-full justify-center mt-1' : ''}`}>
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

            {/* Boosts - Premium Compact Design - Всегда видимы */}
            {(() => {
              const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
              // КРИТИЧНО: Версионирование логов для проверки обновления кода
              console.log('[DuelBattleFullscreen] 🎮 Rendering DuelBoostsPanel [v2]:', {
                boostsCount: boosts.length,
                boosts: boosts.map(b => ({ type: b.boost_type, quantity: b.quantity })),
                isTelegram,
                platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
                isTelegramMobile,
                usedBoosts,
                isAnswered,
                timestamp: new Date().toISOString(),
                codeVersion: '2025-12-15-v2', // Версия кода для проверки обновления
              });
              return (
            <DuelBoostsPanel
              boosts={boosts}
              usedBoosts={usedBoosts}
              isAnswered={isAnswered}
              translatePopoverOpen={translatePopoverOpen}
              onBoostUse={handleBoostUse}
              onTranslatePopoverChange={setTranslatePopoverOpen}
            />
              );
            })()}
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
          <DuelQuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            isAnswered={isAnswered}
            eliminatedOptions={eliminatedOptions}
            translationLanguage={translationLanguage}
            onAnswer={handleAnswer}
            inputLagActive={!!activeExploits.get('input_lag') && !activeExploits.get('input_lag')?.passed}
            inputLagDelay={1500}
          />
        </motion.div>
      </div>

      {/* 🆕 Hacking Overlay - визуальная обратная связь при использовании буста */}
      <BoostFeedback
        isActive={boostFeedback.isActive}
        boostName={boostFeedback.boostName}
        boostType={boostFeedback.boostType}
      />

      {/* 🆕 Слой спецэффектов (высокий z-index) */}
      {(() => {
        // КРИТИЧНО: Проверяем ВСЕ возможные типы атаки "Масло"
        const screenInjector = state.activeExploits?.find(e => 
          e.type === 'screen_injector' || 
          e.type === 'data_leak' || 
          e.type === 'oil_spill'
        );
        const policeRaid = state.activeExploits?.find(e => e.type === 'police_backdoor');
        const policePassed = activeExploits.get('police_backdoor')?.passed || false;
        
        // КРИТИЧНО: Проверяем passed статус для всех возможных типов
        const screenInjectorPassed = 
          activeExploits.get('screen_injector')?.passed || 
          activeExploits.get('data_leak')?.passed || 
          activeExploits.get('oil_spill')?.passed || 
          false;

        // КРИТИЧНО: Детальное логирование ВСЕХ exploits для отладки (ВСЕГДА, не только в dev)
        console.log('[DuelBattleFullscreen] 🔍 ALL activeExploits check:', {
          totalExploits: state.activeExploits?.length || 0,
          allExploitTypes: state.activeExploits?.map(e => ({
            type: e.type,
            expiresAt: new Date(e.expiresAt).toISOString(),
            receivedAt: new Date(e.receivedAt).toISOString(),
            data: e.data
          })) || [],
          screenInjectorFound: !!screenInjector,
          screenInjectorType: screenInjector?.type,
          screenInjectorPassed,
          activeExploitsMapKeys: Array.from(activeExploits.keys()),
          activeExploitsMapEntries: Array.from(activeExploits.entries()).map(([k, v]) => ({
            key: k,
            expiresAt: new Date(v.expiresAt).toISOString(),
            passed: v.passed
          }))
        });

        if (screenInjector) {
          // КРИТИЧНО: Доверяем факту получения, а не времени (для Telegram Mini App)
          // Рендерим атаку, если она есть в состоянии, даже если expiresAt в прошлом
          // Удаляем только когда запись удалена из состояния или is_active стал false
          const shouldRender = !screenInjectorPassed;
          const isExpired = screenInjector.expiresAt <= Date.now();
          const timeRemaining = screenInjector.expiresAt - Date.now();
          
          console.log('[DuelBattleFullscreen] 🛢️ Oil Attack (Screen Injector/Data Leak) check:', {
            screenInjector,
            screenInjectorType: screenInjector.type,
            screenInjectorPassed,
            expiresAt: screenInjector.expiresAt,
            expiresAtISO: new Date(screenInjector.expiresAt).toISOString(),
            now: Date.now(),
            nowISO: new Date().toISOString(),
            expired: isExpired,
            timeRemainingMs: timeRemaining,
            timeRemainingSec: Math.round(timeRemaining / 1000),
            shouldRender,
            activeExploitsCount: state.activeExploits?.length || 0,
            allActiveExploits: state.activeExploits?.map(e => e.type) || [],
            note: 'Rendering based on state presence, not expiresAt (Telegram latency compensation)'
          });
          
          // КРИТИЧНО: Если должен рендериться, но не рендерится - логируем предупреждение
          if (shouldRender) {
            console.log('[DuelBattleFullscreen] ✅✅✅ OilSplashAttack SHOULD BE RENDERING NOW! ✅✅✅', {
              isExpired,
              timeRemainingSec: Math.round(timeRemaining / 1000),
              note: isExpired ? 'Rendering expired exploit (latency compensation)' : 'Rendering active exploit'
            });
          } else {
            console.warn('[DuelBattleFullscreen] ⚠️ OilSplashAttack NOT rendering:', {
              reason: 'already passed',
              expiresAt: new Date(screenInjector.expiresAt).toISOString(),
              now: new Date().toISOString()
            });
          }
        } else {
          console.warn('[DuelBattleFullscreen] ⚠️ No oil attack (screen_injector/data_leak/oil_spill) found in activeExploits!', {
            availableTypes: state.activeExploits?.map(e => e.type) || [],
            activeExploitsCount: state.activeExploits?.length || 0
          });
        }

        return (
          <>
            {/* Data Leak (Масло) 🛢️ */}
            {/* КРИТИЧНО: Рендерим для всех возможных типов атаки "Масло" */}
            {/* ИЗМЕНЕНО: Убрали проверку expiresAt - доверяем факту получения, а не времени */}
            {screenInjector && !screenInjectorPassed && (
              <OilSplashAttack
                isActive={true}
                expiresAt={screenInjector.expiresAt}
                onCleaned={() => {
                  console.log('[DuelBattleFullscreen] 🛢️ OilSplashAttack cleaned, exploit type:', screenInjector.type);
                  setActiveExploits(prev => {
                    const updated = new Map(prev);
                    // КРИТИЧНО: Обновляем passed статус для правильного типа
                    const exploitType = screenInjector.type;
                    const current = updated.get(exploitType);
                    if (current) {
                      updated.set(exploitType, { ...current, passed: true });
                    } else {
                      // Fallback: если не нашли по типу, пробуем screen_injector
                      const fallback = updated.get('screen_injector');
                      if (fallback) {
                        updated.set('screen_injector', { ...fallback, passed: true });
                      }
                    }
                    return updated;
                  });
                }}
              />
            )}

            {/* Полиция (Police Backdoor) */}
            {policeRaid && !policePassed && (
              <PoliceBackdoorAttack
                isActive={true}
                onUnlock={() => {
                  setActiveExploits(prev => {
                    const updated = new Map(prev);
                    const current = updated.get('police_backdoor');
                    if (current) {
                      updated.set('police_backdoor', { ...current, passed: true });
                    }
                    return updated;
                  });
                }}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}