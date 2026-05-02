import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DuelSettingsMenu } from '../../DuelSettingsMenu';
import { QuestionProgressBar } from '@/components/QuestionProgressBar';
import { DuelTimer } from '../../DuelTimer';
import { DuelScoreBoard } from '../../DuelScoreBoard';
import { ArenaControls } from './ArenaControls';
import { Zap, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { haptics } from '@/lib/haptics';

interface ArenaHeaderProps {
    currentIndex: number;
    totalQuestions: number;
    timeLeft: number;
    myScore: number;
    opponentScore: number;
    myName: string;
    opponentName: string;
    myPhotoUrl?: string | null;
    opponentPhotoUrl?: string | null;
    myInsuranceActive: boolean;
    myCoverageDisplay: number;
    opponentInsuranceActive: boolean;
    opponentCoverageDisplay: number;
    seasonBonusDisplay: number;
    betInfo: any;

    // Status
    opponentActivityStatus: 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';
    opponentAnswered: boolean;
    opponentIsConnected: boolean;
    opponentLastSeen: Date | null;

    // Gameplay
    combo: number;
    screenShake: boolean;

    // Boosts
    boosts: any[];
    usedBoosts: string[];
    isAnswered: boolean;
    translatePopoverOpen: string | null;
    onBoostUse: (boostId: string) => void;
    setTranslatePopoverOpen: (id: string | null) => void;

    // Settings & Navigation
    showDuelSettings: boolean;
    setShowDuelSettings: (open: boolean) => void;
    showSurrenderModal: (open: boolean) => void;

    // Config
    voiceOver: boolean;
    setVoiceOver: (enabled: boolean) => void;
    ambientMusic: boolean;
    setAmbientMusic: (enabled: boolean) => void;
    fontSize: number;
    setFontSize: (size: number) => void;

    // Layout
    isTelegramMobile: boolean;
    isTelegramDesktop: boolean;
    isInTelegramMiniApp: boolean;
    safeArea: { top: number; bottom: number; left: number; right: number };

    // Formatting
    formatTime: (ms: number) => string;

    // Bookmark
    onToggleBookmark?: () => void;
    isQuestionBookmarked: boolean;
    bookmarkLoading: boolean;

    // Answer history for progress bar coloring
    answers?: Array<{ isCorrect: boolean }>;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = ({
    currentIndex,
    totalQuestions,
    timeLeft,
    myScore,
    opponentScore,
    myName,
    opponentName,
    myPhotoUrl,
    opponentPhotoUrl,
    myInsuranceActive,
    myCoverageDisplay,
    opponentInsuranceActive,
    opponentCoverageDisplay,
    seasonBonusDisplay,
    betInfo,
    opponentActivityStatus,
    opponentAnswered,
    opponentIsConnected,
    opponentLastSeen,
    combo,
    screenShake,
    boosts,
    usedBoosts,
    isAnswered,
    translatePopoverOpen,
    onBoostUse,
    setTranslatePopoverOpen,
    showDuelSettings,
    setShowDuelSettings,
    showSurrenderModal,
    voiceOver,
    setVoiceOver,
    ambientMusic,
    setAmbientMusic,
    fontSize,
    setFontSize,
    isTelegramMobile,
    isTelegramDesktop,
    isInTelegramMiniApp,
    safeArea,
    formatTime,
    onToggleBookmark,
    isQuestionBookmarked,
    bookmarkLoading,
    answers = [],
}) => {
    const { t } = useLanguage();
    const isMobile = useIsMobile();
    const [showBoostsMobile, setShowBoostsMobile] = React.useState(false);

    // Consider both Telegram flag and viewport width
    const isMobileView = isTelegramMobile || isMobile;

    // Calculate layout paddings
    const totalTopPadding = safeArea.top;
    const totalLeftPadding = safeArea.left;
    const totalRightPadding = safeArea.right;

    return (
        <>
            {/* Unified Progress Bar */}
            <div
                className="relative z-[30] bg-background/95 backdrop-blur-md border-b border-border/30 overflow-visible"
                style={{
                    paddingTop: isTelegramMobile || isTelegramDesktop ? '4px' : '8px',
                    paddingBottom: isTelegramMobile || isTelegramDesktop ? '4px' : '8px'
                }}
            >
                <div className={`${isInTelegramMiniApp ? 'px-3 md:px-4' : 'px-3 md:px-4'} max-w-7xl mx-auto w-full`}>
                    <QuestionProgressBar
                        currentIndex={currentIndex}
                        totalQuestions={totalQuestions}
                        onClose={!isTelegramMobile ? () => showSurrenderModal(true) : undefined}
                        showClose={!isTelegramMobile}
                        showQuestionMap={false}
                        onToggleBookmark={onToggleBookmark}
                        isBookmarked={isQuestionBookmarked}
                        bookmarkLoading={bookmarkLoading}
                        betInfo={betInfo}
                        answers={answers}
                        hideScoreIndicators
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

            {/* Header - Scores & Boosts */}
            <div className="w-full relative z-20 mt-2">
                <div
                    className={cn(
                        "max-w-7xl mx-auto w-full px-2 md:px-4",
                        "relative flex items-center justify-between gap-2 transition-all duration-300 overflow-visible",
                        screenShake && "animate-shake"
                    )}
                >
                    {isMobileView ? (
                        <AnimatePresence mode="wait">
                            {!showBoostsMobile ? (
                                <motion.div
                                    key="scoreboard-mobile"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="flex-1 min-w-0"
                                >
                                    <DuelScoreBoard
                                        myScore={myScore}
                                        opponentScore={opponentScore}
                                        myName={myName}
                                        opponentName={opponentName}
                                        myPhotoUrl={myPhotoUrl ?? null}
                                        opponentPhotoUrl={opponentPhotoUrl ?? null}
                                        myInsuranceActive={myInsuranceActive}
                                        myCoverageDisplay={myCoverageDisplay}
                                        opponentInsuranceActive={opponentInsuranceActive}
                                        opponentCoverageDisplay={opponentCoverageDisplay}
                                        opponentActivityStatus={opponentActivityStatus}
                                        opponentAnswered={opponentAnswered}
                                        betInfo={betInfo}
                                        seasonBonusDisplay={seasonBonusDisplay}
                                        isTelegramMobile={isTelegramMobile}
                                        opponentIsConnected={opponentIsConnected}
                                        opponentLastSeen={opponentLastSeen}
                                        combo={combo}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="boostspanel-mobile"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10, transition: { duration: 0.15 } }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="flex-1 min-w-0 overflow-visible"
                                >
                                    <ArenaControls
                                        boosts={boosts}
                                        usedBoosts={usedBoosts}
                                        isAnswered={isAnswered}
                                        translatePopoverOpen={translatePopoverOpen}
                                        onBoostUse={onBoostUse}
                                        setTranslatePopoverOpen={setTranslatePopoverOpen}
                                        isTelegramMobile={isMobileView}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : (
                        <>
                            <div className="flex-1 min-w-0">
                                <DuelScoreBoard
                                    myScore={myScore}
                                    opponentScore={opponentScore}
                                    myName={myName}
                                    opponentName={opponentName}
                                    myPhotoUrl={myPhotoUrl ?? null}
                                    opponentPhotoUrl={opponentPhotoUrl ?? null}
                                    myInsuranceActive={myInsuranceActive}
                                    myCoverageDisplay={myCoverageDisplay}
                                    opponentInsuranceActive={opponentInsuranceActive}
                                    opponentCoverageDisplay={opponentCoverageDisplay}
                                    opponentActivityStatus={opponentActivityStatus}
                                    opponentAnswered={opponentAnswered}
                                    betInfo={betInfo}
                                    seasonBonusDisplay={seasonBonusDisplay}
                                    isTelegramMobile={isTelegramMobile}
                                    opponentIsConnected={opponentIsConnected}
                                    opponentLastSeen={opponentLastSeen}
                                    combo={combo}
                                />
                            </div>
                            <div className="flex-none">
                                <ArenaControls
                                    boosts={boosts}
                                    usedBoosts={usedBoosts}
                                    isAnswered={isAnswered}
                                    translatePopoverOpen={translatePopoverOpen}
                                    onBoostUse={onBoostUse}
                                    setTranslatePopoverOpen={setTranslatePopoverOpen}
                                    isTelegramMobile={isMobileView}
                                />
                            </div>
                        </>
                    )}

                    {/* Mobile Toggle Button (Zap) */}
                    {isMobileView && (
                        <button
                            onClick={() => {
                                setShowBoostsMobile(!showBoostsMobile);
                                haptics.light();
                            }}
                            className={cn(
                                "relative h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-2xl transition-all duration-300 active:scale-95 shadow-lg overflow-visible",
                                showBoostsMobile 
                                    ? "bg-zinc-800/90 text-white border border-white/20" 
                                    : "bg-indigo-600/90 text-white border border-indigo-400/50 shadow-indigo-500/30"
                            )}
                        >
                            <AnimatePresence mode="wait">
                                {showBoostsMobile ? (
                                    <motion.div
                                        key="icon-x"
                                        initial={{ scale: 0, rotate: -90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 90 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center justify-center absolute inset-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="icon-zap"
                                        initial={{ scale: 0, rotate: 90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: -90 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center justify-center absolute inset-0"
                                    >
                                        <Zap className="w-5 h-5 fill-white animate-pulse" />
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};
