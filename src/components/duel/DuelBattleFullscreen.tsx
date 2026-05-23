import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useDuelStore } from '@/store/duelStore';
import { DuelLoadingView } from './parts/DuelLoadingView';
import { DuelWaitingView } from './parts/DuelWaitingView';
import { DuelOverlays } from './arena/parts/DuelOverlays';
import { isTelegramMiniApp as isTelegramMiniAppRaw, getTelegramWebApp as getTelegramWebAppRaw } from '@/lib/telegram';
import { ArenaHeader } from './arena/parts/ArenaHeader';
import { ArenaPlayground } from './arena/parts/ArenaPlayground';
import { AnswerProcessingOverlay } from './overlays/AnswerProcessingOverlay';
import { AttackFlyout, type AttackFlyoutData } from './overlays/AttackFlyout';
import { AttackParticleEffect } from './overlays/AttackParticleEffect';
import { DuelAnswerParticleBurst } from './DuelAnswerParticleBurst';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';
import { useDuelBattleCoordinator } from './hooks/useDuelBattleCoordinator';

import type { DuelResultSnapshot } from '@/features/duel/shared';

// Safe wrappers with UNIQUE names for hoisting and resilience
function safeIsTelegramMiniApp() {
  return typeof isTelegramMiniAppRaw === 'function' ? isTelegramMiniAppRaw() : false;
}
function safeGetTelegramWebApp() {
  return typeof getTelegramWebAppRaw === 'function' ? getTelegramWebAppRaw() : null;
}

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const logError = (...args: any[]) => { if (isDev) console.error(...args); };

interface DuelBattleFullscreenProps {
  duelId: string;
  onExit: () => void;
  onDuelFinished: (snapshot?: DuelResultSnapshot) => void;
  onHide?: () => void;
  onWidgetExpand?: () => void;
}

const ATTACK_FLYOUT_META: Record<string, Omit<AttackFlyoutData, 'type'>> = {
  ice_screen:      { emoji: '🧊', name: 'Заморозка',  color: '#22d3ee', glow: 'rgba(34,211,238,0.35)' },
  fog_screen:      { emoji: '🌫️', name: 'Туман',      color: '#94a3b8', glow: 'rgba(148,163,184,0.35)' },
  sun_glare:       { emoji: '☀️', name: 'Солнце',     color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  rain_storm:      { emoji: '🌧️', name: 'Гроза',      color: '#818cf8', glow: 'rgba(129,140,248,0.35)' },
  bug_splat:       { emoji: '🐛', name: 'Баги',        color: '#34d399', glow: 'rgba(52,211,153,0.35)' },
  police_backdoor: { emoji: '🚓', name: 'Полиция',    color: '#f87171', glow: 'rgba(248,113,113,0.35)' },
  cryptolocker:    { emoji: '🔐', name: 'Шифровка',   color: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  input_lag:       { emoji: '🕸️', name: 'Лаг',        color: '#fb923c', glow: 'rgba(251,146,60,0.35)' },
  oil_spill:       { emoji: '🛢️', name: 'Масло',      color: '#a8a29e', glow: 'rgba(168,162,158,0.35)' },
  screen_injector: { emoji: '💉', name: 'Инъекция',   color: '#ef4444', glow: 'rgba(239,68,68,0.35)' },
  gps_spoofing:    { emoji: '📡', name: 'GPS Спуф',   color: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  firewall:        { emoji: '🔥', name: 'Файрвол',    color: '#f97316', glow: 'rgba(249,115,22,0.35)' },
};

const DEV_ATTACKS = [
  { type: 'oil_spill',       label: '🛢 Oil' },
  { type: 'cryptolocker',    label: '🔐 Crypto' },
  { type: 'fog_screen',      label: '🌫 Fog' },
  { type: 'police_backdoor', label: '🚓 Police' },
  { type: 'ice_screen',      label: '❄️ Ice' },
  { type: 'sun_glare',       label: '☀️ Sun' },
  { type: 'rain_storm',      label: '🌧 Rain' },
  { type: 'bug_splat',       label: '🐛 Bugs' },
  { type: 'input_lag',       label: '🕸 Lag' },
] as const;

export function DuelBattleFullscreen({ duelId, onExit, onDuelFinished, onHide, onWidgetExpand }: DuelBattleFullscreenProps) {
  const c = useDuelBattleCoordinator({ duelId, onDuelFinished, onHide, onWidgetExpand, onExit });
  const syncActiveExploits = useDuelStore(s => s.syncActiveExploits);
  const setExploitPassed = useDuelStore(s => s.setExploitPassed);
  const [devOpen, setDevOpen] = useState(false);
  const [flyoutAttack, setFlyoutAttack] = useState<AttackFlyoutData | null>(null);
  const handleFlyoutDismiss = useCallback(() => setFlyoutAttack(null), []);
  const [attackBadge, setAttackBadge] = useState<{ emoji: string; color: string; glow: string } | null>(null);
  const attackBadgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [particleAttack, setParticleAttack] = useState<AttackFlyoutData | null>(null);
  const handleParticleComplete = useCallback(() => setParticleAttack(null), []);

  const handleBoostUseWithFlyout = (boostType: string, lang?: 'ru' | 'en') => {
    const meta = ATTACK_FLYOUT_META[boostType];
    if (meta) {
      setFlyoutAttack({ type: boostType, ...meta });
      setParticleAttack({ type: boostType, ...meta });
      setAttackBadge({ emoji: meta.emoji, color: meta.color, glow: meta.glow });
      if (attackBadgeTimer.current) clearTimeout(attackBadgeTimer.current);
      attackBadgeTimer.current = setTimeout(() => setAttackBadge(null), 30_000);
    }
    c.handleBoostUse(boostType, lang);
  };

  // Обработка Telegram BackButton для дуэли
  useEffect(() => {
    const isTG = safeIsTelegramMiniApp();
    if (!isTG) return;

    const webApp = safeGetTelegramWebApp();
    if (!webApp || !webApp.BackButton) return;

    webApp.BackButton.show();

    const handleBack = () => {
      log('[DuelBattleFullscreen] BackButton clicked - showing exit confirmation modal');
      c.setShowSurrenderModal(true);
    };

    webApp.BackButton.onClick(handleBack);

    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, []);

  // ============================================================================
  // EARLY RETURNS
  // ============================================================================

  // 🔄 UI: Waiting for Opponent
  if (c.isWaitingForOpponent && c.hasFinishedMyQuestions) {
    return (
      <DuelWaitingView
        isWaitingForOpponent={c.isWaitingForOpponent}
        hasFinishedMyQuestions={c.hasFinishedMyQuestions}
        isWaitingHidden={c.isWaitingHidden}
        setIsWaitingHidden={c.setIsWaitingHidden}
        duelId={duelId}
        duelCode={c.duelCode || undefined}
        profileId={c.profileId}
        myScore={c.myScore}
        opponentScore={c.opponentScore}
        questionsLength={c.questions.length}
        myName={c.myName}
        opponentName={c.opponentName}
        onDuelFinished={onDuelFinished}
        onWidgetExpand={onWidgetExpand}
        onHide={onHide}
        activeDuel={c.activeDuel}
        saveActiveDuel={c.saveActiveDuel}
        updateActiveDuel={c.updateActiveDuel}
      />
    );
  }

  if (c.isWaitingHidden) return null;

  // 🔄 UI: Loading State
  if ((c.loading || !c.questions || c.questions.length === 0) && !c.showStartScreen) {
    return <DuelLoadingView loading={c.loading} questionsCount={c.questions?.length || 0} />;
  }

  // 🔄 UI: VS Start Screen
  if (c.showStartScreen && c.questions && c.questions.length > 0) {
    return (
      <div className="fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center overflow-hidden">
        {/* Анимированный фон */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-background to-indigo-500/10 dark:from-blue-900/20 dark:via-slate-900 dark:to-indigo-900/20" />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative z-10 w-full flex flex-col items-center gap-12 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 sm:gap-6 md:gap-12 w-full justify-center px-4"
          >
            {/* Игрок 1 */}
            <div className="flex flex-col items-center gap-4 min-w-0">
              <motion.div
                initial={{ x: -100, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
                className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-4 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.5)] group flex-shrink-0"
              >
                <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay opacity-0 transition-opacity duration-500 z-10" />
                {c.myPhotoUrl ? (
                  <img src={c.myPhotoUrl} className="w-full h-full object-cover transform scale-[1.02] transition-transform duration-700" alt={c.myName || 'Player 1'} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-black text-3xl sm:text-5xl md:text-7xl uppercase">
                    {(c.myName || 'P').charAt(0)}
                  </div>
                )}
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-foreground font-black text-sm sm:text-xl md:text-2xl uppercase tracking-[0.1em] sm:tracking-[0.2em] drop-shadow-sm text-center max-w-[100px] sm:max-w-[200px] truncate"
              >
                {c.myName}
              </motion.span>
            </div>

            {/* VS */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
              className="relative mx-1 sm:mx-2 md:mx-10 flex-shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 blur-2xl opacity-40 scale-150 animate-pulse" />
              <div className="relative text-4xl sm:text-6xl md:text-[8rem] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-indigo-600 via-indigo-500 to-blue-700 dark:from-white dark:via-indigo-300 dark:to-blue-600 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] transform hover:scale-110 transition-transform">
                VS
              </div>
            </motion.div>

            {/* Игрок 2 (Оппонент) */}
            <div className="flex flex-col items-center gap-4 min-w-0">
              <motion.div
                initial={{ x: 100, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
                className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-4 border-orange-500 shadow-[0_0_40px_rgba(234,88,12,0.5)] group flex-shrink-0"
              >
                <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay opacity-0 transition-opacity duration-500 z-10" />
                {c.opponentPhotoUrl ? (
                  <img src={c.opponentPhotoUrl} className="w-full h-full object-cover transform scale-[1.02] transition-transform duration-700" alt={c.opponentName || 'Player 2'} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-black text-3xl sm:text-5xl md:text-7xl uppercase">
                    {(c.opponentName || 'P').charAt(0)}
                  </div>
                )}
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-foreground font-black text-sm sm:text-xl md:text-2xl uppercase tracking-[0.1em] sm:tracking-[0.2em] drop-shadow-sm text-center max-w-[100px] sm:max-w-[200px] truncate"
              >
                {c.opponentName}
              </motion.span>
            </div>
          </motion.div>

          {/* Информация о ставке */}
          {c.betInfo && (
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.8 }}
              className="relative bg-muted/80 dark:bg-slate-900/80 backdrop-blur-xl px-10 md:px-14 py-4 md:py-6 rounded-[2rem] border-2 border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.15)] flex flex-col items-center gap-1 md:gap-2 overflow-hidden overflow-visible"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-amber-500/10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/40 blur-[40px] pointer-events-none" />

              <span className="relative z-10 text-[10px] md:text-xs font-black text-amber-500/70 uppercase tracking-[0.4em] drop-shadow-sm">Призовой фонд</span>
              <div className="relative z-10 flex items-center gap-3">
                <Coins className="w-8 h-8 md:w-10 md:h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                <span className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                  {c.betInfo.totalBank.toLocaleString('ru-RU')}
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
              onClick={() => c.setShowStartScreen(false)}
              className="relative w-full h-[72px] md:h-20 bg-gradient-to-b from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-2xl md:text-3xl rounded-[2rem] border-2 border-indigo-400/50 shadow-[0_15px_40px_rgba(79,70,229,0.5),inset_0__2px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.7),inset_0__2px_2px_rgba(255,255,255,0.6)] hover:-translate-y-1 active:translate-y-1 active:scale-95 transition-all overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              <span className="relative z-10 tracking-[0.1em] drop-shadow-lg">В БОЙ!</span>
            </Button>
            <span className="text-muted-foreground/40 text-[9px] md:text-[11px] font-bold uppercase tracking-[0.25em] animate-pulse">
              Битва начнется через мгновение...
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  // 🔄 UI: Error State (Invalid Data)
  const isInvalidData = !c.questions || c.questions.length === 0 || c.currentIndex < 0 || c.currentIndex >= c.questions.length;
  if (isInvalidData) {
    if (c.loading) return <DuelLoadingView loading={true} message="Загрузка вопросов..." />;
    return <DuelLoadingView loading={false} isError={true} onExit={() => c.setShowSurrenderModal(true)} />;
  }

  const currentQuestion = c.questions[c.currentIndex];

  // 🔄 UI: Question Loading State
  if (!currentQuestion || !currentQuestion.question_snapshot) {
    if (!c.loading) {
      logError('[DuelBattleFullscreen] Invalid question data:', {
        currentIndex: c.currentIndex,
        questionsLength: c.questions.length,
        currentQuestion,
        hasSnapshot: !!currentQuestion?.question_snapshot
      });
    }
    return <DuelLoadingView loading={true} message="Загрузка вопроса..." />;
  }

  // 🆕 Определяем активные exploits
  const inputLagExploit = c.realtimeState.activeExploits?.find((e: any) => e.type === 'input_lag');
  const inputLagActive = !!inputLagExploit && !c.activeExploits.get('input_lag')?.passed;

  return (
    <div
      className="duel-fullscreen fixed inset-0 bg-transparent z-50 overflow-y-auto flex flex-col"
      style={{
        paddingTop: c.isInTelegramMiniApp
          ? c.isTelegramDesktop
            ? '4px'
            : 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 88px)'
          : /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
            ? 'max(env(safe-area-inset-top, 0px), 16px)'
            : `${c.totalTopPadding}px`,
        paddingLeft: `${c.totalLeftPadding}px`,
        paddingRight: `${c.totalRightPadding}px`,
        paddingBottom: `${c.totalBottomPadding}px`,
        touchAction: 'pan-y pinch-zoom'
      }}
    >
      {/* Global Smart Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("/noise.svg")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 opacity-50" />
      </div>

      <ArenaHeader
        currentIndex={c.currentIndex}
        totalQuestions={c.questions.length}
        timeLeft={c.timeLeft}
        myScore={c.myScore}
        opponentScore={c.opponentScore}
        myName={c.myName}
        opponentName={c.opponentName}
        myPhotoUrl={c.myPhotoUrl}
        opponentPhotoUrl={c.opponentPhotoUrl}
        myInsuranceActive={c.myInsuranceActive}
        myCoverageDisplay={c.myCoverageDisplay}
        opponentInsuranceActive={c.opponentInsuranceActive}
        opponentCoverageDisplay={c.opponentCoverageDisplay}
        seasonBonusDisplay={c.seasonBonusDisplay}
        betInfo={c.betInfo}
        opponentActivityStatus={c.opponentActivityStatus}
        opponentAnswered={c.realtimeState.opponentAnswered}
        opponentIsConnected={c.opponentIsConnected}
        opponentLastSeen={c.opponentLastSeen ? new Date(c.opponentLastSeen) : null}
        combo={c.combo}
        screenShake={c.screenShake}
        boosts={c.boosts}
        usedBoosts={c.usedBoosts}
        isAnswered={c.isAnswered}
        translatePopoverOpen={c.translatePopoverOpen}
        onBoostUse={handleBoostUseWithFlyout}
        onBoostPurchased={c.syncBoostInventory}
        setTranslatePopoverOpen={c.setTranslatePopoverOpen}
        formatTime={c.formatTime}
        showDuelSettings={c.showDuelSettings}
        setShowDuelSettings={c.setShowDuelSettings}
        showSurrenderModal={() => c.setShowSurrenderModal(true)}
        voiceOver={c.voiceOver}
        setVoiceOver={c.setVoiceOver}
        ambientMusic={c.ambientMusic}
        setAmbientMusic={c.setAmbientMusic}
        fontSize={c.fontSize}
        setFontSize={c.setFontSize}
        isTelegramMobile={c.isTelegramMobile}
        isTelegramDesktop={c.isTelegramDesktop}
        isInTelegramMiniApp={c.isInTelegramMiniApp}
        safeArea={c.safeArea}
        onToggleBookmark={c.profileId ? c.toggleBookmark : undefined}
        isQuestionBookmarked={c.isQuestionBookmarked}
        bookmarkLoading={c.bookmarkLoading}
        answers={c.answerHistory}
        sentAttack={attackBadge}
      />

      {/* Question Card */}
      <ArenaPlayground
        currentIndex={c.currentIndex}
        screenShake={c.screenShake}
        currentQuestion={currentQuestion}
        selectedAnswer={c.selectedAnswer}
        isAnswered={c.isAnswered}
        eliminatedOptions={c.eliminatedOptions}
        translationLanguage={c.translationLanguage}
        onAnswer={c.handleAnswer}
        activeExploits={c.activeExploits}
      />

      {/* Answer Processing Animation */}
      <AnswerProcessingOverlay isVisible={c.isProcessingAnswer} />

      {/* Cinematic attack launch feedback */}
      <AttackFlyout
        attack={flyoutAttack}
        opponentName={c.opponentName}
        onDismiss={handleFlyoutDismiss}
      />

      {/* Particle effect: burst → fly to opponent avatar */}
      <AttackParticleEffect
        attack={particleAttack}
        onComplete={handleParticleComplete}
      />

      {/* Answer particles: fly from selected answer to progress bar segment */}
      <DuelAnswerParticleBurst
        answers={c.answerHistory}
        selectedAnswerId={c.selectedAnswer}
      />

      {/* Unified Overlays Layer */}
      {/* DEV: attack tester — visible only in development builds */}
      {isDev && (
        <div className="fixed bottom-24 right-3 z-[9998] flex flex-col items-end gap-1.5">
          {devOpen && (
            <div className="bg-black/90 border border-yellow-400/40 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-2xl min-w-[130px]">
              <p className="text-yellow-300 text-[10px] font-mono uppercase tracking-widest px-1 pb-0.5 border-b border-yellow-400/20">
                Trigger attack
              </p>
              {DEV_ATTACKS.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => {
                    syncActiveExploits([{ type, expiresAt: Date.now() + 30_000, receivedAt: Date.now() }]);
                    setDevOpen(false);
                  }}
                  className="text-left text-xs text-white/90 hover:text-yellow-300 hover:bg-yellow-400/10 px-2 py-1 rounded font-mono transition-colors"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => {
                  DEV_ATTACKS.forEach(({ type }) => setExploitPassed(type));
                  setDevOpen(false);
                }}
                className="text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2 py-1 rounded font-mono transition-colors border-t border-white/10 mt-0.5 pt-1.5"
              >
                ✕ Clear all
              </button>
            </div>
          )}
          <button
            onClick={() => setDevOpen(o => !o)}
            className="bg-yellow-400 hover:bg-yellow-300 text-black text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg font-mono tracking-widest transition-colors"
          >
            {devOpen ? '✕ DEV' : '⚡ DEV'}
          </button>
        </div>
      )}

      <DuelOverlays
        toastNotifications={c.toastNotifications}
        setToastNotifications={c.setToastNotifications}
        isTelegramMobile={c.isTelegramMobile}
        isTelegramDesktop={c.isTelegramDesktop}
        safeArea={c.safeArea}
        progressBarTop={c.progressBarTop}
        totalRightPadding={c.totalRightPadding}
        boostFeedback={c.boostFeedback}
        feedbackEffect={c.feedbackEffect}
        removeExploit={c.removeExploit}
        duelId={duelId}
        profileId={c.profileId}
        showSurrenderModal={c.showSurrenderModal}
        setShowSurrenderModal={c.setShowSurrenderModal}
        onExit={onExit}
        transitionToResults={c.transitionToResults}
      />
    </div>
  );
}
