import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDuelResultLogic } from './useDuelResultLogic';
import { useDuelFinish } from './useDuelFinish';
import { useDuelBoostAction } from './useDuelBoostAction';
import { useDuelLocalState } from './useDuelLocalState';
import { useDuelTimer } from './useDuelTimer';
import { useDuelBetting } from './useDuelBetting';
import { useDuelOpponentEvents } from './useDuelOpponentEvents';
import { useDuelToasts, composeOpponentMessage, composeMyPointsMessage } from './useDuelToasts';
import { useDuelSafety } from './useDuelSafety';
import { useDuelStore } from '@/store/duelStore';
import { useDuelData } from '@/hooks/useDuelData';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useUserContext } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import { useModal } from '@/hooks/useModal';
import { supabase } from '@/integrations/supabase/client';
import { isTelegramMiniApp as isTelegramMiniAppRaw, getTelegramWebApp as getTelegramWebAppRaw } from '@/lib/telegram';
import { getImageUrl } from '@/utils/imageUtils';
import { useDuelSync } from '@/hooks/useDuelSync';
import { useDuelLifecycle } from './useDuelLifecycle';
import { useDuelSettings } from '@/hooks/useDuelSettings';
import { useQuestionBookmark } from '@/hooks/useQuestionBookmark';
import type { DuelResultSnapshot } from '@/features/duel/shared';
import { useDuelGame } from '@/hooks/useDuelGame';
import { useBotOpponent } from '@/hooks/useBotOpponent';

const isDev = import.meta.env.DEV;

// Safe wrappers with UNIQUE names for hoisting and resilience
function safeIsTelegramMiniApp() {
  return typeof isTelegramMiniAppRaw === 'function' ? isTelegramMiniAppRaw() : false;
}
function safeGetTelegramWebApp() {
  return typeof getTelegramWebAppRaw === 'function' ? getTelegramWebAppRaw() : null;
}

// ОПТИМИЗАЦИЯ: Условное логирование
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const logError = (...args: any[]) => { if (isDev) console.error(...args); };

export interface UseDuelBattleCoordinatorProps {
  duelId: string;
  onDuelFinished: (snapshot?: DuelResultSnapshot) => void;
  onHide?: () => void;
  onWidgetExpand?: () => void;
  onExit: () => void;
}

export function useDuelBattleCoordinator({
  duelId,
  onDuelFinished,
  onHide,
  onWidgetExpand,
  onExit,
}: UseDuelBattleCoordinatorProps) {
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
    lastAttackTimestamp, betInfo, opponentActivityStatus, players, answerHistory,
    setMyPlayerId, setPlayers, setQuestions, setCurrentIndex, setTimeLeft,
    setMyScore, setOpponentScore, setCombo, setEliminatedOptions,
    nextQuestion, setLoading,
    setWaitingForOpponent, setTranslationLanguage,
    setIsAnswered, setSelectedAnswer, setUsedBoosts, addUsedBoost, setHasFinishedMyQuestions,
    syncActiveExploits, cleanupExpiredExploits, setScreenShake,
    setReconnectionState, setExploitPassed, setBetInfo,
    setOpponentActivityStatus
  } = useDuelStore();

  // 4. Logic & Realtime Hooks (Rename state to realtimeState)
  const { state: realtimeState, refreshExploits, removeExploit } = useDuelRealtime(duelId, myPlayerId);
  const { fetchQuestions, fetchPlayers, fetchBoostInventory, fetchBetInfo } = useDuelData(duelId, profileId);

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

  // Notifications (kept here so the hook is called consistently)
  useNotifications();

  // 7. Callbacks & Derived State
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

  // Toast lifecycle (timers managed in refs, not effect cleanup — see useDuelToasts)
  const { pushToast, claimKey } = useDuelToasts({ toastNotifications, setToastNotifications });

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
    transitionToResults,
    hasTransitionedRef,
  });

  // ОПТИМИЗАЦИЯ: Используем хук для логики игры (состояние теперь в store)
  const { hydrateQuestions, syncPlayers, syncQuestions, handleAnswer } = useDuelGame({
    duelId,
    profileId,
    fetchQuestions,
    fetchPlayers,
    moveToNextQuestion,
    finishDuel,
    onWrongAnswer: () => {
      setFeedbackEffect('wrong');
      setTimeout(() => setFeedbackEffect(null), 1000);
    },
    onCorrectAnswer: (points) => {
      setFeedbackEffect('correct');
      const currentCombo = useDuelStore.getState().combo;
      const msg = composeMyPointsMessage({ points, combo: currentCombo });
      pushToast({
        id: `me-${Date.now()}`,
        type: currentCombo >= 3 ? 'combo' : 'points',
        title: msg.title,
        message: msg.message,
        icon: msg.icon,
        ttlMs: 2200,
      });
      setTimeout(() => setFeedbackEffect(null), 1000);
    },
    isFinishingRef,
  });

  // 🔄 AUTO-SYNC: Sync inventory after Shop is closed
  const { isOpen: isShopOpen } = useModal('BOOST_SHOP');
  const lastShopOpenRef = useRef(false);

  useEffect(() => {
    // If shop was open and now it's closed
    if (lastShopOpenRef.current && !isShopOpen) {
      log('[DuelBattleFullscreen] 🛒 Shop closed, triggering inventory sync...');
      syncBoostInventory();
    }
    lastShopOpenRef.current = isShopOpen;
  }, [isShopOpen, syncBoostInventory]);

  useEffect(() => {
    const loadPlayers = async () => {
      // Avoid loading if we already have players to prevent loop
      if (players.length > 0) return;

      log('[DuelBattleFullscreen] Loading players...');
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
      log('[DuelBattleFullscreen] Preloading questions...');
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

  // 🔄 SYNC SCORES FROM REALTIME
  useEffect(() => {
    // 1. Sync my score (safety net) - only if it's an increase to prevent stale 0 resets
    if (typeof realtimeState.myScore === 'number' && realtimeState.myScore > myScore) {
      log('[DuelBattleFullscreen] ✅ Updating my score from realtime:', realtimeState.myScore, '(was:', myScore, ')');
      setMyScore(realtimeState.myScore);
    }

    // 2. Sync opponent score (Main source of truth for opponent)
    if (typeof realtimeState.opponentScore === 'number' && realtimeState.opponentScore >= 0) {
      if (opponentScore !== realtimeState.opponentScore) {
        log('[DuelBattleFullscreen] 🤖 Updating opponent score from realtime:', realtimeState.opponentScore, '(was:', opponentScore, ')');
        setOpponentScore(realtimeState.opponentScore);
      }
    }
  }, [realtimeState.myScore, realtimeState.opponentScore, myScore, opponentScore, setMyScore, setOpponentScore]);

  // 🔔 Opponent answer toasts — fully gated, deduped, auto-dismissing.
  // Effect cleanup is a no-op here on purpose: dismiss timers live inside
  // useDuelToasts (refs), so re-runs of this effect cannot kill them.
  useEffect(() => {
    const answerData = realtimeState.opponentAnswerData as any;
    if (!answerData) return;

    // Strict gating — don't surface anything before the player is in the arena
    if (showStartScreen) return;
    if (!realtimeState.duelStarted || realtimeState.duelFinished) return;
    if (hasFinishedMyQuestions) return;
    if (!storeQuestions || storeQuestions.length === 0) return;

    // Stable dedup key per answer row (same id from duel_answers INSERT regardless of channel)
    const answerId = answerData.id ? String(answerData.id) : null;
    if (!answerId) return;
    const dedupKey = `opp-answer-${answerId}`;
    if (!claimKey(dedupKey)) return;

    // Reject malformed: we need a clear correct/wrong/skip signal
    const isSkipped = answerData.is_skipped === true;
    const isCorrect = answerData.is_correct === true;
    if (!isSkipped && typeof answerData.is_correct !== 'boolean') return;

    const opponentPoints = Number(answerData.points_awarded) || 0;
    const combo = Number(answerData.combo_at_time) || 0;
    const name = (opponentName || 'Соперник').split(' ')[0];
    const liveOpponentScore = typeof realtimeState.opponentScore === 'number'
      ? realtimeState.opponentScore
      : opponentScore;
    const gap = liveOpponentScore - myScore;

    const msg = composeOpponentMessage({
      isCorrect,
      isSkipped,
      name,
      points: opponentPoints,
      gap,
      combo,
      errorStreak: 0, // not currently surfaced in duel_answers row
    });

    pushToast({
      id: dedupKey,
      type: isSkipped ? 'opponent-skip' : (isCorrect ? 'opponent-correct' : 'opponent-wrong'),
      title: msg.title,
      message: msg.message,
      icon: msg.icon,
      ttlMs: isCorrect ? 2800 : 2400,
    });
  }, [
    realtimeState.opponentAnswerData,
    realtimeState.opponentScore,
    realtimeState.duelStarted,
    realtimeState.duelFinished,
    hasFinishedMyQuestions,
    showStartScreen,
    storeQuestions,
    opponentName,
    opponentScore,
    myScore,
    pushToast,
    claimKey,
  ]);

  // Загружаем код дуэли при монтировании
  useEffect(() => {
    if (duelId) {
      supabase
        .from('duels')
        .select('code')
        .eq('id', duelId)
        .single()
        .then(({ data }: { data: any }) => {
          if (data?.code) {
            setDuelCode(data.code);
          }
        });
    }
  }, [duelId]);

  // ОПТИМИЗАЦИЯ: Сохраняем состояние активной дуэли с debounce (раз в 2 секунды)
  const saveActiveDuelRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!duelId || !profileId || !storeQuestions?.length || !duelCode) return;

    if (realtimeState.duelStarted && !realtimeState.duelFinished) {
      if (saveActiveDuelRef.current) {
        clearTimeout(saveActiveDuelRef.current);
      }

      const saveState = () => {
        const stateToSave = {
          duelId,
          duelCode,
          mode: (isWaitingForOpponent ? 'waiting' : 'battle') as "waiting" | "battle",
          currentIndex: isWaitingForOpponent ? undefined : storeCurrentIndex,
          myScore,
          opponentScore,
          totalQuestions: storeQuestions.length,
          myName,
          opponentName,
        };

        if (activeDuel) {
          updateActiveDuel(stateToSave);
        } else {
          saveActiveDuel(stateToSave);
        }
      };

      // Debounce 500мс — чтобы не писать при каждом ре-рендере, но не терять при краше
      saveActiveDuelRef.current = setTimeout(saveState, 500);
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

  // Обработка завершения дуэли (когда Realtime сообщает что дуэль окончена)
  useEffect(() => {
    if (!realtimeState.duelFinished || hasTransitionedRef.current) return;

    // ВАЖНО: Переходим к результатам только если пользователь уже ответил на все свои вопросы.
    // Если бот закончил быстрее — даём пользователю доиграть в отведённое время (1 мин/вопрос).
    // Переход произойдёт автоматически когда пользователь ответит на последний вопрос (via finishDuel).
    if (hasFinishedMyQuestions) {
      hasTransitionedRef.current = true;
      log('[DuelBattleFullscreen] 🏁 Realtime: duel finished + user done → transitioning to results');
      transitionToResults();
    }
    // else: пользователь ещё отвечает — ждём, finishDuel сам вызовет transitionToResults
  }, [realtimeState.duelFinished, hasFinishedMyQuestions, transitionToResults]);

  // FALLBACK: Polling when waiting — catches finish when Realtime fails in Telegram Mini Apps
  useEffect(() => {
    if (!isWaitingForOpponent || !duelId || hasTransitionedRef.current) return;

    const checkDuelStatus = async () => {
      if (hasTransitionedRef.current) return;
      try {
        const { data } = await supabase
          .from('duels')
          .select('status')
          .eq('id', duelId)
          .single();
        if (data?.status === 'finished' && !hasTransitionedRef.current) {
          hasTransitionedRef.current = true;
          log('[DuelBattleFullscreen] 🔄 Polling: Duel finished detected. Transitioning to results...');
          transitionToResults();
        }
      } catch (e) {
        // ignore poll errors silently
      }
    };

    const interval = setInterval(checkDuelStatus, 3000);
    return () => clearInterval(interval);
  }, [isWaitingForOpponent, duelId, transitionToResults]);

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

  // ОПТИМИЗАЦИЯ: Логирование safe area только при изменении значений (используем мемоизированные значения)
  useEffect(() => {
    const { totalTopPadding, progressBarTop, contentTopPadding, PROGRESS_BAR_HEIGHT } = safeAreaValues;
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
  }, [safeArea.platform, safeArea.top, safeArea.contentTop, safeAreaValues, isTelegramMobile]);

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

  return {
    // Profile
    profileId,

    // Active duel
    activeDuel,
    saveActiveDuel,
    updateActiveDuel,

    // Store state
    myPlayerId,
    myName,
    opponentName,
    myPhotoUrl,
    opponentPhotoUrl,
    questions: storeQuestions,
    currentIndex: storeCurrentIndex,
    timeLeft,
    selectedAnswer,
    isAnswered,
    myScore,
    opponentScore,
    combo,
    usedBoosts,
    eliminatedOptions,
    translationLanguage,
    loading,
    isProcessingAnswer,
    isWaitingForOpponent,
    hasFinishedMyQuestions,
    activeExploits,
    screenShake,
    opponentIsConnected,
    opponentLastSeen,
    lastAttackTimestamp,
    betInfo,
    opponentActivityStatus,
    players,
    answerHistory,

    // Realtime
    realtimeState,
    refreshExploits,
    removeExploit,

    // Local state
    duelCode,
    isWaitingHidden,
    setIsWaitingHidden,
    showSurrenderModal,
    setShowSurrenderModal,
    boosts,
    setBoosts,
    toastNotifications,
    setToastNotifications,
    translatePopoverOpen,
    setTranslatePopoverOpen,
    boostFeedback,
    setBoostFeedback,
    showDuelSettings,
    setShowDuelSettings,
    feedbackEffect,
    setFeedbackEffect,
    showStartScreen,
    setShowStartScreen,

    // Settings
    voiceOver,
    setVoiceOver,
    ambientMusic,
    setAmbientMusic,
    fontSize,
    setFontSize,

    // Computed
    isDuelActive,
    isTelegramMobile,
    isTelegramDesktop,
    isInTelegramMiniApp,
    webApp,

    // Safe area
    safeArea,
    ...safeAreaValues,

    // Handlers
    handleAnswer,
    handleBoostUse,
    handleTimeout,
    finishDuel,
    transitionToResults,
    formatTime,
    moveToNextQuestion,
    syncBoostInventory,

    // Betting
    myInsuranceActive,
    myCoverageDisplay,
    opponentInsuranceActive,
    opponentCoverageDisplay,
    seasonBonusDisplay,

    // Bookmark
    isQuestionBookmarked,
    bookmarkLoading,
    toggleBookmark,
  };
}
