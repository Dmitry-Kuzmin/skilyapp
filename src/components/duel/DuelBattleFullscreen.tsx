import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DuelLoadingView } from './parts/DuelLoadingView';
import { DuelWaitingView } from './parts/DuelWaitingView';
import { DuelOverlays } from './arena/parts/DuelOverlays';
import { useDuelResultLogic } from './hooks/useDuelResultLogic';
import { useDuelFinish } from './hooks/useDuelFinish';
import { useDuelBoostAction } from './hooks/useDuelBoostAction';
import { useDuelLocalState } from './hooks/useDuelLocalState';
import { useDuelTimer } from './hooks/useDuelTimer';
import { useDuelBetting } from './hooks/useDuelBetting';
import { useDuelOpponentEvents } from './hooks/useDuelOpponentEvents';
import { useDuelSafety } from './hooks/useDuelSafety';
import { useDuelStore } from '@/store/duelStore';
import { useDuelData } from '@/hooks/useDuelData';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { isTelegramMiniApp as isTelegramMiniAppRaw, getTelegramWebApp as getTelegramWebAppRaw } from '@/lib/telegram';
import { getImageUrl } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { ArenaHeader } from './arena/parts/ArenaHeader';
import { ArenaPlayground } from './arena/parts/ArenaPlayground';
import { AnswerProcessingOverlay } from './overlays/AnswerProcessingOverlay';
import { useDuelSync } from '@/hooks/useDuelSync';
import { useDuelLifecycle } from './hooks/useDuelLifecycle';
import { useDuelSettings } from '@/hooks/useDuelSettings';
import { useQuestionBookmark } from '@/hooks/useQuestionBookmark';

import type { DuelResultSnapshot } from '@/features/duel/shared';
import { useDuelGame } from '@/hooks/useDuelGame';
import { useBotOpponent } from '@/hooks/useBotOpponent';
import { GRACE_PERIOD_MS, UNSTABLE_THRESHOLD_MS, AUTO_WIN_TIMEOUT_MS } from '@/features/duel/shared';
import { DuelWaitingReplay } from './DuelWaitingReplay';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Shield, Trophy, Clock, Target, AlertCircle, Coins } from 'lucide-react';

const isDev = import.meta.env.DEV;

// Safe wrappers with UNIQUE names for hoisting and resilience
function safeIsTelegramMiniApp() {
  return typeof isTelegramMiniAppRaw === 'function' ? isTelegramMiniAppRaw() : false;
}
function safeGetTelegramWebApp() {
  return typeof getTelegramWebAppRaw === 'function' ? getTelegramWebAppRaw() : null;
}

console.log('[DuelBattleFullscreen] File version 12 (Answer Processing Overlay) loading...');


// ОПТИМИЗАЦИЯ: Условное логирование
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const logError = (...args: any[]) => { if (isDev) console.error(...args); };
const logWarn = (...args: any[]) => { if (isDev) console.warn(...args); };

const getFallbackAvatar = (name: string) => {
  if (!name) return `https://i.pravatar.cc/150?u=fallback`;
  const lowerName = name.toLowerCase().trim();

  // Basic heuristic for female names
  const isFemale = lowerName.endsWith('a') || lowerName.endsWith('я') || lowerName.endsWith('и') || lowerName.endsWith('ah') || lowerName === 'chloe' || lowerName === 'zoe';

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const femaleIds = [1, 5, 9, 10, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 47, 48, 49];
  const maleIds = [3, 4, 6, 7, 8, 11, 12, 13, 14, 15, 17, 18, 33, 37, 46, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67];

  const ids = isFemale ? femaleIds : maleIds;
  const index = Math.abs(hash) % ids.length;
  return `https://i.pravatar.cc/150?img=${ids[index]}`;
};

interface DuelBattleFullscreenProps {
  duelId: string;
  onExit: () => void;
  onDuelFinished: (snapshot?: DuelResultSnapshot) => void; // 🆕 CRITICAL FIX: Передаем snapshot напрямую из памяти
  onHide?: () => void;
  onWidgetExpand?: () => void;
}

export function DuelBattleFullscreen({ duelId, onExit, onDuelFinished, onHide, onWidgetExpand }: DuelBattleFullscreenProps) {
  // 1. Core Hooks (User & Context)
  const { profileId } = useUserContext();
  const { activeDuel, saveActiveDuel, updateActiveDuel } = useActiveDuel();

  // 2. Store State & Actions (Consolidated)
  const {
    myPlayerId, myName, opponentName, myPhotoUrl, opponentPhotoUrl,
    questions: storeQuestions, currentIndex: storeCurrentIndex,
    timeLeft, selectedAnswer, isAnswered, myScore, opponentScore,
    combo, usedBoosts, eliminatedOptions, translationLanguage,
    isLoading: loading, isProcessingAnswer, isWaitingForOpponent, hasFinishedMyQuestions,
    activeExploits, screenShake, opponentIsConnected, opponentLastSeen,
    lastAttackTimestamp, betInfo, opponentActivityStatus, players,
    setMyPlayerId, setPlayers, setQuestions, setCurrentIndex, setTimeLeft,
    setMyScore, setOpponentScore, setCombo, setEliminatedOptions,
    setFinishedMyQuestions, nextQuestion, setLoading,
    setWaitingForOpponent, setTranslationLanguage,
    setIsAnswered, setSelectedAnswer, setUsedBoosts, addUsedBoost, setHasFinishedMyQuestions,
    syncActiveExploits, cleanupExpiredExploits, setScreenShake,
    setReconnectionState, setExploitPassed, setBetInfo,
    setOpponentActivityStatus
  } = useDuelStore();

  // 4. Logic & Realtime Hooks (Rename state to realtimeState)
  const { state: realtimeState, refreshExploits, removeExploit } = useDuelRealtime(duelId, myPlayerId);
  const { fetchQuestions, fetchPlayers, fetchBoostInventory, fetchBetInfo } = useDuelData(duelId, profileId);

  // 5. Debug Log
  useEffect(() => {
    if (duelId) {
      console.log('[DuelBattleFullscreen] DUEL_ID:', duelId);
    }
  }, [duelId]);

  // 7. Grouped UI State & Refs
  const {
    duelCode, setDuelCode,
    isWaitingHidden, setIsWaitingHidden,
    showSurrenderModal, setShowSurrenderModal,
    boosts, setBoosts,
    toastNotifications, setToastNotifications,
    translatePopoverOpen, setTranslatePopoverOpen,
    boostFeedback, setBoostFeedback,
    showDuelSettings, setShowDuelSettings,
    feedbackEffect, setFeedbackEffect,
    hasTransitionedRef, isFinishingRef, questionEndTimeRef,
    showStartScreen, setShowStartScreen
  } = useDuelLocalState();

  // 6. Config & Settings
  const { voiceOver, setVoiceOver, ambientMusic, setAmbientMusic, fontSize, setFontSize } = useDuelSettings();
  const safeArea = useSafeArea();

  // 7. Callbacks & Derived State
  // REMOVED redundant setIsAnswered/setUsedBoosts causing collisions
  const isDuelActive = Boolean(realtimeState?.duelStarted && !realtimeState?.duelFinished);

  // 8. Question Bookmark Logic
  const { isQuestionBookmarked, bookmarkLoading, toggleBookmark } = useQuestionBookmark({
    profileId,
    questions: storeQuestions,
    currentIndex: storeCurrentIndex,
  });

  // 9. Initial Reset Effect
  useEffect(() => {
    useDuelStore.getState().resetGame();
    setShowStartScreen(true); // Показываем экран VS при инициализации
    return () => {
      useDuelStore.getState().resetGame();
    };
  }, [setShowStartScreen]);

  // 🔥 Таймер автоматического закрытия экрана VS
  useEffect(() => {
    if (showStartScreen && storeQuestions.length > 0) {
      // КРИТИЧНОЕ ИСПРАВЛЕНИЕ: Если дуэль уже активна (например, приняли инвайт или реванш),
      // или вопросы уже прокручены, сокращаем задержку до минимума, чтобы не терять время!
      const isAlreadyRunning = storeCurrentIndex > 0 || (realtimeState && realtimeState.duelStarted);
      const delay = isAlreadyRunning ? 1200 : 2500; // 1.2с для активных, 2.5с для новых

      const timer = setTimeout(() => {
        setShowStartScreen(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [showStartScreen, storeQuestions.length, setShowStartScreen, storeCurrentIndex, realtimeState?.duelStarted]);

  // 10. Lifecycle & Safety
  useDuelSafety({ duelId, profileId, duelStarted: realtimeState?.duelStarted || false });

  // 💰 Betting Logic
  const {
    myInsuranceActive,
    myCoverageDisplay,
    opponentInsuranceActive,
    opponentCoverageDisplay,
    seasonBonusDisplay
  } = useDuelBetting(betInfo);

  // ОПТИМИЗАЦИЯ: Используем хук для синхронизации данных
  const { syncBoostInventory, syncBetInfo } = useDuelSync({
    fetchBoostInventory,
    fetchBetInfo,
    setBoosts,
    setBetInfo,
  });

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию для перехода к следующему вопросу (должно быть выше useDuelGame)
  const moveToNextQuestion = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  // 🔄 LOGIC: Result Snapshots and Transitions
  const { transitionToResults } = useDuelResultLogic({
    duelId,
    profileId,
    myScore,
    opponentScore,
    opponentName,
    onDuelFinished,
    players: players
  });

  // 🔄 LOGIC: Finish Duel Handler
  const { finishDuel } = useDuelFinish({
    duelId,
    profileId,
    opponentName,
    setIsWaitingForOpponent: setWaitingForOpponent,
    transitionToResults
  });




  // ОПТИМИЗАЦИЯ: Используем хук для логики игры (состояние теперь в store)
  const { hydrateQuestions, syncPlayers, syncQuestions, handleAnswer } = useDuelGame({
    duelId,
    profileId,
    fetchQuestions,
    fetchPlayers,
    moveToNextQuestion,
    finishDuel,
    // 🎯 Callback для screen shake при неправильном ответе
    onWrongAnswer: () => {
      setScreenShake(true);
      setFeedbackEffect('wrong');
      setTimeout(() => {
        setScreenShake(false);
        setFeedbackEffect(null);
      }, 500);
    },
    // 🎯 Callback для эффекта при правильном ответе
    onCorrectAnswer: () => {
      setFeedbackEffect('correct');
      setTimeout(() => setFeedbackEffect(null), 800);
    },
  });

  useEffect(() => {
    const loadPlayers = async () => {
      // Avoid loading if we already have players to prevent loop
      if (players.length > 0) return;

      console.log('[DuelBattleFullscreen] 🔍 Loading players for bot opponent hook...');
      const playersData = await fetchPlayers();

      if (playersData?.players && playersData.players.length > 0) {
        setPlayers(playersData.players);
        if (playersData.myPlayerId) {
          setMyPlayerId(playersData.myPlayerId);
        }
      } else {
        setTimeout(loadPlayers, 1000);
      }
    };

    if (duelId && profileId) {
      loadPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId, profileId, fetchPlayers]); // Removed state.duelStarted and players from deps



  // 🤖 Opponent Events & Bot Logic
  useDuelOpponentEvents({
    duelId,
    profileId,
    state: realtimeState,
    finishDuel,
    transitionToResults,
    myPlayerId
  });

  // ОПТИМИЗАЦИЯ: Мемоизируем formatTime
  const formatTime = useCallback((ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }, []);

  // 🔄 LIFECYCLE MANAGEMENT
  // replaces multiple useEffects for initialization, reconnection, and sync
  // PLACED HERE to ensure all dependencies (syncPlayers, syncQuestions) are initialized
  useDuelLifecycle({
    duelId,
    profileId,
    state: realtimeState,
    syncPlayers,
    syncQuestions,
    syncBoostInventory,
    syncBetInfo,
    setLoading
  });

  // ⚡️ ПРЕДЗАГРУЗКА ИЗОБРАЖЕНИЙ: Загружаем картинки первых 3-х вопросов заранее
  useEffect(() => {
    if (storeQuestions?.length > 0) {
      console.log('[DuelBattleFullscreen] ⚡️ Initiating smart preloading for first 3 questions');
      storeQuestions.slice(0, 3).forEach((q: any) => {
        const imageUrl = q.question_snapshot?.image_url;
        if (imageUrl) {
          const fullUrl = getImageUrl(imageUrl) || '';
          const img = new Image();
          img.src = fullUrl;
          log('[DuelBattleFullscreen] 🖼️ Preloaded:', fullUrl);
        }
      });
    }
  }, [storeQuestions]);

  // Подключаем хук для автоматических ответов бота
  const currentQuestionId = storeQuestions[storeCurrentIndex]?.id || null;
  useBotOpponent({
    duelId,
    currentQuestionId,
    currentQuestionIndex: storeCurrentIndex,
    totalQuestions: storeQuestions.length,
    players,
    profileId,
  });


  // Обработка Telegram BackButton для дуэли
  useEffect(() => {
    // 🛡️ Safe check через обертку
    const isTG = safeIsTelegramMiniApp();
    if (!isTG) return;

    const webApp = safeGetTelegramWebApp();
    if (!webApp || !webApp.BackButton) return;

    // Показываем BackButton в дуэли
    webApp.BackButton.show();

    // Обработчик для выхода из дуэли - открываем модалку подтверждения
    const handleBack = () => {
      log('[DuelBattleFullscreen] BackButton clicked - showing exit confirmation modal');
      setShowSurrenderModal(true);
    };

    // Вешаем обработчик сразу - TelegramNavigation теперь не обрабатывает дуэли
    webApp.BackButton.onClick(handleBack);

    // Cleanup
    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, []);

  // Обработка свайпа назад (слева направо) на мобиле
  useEffect(() => {
    const isTG = safeIsTelegramMiniApp();
    if (!isTG) return;

    const EDGE_ZONE_PX = 16;
    const startRef = { x: 0, y: 0, active: false };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      // Исключаем область навигации (нижние 100px)
      const isInNavArea = t.clientY >= window.innerHeight - 100;
      if (t.clientX <= EDGE_ZONE_PX && !isInNavArea) {
        startRef.x = t.clientX;
        startRef.y = t.clientY;
        startRef.active = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startRef.active) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.x;
      const dy = Math.abs(t.clientY - startRef.y);

      // Свайп назад (слева направо) обнаружен
      if (dx > 60 && dy < 50) {
        startRef.active = false;
        e.preventDefault();
        e.stopPropagation();
        log('[DuelBattleFullscreen] Swipe back detected - showing exit confirmation modal');
        setShowSurrenderModal(true);
      }
    };

    const reset = () => {
      startRef.active = false;
    };

    // Добавляем обработчики на document для перехвата всех свайпов
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', reset);
    document.addEventListener('touchcancel', reset);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', reset);
      document.removeEventListener('touchcancel', reset);
    };
  }, []);

  // Sync opponent score from realtime - основной способ обновления  // Sync my score from realtime
  useEffect(() => {
    // Обновляем только если новое значение является валидным числом
    if (typeof realtimeState.myScore === 'number' && realtimeState.myScore >= 0) {
      if (myScore !== realtimeState.myScore) {
        if (myScore > 0 && realtimeState.myScore === 0) {
          logWarn('[DuelBattleFullscreen] ⚠️ Score reset to 0 via realtime (was:', myScore, ', new:', realtimeState.myScore, ')');
        } else {
          log('[DuelBattleFullscreen] ✅ Updating my score from realtime:', realtimeState.myScore, '(was:', myScore, ')');
        }
        setMyScore(realtimeState.myScore);
      }
    }
  }, [realtimeState.myScore, myScore, setMyScore]);

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


  // ОПТИМИЗАЦИЯ: Сохраняем состояние активной дуэли с debounce (раз в 2 секунды)
  // Это уменьшает количество операций записи в localStorage и ререндеров
  const saveActiveDuelRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!duelId || !profileId || !storeQuestions?.length || !duelCode) return;

    // Сохраняем состояние только если дуэль активна
    if (realtimeState.duelStarted && !realtimeState.duelFinished) {
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
          mode: (isWaitingForOpponent ? 'waiting' : 'battle') as "waiting" | "battle",
          currentIndex: isWaitingForOpponent ? undefined : storeCurrentIndex, // Не сохраняем currentIndex в режиме ожидания
          myScore,
          opponentScore,
          totalQuestions: storeQuestions.length,
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
  }, [duelId, duelCode, storeCurrentIndex, myScore, opponentScore, storeQuestions?.length, myName, opponentName, isWaitingForOpponent, realtimeState.duelStarted, realtimeState.duelFinished, profileId, activeDuel, saveActiveDuel, updateActiveDuel]);

  // Перезагружаем когда дуэль началась (игроки должны быть точно созданы)
  useEffect(() => {
    if (realtimeState.duelStarted && duelId && profileId) {
      log('[DuelBattleFullscreen] 🔄 useEffect: Duel started, reloading scores', { myPlayerId });
      // Увеличиваем задержку, чтобы гарантировать что игроки созданы
      const timer = setTimeout(() => {
        syncPlayers();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [realtimeState.duelStarted, duelId, profileId]);

  // КРИТИЧНО: Обработка завершения дуэли (когда Realtime говорит, что дуэль закончена)
  useEffect(() => {
    // 🆕 CRITICAL FIX: Переходим к результатам только если МЫ ТОЖЕ закончили
    // Если соперник закончил, а мы еще нет - мы НЕ должны блокировать экран
    if (realtimeState.duelFinished && !hasTransitionedRef.current) {
      if (hasFinishedMyQuestions) {
        log('[DuelBattleFullscreen] 🏁 Realtime: Duel finished and I am finished too. Transitioning...');
        transitionToResults();
      } else {
        log('[DuelBattleFullscreen] ⏳ Realtime: Opponent finished, but I am still playing. Staying in game.');
        // Мы НЕ ставим setIsWaitingForOpponent(true), так как мы еще играем!
      }
    }
  }, [realtimeState.duelFinished, hasFinishedMyQuestions, transitionToResults]);

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления safe area (должно быть выше useEffect, который их использует)
  const isTelegramMobile = safeArea.platform === 'ios' || safeArea.platform === 'android';

  // 🆕 SAFE CHECKS: Определяем Mini App через обертку
  const isInTelegramMiniApp = safeIsTelegramMiniApp();

  // КРИТИЧНО: Telegram Desktop может иметь различные платформы
  const isTelegramDesktop = !isTelegramMobile && (
    safeArea.platform === 'tdesktop' ||
    safeArea.platform === 'macos' ||
    safeArea.platform === 'windows' ||
    safeArea.platform === 'linux' ||
    safeArea.platform === 'web'
  );

  const webApp = safeGetTelegramWebApp();
  const isTG = isInTelegramMiniApp;

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

    // 🆕 CRITICAL FIX: Для Telegram Mini App используем raw safeArea.top (один раз, без двойного padding)
    // Прогресс-бар должен начинаться сразу под системной строкой состояния (челкой iPhone)
    // Используем safeArea.top напрямую, без добавления telegramNavPadding и contentTop
    // Для обычных мобильных браузеров поднимаем прогресс-бар выше на 15px
    const progressBarTop = isInTelegramMiniApp
      ? Math.round(safeArea.top > 0 ? safeArea.top : 20) // Используем raw safeArea.top (обычно 44-47px на iOS), fallback 20px для desktop/web
      : isTelegramMobile
        ? totalTopPadding - 15 // Для обычных мобильных браузеров поднимаем выше
        : totalTopPadding;

    // Вычисляем отступ для контента:
    // Прогресс-бар имеет paddingTop/paddingBottom по 4px каждый, поэтому реальная высота больше PROGRESS_BAR_HEIGHT
    const progressBarRealHeight = PROGRESS_BAR_HEIGHT + (isTelegramMobile ? 8 : 16); // 4px top + 4px bottom padding

    // 🆕 CRITICAL FIX: Для Telegram Mini App контент начинается РОВНО там, где заканчивается прогресс-бар
    // contentTopPadding = progressBarTop (позиция прогресс-бара) + высота прогресс-бара + небольшой отступ (4px)
    // ВАЖНО: progressBarRealHeight уже включает paddingTop (4px) и paddingBottom (4px)
    // Добавляем 4px для небольшого breathing room между прогресс-баром и контентом
    const contentTopPadding =
      isInTelegramMiniApp
        ? progressBarTop + progressBarRealHeight + 4 // Позиция прогресс-бара + высота + небольшой отступ (4px)
        : isTelegramMobile
          ? progressBarTop + progressBarRealHeight + 8 // Нормальный отступ для обычных мобильных браузеров
          : progressBarTop + progressBarRealHeight + 16; // Для десктопа больше воздуха

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

  // ⏱️ Logic: Timer & Timeout (Encapsulated)
  const { handleTimeout } = useDuelTimer({
    duelId,
    profileId,
    questions: storeQuestions,
    currentIndex: storeCurrentIndex,
    isAnswered,
    isWaitingForOpponent,
    hasFinishedMyQuestions,
    setTimeLeft,
    setMyScore,
    setCombo,
    setIsAnswered,
    setHasFinishedMyQuestions,
    isFinishingRef,
    moveToNextQuestion,
    finishDuel,
    refreshExploits,
    questionEndTimeRef
  });

  // ОПТИМИЗАЦИЯ: Сброс дополнительных состояний при смене вопроса
  useEffect(() => {
    // НЕ сбрасываем questionEndTimeRef здесь - это делается в основном useEffect выше
    setTranslationLanguage(null);
  }, [storeCurrentIndex]);

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию для сброса usedBoosts
  const setUsedBoostsReset = useCallback(() => {
    setUsedBoosts([]);
  }, [setUsedBoosts]);


  // 🚀 Logic: Boost Actions
  const { handleBoostUse } = useDuelBoostAction({
    duelId,
    profileId,
    questions: storeQuestions,
    currentIndex: storeCurrentIndex,
    usedBoosts,
    boosts,
    setBoosts,
    isAnswered,
    setIsAnswered,
    setUsedBoosts: addUsedBoost, // Use the proper adder
    setEliminatedOptions,
    setTimeLeft,
    setTranslationLanguage,
    setSelectedAnswer,
    finishDuel,
    moveToNextQuestion,
    questionEndTimeRef,
    setBoostFeedback,
    safeArea,
    isTelegramDesktop,
    setUsedBoostsReset
  });

  // ============================================================================
  // CRITICAL: WAITING FOR OPPONENT - LIVE REPLAY
  // ============================================================================
  // Show live replay screen when I finish first
  // Display opponent's progress in real-time
  // If hidden, DuelWaitingReplay will show widget via portal and return null
  // ============================================================================
  // КРИТИЧНО: Экран ожидания показываем ТОЛЬКО если мы реально ответили на все вопросы
  // 🔄 UI: Waiting for Opponent
  if (isWaitingForOpponent && hasFinishedMyQuestions) {
    return (
      <DuelWaitingView
        isWaitingForOpponent={isWaitingForOpponent}
        hasFinishedMyQuestions={hasFinishedMyQuestions}
        isWaitingHidden={isWaitingHidden}
        setIsWaitingHidden={setIsWaitingHidden}
        duelId={duelId}
        duelCode={duelCode}
        profileId={profileId}
        myScore={myScore}
        opponentScore={opponentScore}
        questionsLength={storeQuestions.length}
        myName={myName}
        opponentName={opponentName}
        onDuelFinished={onDuelFinished}
        onWidgetExpand={onWidgetExpand}
        onHide={onHide}
        activeDuel={activeDuel}
        saveActiveDuel={saveActiveDuel}
        updateActiveDuel={updateActiveDuel}
      />
    );
  }

  // If waiting is hidden but we're not waiting for opponent (shouldn't happen)
  if (isWaitingHidden) return null;

  // 🔄 UI: Loading State
  if ((loading || !storeQuestions || storeQuestions.length === 0) && !showStartScreen) {
    return <DuelLoadingView loading={loading} questionsCount={storeQuestions?.length || 0} />;
  }

  // 🔄 UI: VS Start Screen
  if (showStartScreen && storeQuestions && storeQuestions.length > 0) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#06080F] flex flex-col items-center justify-center overflow-hidden">
        {/* Анимированный фон */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-slate-900 to-indigo-900/20" />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                           linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative z-10 w-full flex flex-col items-center gap-12 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-6 md:gap-12"
          >
            {/* Игрок 1 */}
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ x: -100, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
                className="relative w-32 h-32 md:w-48 md:h-48 rounded-[2rem] overflow-hidden border-4 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.6)] group"
              >
                <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay opacity-0 transition-opacity duration-500 z-10" />
                <img src={myPhotoUrl || getFallbackAvatar(myName)} className="w-full h-full object-cover transform scale-[1.02] transition-transform duration-700" alt={myName || 'Player 1'} />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white font-black text-xl md:text-2xl uppercase tracking-[0.2em] drop-shadow-md text-center max-w-[200px] truncate"
              >
                {myName}
              </motion.span>
            </div>

            {/* VS */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.5, 1], rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
              className="relative mx-2 md:mx-10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 blur-3xl opacity-50 scale-150 animate-pulse" />
              <div className="relative text-7xl md:text-[8rem] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-300 to-blue-600 drop-shadow-[0_0_20px_rgba(99,102,241,1)] transform hover:scale-110 transition-transform">
                VS
              </div>
            </motion.div>

            {/* Игрок 2 (Оппонент) */}
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ x: 100, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
                className="relative w-32 h-32 md:w-48 md:h-48 rounded-[2rem] overflow-hidden border-4 border-orange-500 shadow-[0_0_50px_rgba(234,88,12,0.6)] group"
              >
                <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay opacity-0 transition-opacity duration-500 z-10" />
                <img src={opponentPhotoUrl || getFallbackAvatar(opponentName)} className="w-full h-full object-cover transform scale-[1.02] transition-transform duration-700" alt={opponentName || 'Player 2'} />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white font-black text-xl md:text-2xl uppercase tracking-[0.2em] drop-shadow-md text-center max-w-[200px] truncate"
              >
                {opponentName}
              </motion.span>
            </div>
          </motion.div>

          {/* Информация о ставке */}
          {betInfo && (
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.8 }}
              className="relative bg-slate-900/80 backdrop-blur-xl px-10 md:px-14 py-4 md:py-6 rounded-[2rem] border-2 border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col items-center gap-1 md:gap-2 overflow-hidden overflow-visible"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-amber-500/10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/40 blur-[40px] pointer-events-none" />

              <span className="relative z-10 text-[10px] md:text-xs font-black text-amber-500/70 uppercase tracking-[0.4em] drop-shadow-sm">Призовой фонд</span>
              <div className="relative z-10 flex items-center gap-3">
                <Coins className="w-8 h-8 md:w-10 md:h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                <span className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                  {betInfo.totalBank.toLocaleString('ru-RU')}
                </span>
              </div>
            </motion.div>
          )}

          {/* Кнопка "В бой" или автозапуск */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center gap-5 w-full max-w-sm mt-4"
          >
            <Button
              onClick={() => setShowStartScreen(false)}
              className="relative w-full h-[72px] md:h-20 bg-gradient-to-b from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-2xl md:text-3xl rounded-[2rem] border-2 border-indigo-400/50 shadow-[0_15px_40px_rgba(79,70,229,0.5),inset_0__2px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.7),inset_0__2px_2px_rgba(255,255,255,0.6)] hover:-translate-y-1 active:translate-y-1 active:scale-95 transition-all overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              <span className="relative z-10 tracking-[0.1em] drop-shadow-lg">В БОЙ!</span>
            </Button>
            <span className="text-white/40 text-[9px] md:text-[11px] font-bold uppercase tracking-[0.25em] animate-pulse">
              Битва начнется через мгновение...
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  // 🔄 UI: Error State (Invalid Data)
  const isInvalidData = !storeQuestions || storeQuestions.length === 0 || storeCurrentIndex < 0 || storeCurrentIndex >= storeQuestions.length;
  if (isInvalidData) {
    if (loading) return <DuelLoadingView loading={true} message="Загрузка вопросов..." />;
    return <DuelLoadingView loading={false} isError={true} onExit={() => setShowSurrenderModal(true)} />;
  }

  const currentQuestion = storeQuestions[storeCurrentIndex];

  // 🔄 UI: Question Loading State
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    if (!loading) {
      logError('[DuelBattleFullscreen] Invalid question data:', {
        currentIndex: storeCurrentIndex,
        questionsLength: storeQuestions.length,
        currentQuestion,
        hasSnapshot: !!currentQuestion?.question_snapshot
      });
    }
    return <DuelLoadingView loading={true} message="Загрузка вопроса..." />;
  }

  const progress = storeQuestions.length > 0 ? ((storeCurrentIndex + 1) / storeQuestions.length) * 100 : 0;

  // 🆕 Определяем активные exploits
  const inputLagExploit = realtimeState.activeExploits?.find(e => e.type === 'input_lag');
  const inputLagActive = !!inputLagExploit && !activeExploits.get('input_lag')?.passed;
  const cryptolockerExploit = realtimeState.activeExploits?.find(e => e.type === 'cryptolocker');
  const cryptolockerActive = !!cryptolockerExploit && !activeExploits.get('cryptolocker')?.passed;

  // УБРАНО: Countdown экран - сразу начинаем битву без задержки

  return (
    <div
      className="duel-fullscreen fixed inset-0 bg-transparent z-50 overflow-y-auto flex flex-col"
      style={{
        paddingTop: isInTelegramMiniApp
          // Telegram Mini App: Robust Telegram-specific safe area (88px minimum for header)
          ? 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px)'
          // Regular mobile browser: Just safe-area-inset-top (notch/island) + small padding
          : /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
            ? 'max(env(safe-area-inset-top, 0px), 16px)'
            // Desktop: use calculated padding
            : `${totalTopPadding}px`,
        paddingLeft: `${totalLeftPadding}px`,
        paddingRight: `${totalRightPadding}px`,
        paddingBottom: `${totalBottomPadding}px`,
        // Убеждаемся, что не блокируем touch события для EdgeSwipeBack
        touchAction: 'pan-y pinch-zoom'
      }}
    >
      {/* Global Smart Background - Grid & Noise (Injected for Fullscreen Mode) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Noise Texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("/noise.svg")' }}
        />
        {/* Grid Pattern */}

        {/* Subtle Radial Gradient for Depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 opacity-50" />
      </div>
      <ArenaHeader
        currentIndex={storeCurrentIndex}
        totalQuestions={storeQuestions.length}
        timeLeft={timeLeft}
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
        seasonBonusDisplay={seasonBonusDisplay}
        betInfo={betInfo}
        opponentActivityStatus={opponentActivityStatus}
        opponentAnswered={realtimeState.opponentAnswered}
        opponentIsConnected={opponentIsConnected}
        opponentLastSeen={opponentLastSeen ? new Date(opponentLastSeen) : null}
        combo={combo}
        screenShake={screenShake}
        boosts={boosts}
        usedBoosts={usedBoosts}
        isAnswered={isAnswered}
        translatePopoverOpen={translatePopoverOpen}
        onBoostUse={handleBoostUse}
        setTranslatePopoverOpen={setTranslatePopoverOpen}
        formatTime={formatTime}
        showDuelSettings={showDuelSettings}
        setShowDuelSettings={setShowDuelSettings}
        showSurrenderModal={() => setShowSurrenderModal(true)}
        voiceOver={voiceOver}
        setVoiceOver={setVoiceOver}
        ambientMusic={ambientMusic}
        setAmbientMusic={setAmbientMusic}
        fontSize={fontSize}
        setFontSize={setFontSize}
        isTelegramMobile={isTelegramMobile}
        isTelegramDesktop={isTelegramDesktop}
        isInTelegramMiniApp={isInTelegramMiniApp}
        safeArea={safeArea}
        onToggleBookmark={profileId ? toggleBookmark : undefined}
        isQuestionBookmarked={isQuestionBookmarked}
        bookmarkLoading={bookmarkLoading}
      />

      {/* Question Card */}
      <ArenaPlayground
        currentIndex={storeCurrentIndex}
        screenShake={screenShake}
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        isAnswered={isAnswered}
        eliminatedOptions={eliminatedOptions}
        translationLanguage={translationLanguage}
        onAnswer={handleAnswer}
        activeExploits={activeExploits}
        cryptolockerActive={cryptolockerActive}
      />

      {/* 🆕 Answer Processing Animation */}
      <AnswerProcessingOverlay isVisible={isProcessingAnswer} />

      {/* 🆕 Unified Overlays Layer */}
      <DuelOverlays
        toastNotifications={toastNotifications}
        setToastNotifications={setToastNotifications}
        isTelegramMobile={isTelegramMobile}
        isTelegramDesktop={isTelegramDesktop}
        safeArea={safeArea}
        progressBarTop={progressBarTop}
        totalRightPadding={totalRightPadding}
        boostFeedback={boostFeedback}
        feedbackEffect={feedbackEffect}
        removeExploit={removeExploit}
        duelId={duelId}
        profileId={profileId}
        showSurrenderModal={showSurrenderModal}
        setShowSurrenderModal={setShowSurrenderModal}
        onExit={onExit}
        transitionToResults={transitionToResults}
      />
    </div >
  );
}