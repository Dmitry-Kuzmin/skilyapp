import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { DuelSettingsMenu } from '../../DuelSettingsMenu';
import { QuestionProgressBar } from '@/components/QuestionProgressBar';
import { DuelTimer } from '../../DuelTimer';
import { DuelScoreBoard } from '../../DuelScoreBoard';
import { ArenaControls } from './ArenaControls';

import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';


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
    onBoostUse: (boostId: string, lang?: 'ru' | 'en') => void;
    onBoostPurchased: () => void;
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
    onBoostPurchased,
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
                                    onBoostPurchased={onBoostPurchased}
                                    setTranslatePopoverOpen={setTranslatePopoverOpen}
                                    isTelegramMobile={isMobileView}
                                />
                            </div>
                        </>
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
                                    onBoostPurchased={onBoostPurchased}
                                    setTranslatePopoverOpen={setTranslatePopoverOpen}
                                    isTelegramMobile={isMobileView}
                                />
                            </div>
                        </>
                    )}

                </div>
            </div>
        </>
    );
};
