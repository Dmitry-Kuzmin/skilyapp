import { cn } from '@/lib/utils';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { BlitzHeader } from '@/components/blitz';
import { QuestionProgressBar } from '@/components/QuestionProgressBar';
import { TestSettingsMenu } from '@/components/TestSettingsMenu';
import { Trophy } from 'lucide-react';
import type { TestMode } from '@/store/examStore';
import type { RussiaExamState } from '@/types/pddExam';

interface HeaderAnswer {
    questionId: string;
    isCorrect: boolean;
}

interface TestSessionHeaderProps {
    // Общие
    mode: TestMode;
    isTelegramApp: boolean;
    currentIndex: number;
    totalQuestions: number;
    answers: HeaderAnswer[];
    streak: number;
    timeLeft: number;

    // Russia Exam
    russiaExam: {
        state: RussiaExamState | null;
        progress: { current: number } | null;
        timeRemaining: number;
        isExtraMode: boolean;
        stats: { totalErrors: number } | null;
    };
    russiaExamAnswers: HeaderAnswer[];

    // Settings
    showTestSettings: boolean;
    setShowTestSettings: (show: boolean) => void;
    voiceOver: boolean;
    setVoiceOver: (value: boolean) => void;
    answerPopularity: boolean;
    setAnswerPopularity: (value: boolean) => void;
    ambientMusic: boolean;
    setAmbientMusic: (value: boolean) => void;
    selectedMusicTrack: string | null;
    setSelectedMusicTrack: (track: string | null) => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    testLanguage: string;
    setTestLanguage: (lang: any) => void;
    smartVocabularyEnabled: boolean;
    setSettings: (settings: { smartVocabularyEnabled: boolean }) => void;

    // Question Map & Bookmarks
    setShowQuestionMap: (show: boolean) => void;
    toggleBookmark?: () => void;
    isQuestionBookmarked: boolean;
    bookmarkLoading: boolean;
    profileId: string | null;

    // Translation
    toggleTranslation: () => void;
    showTranslation: boolean;

    // Mastery
    masteryRound: number;

    // Report
    onReportProblem?: () => void;

    // Handlers
    handleClose: () => void;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TestSessionHeader = ({
    mode,
    isTelegramApp,
    currentIndex,
    totalQuestions,
    answers,
    streak,
    timeLeft,
    russiaExam,
    russiaExamAnswers,
    showTestSettings,
    setShowTestSettings,
    voiceOver,
    setVoiceOver,
    answerPopularity,
    setAnswerPopularity,
    ambientMusic,
    setAmbientMusic,
    selectedMusicTrack,
    setSelectedMusicTrack,
    fontSize,
    setFontSize,
    testLanguage,
    setTestLanguage,
    smartVocabularyEnabled,
    setSettings,
    setShowQuestionMap,
    toggleBookmark,
    isQuestionBookmarked,
    bookmarkLoading,
    profileId,
    toggleTranslation,
    showTranslation,
    masteryRound,
    onReportProblem,
    handleClose,
}: TestSessionHeaderProps) => {
    return (
        <div
            className={cn(
                "sticky z-40 transition-all duration-300",
                !isTelegramApp && "top-0",
                mode === 'exam-russia' ? "-mx-4 px-4 py-4 border-b border-border/50" :
                    mode === 'blitz' ? "py-0" : "py-1 sm:py-2"
            )}
            style={{
                top: isTelegramApp
                    ? 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), 88px)'
                    : undefined
            }}
        >
            {mode === 'exam-russia' && russiaExam.state && russiaExam.progress ? (
                <ExamHeader
                    timeLeft={mode === 'exam-russia' ? russiaExam.timeRemaining : timeLeft}
                    totalQuestions={20}
                    currentQuestionIndex={russiaExam.isExtraMode ? 20 + russiaExam.progress.current - 1 : russiaExam.progress.current - 1}
                    answers={russiaExamAnswers}
                    extraQuestionsCount={russiaExam.state.extraQuestions.length}
                    questionsPerBlock={5}
                    errorsCount={russiaExam.stats?.totalErrors || 0}
                    maxErrors={2}
                    mode="exam-russia"
                    onClose={handleClose}
                />
            ) : mode === 'blitz' ? (
                <BlitzHeader
                    timeLeft={timeLeft}
                    currentIndex={currentIndex}
                    totalQuestions={totalQuestions}
                    onClose={handleClose}
                    maxTime={90}
                    streak={streak}
                />
            ) : (
                <QuestionProgressBar
                    currentIndex={currentIndex}
                    totalQuestions={totalQuestions}
                    answers={answers}
                    streak={streak}
                    hideScoreIndicators={mode === "exam" || mode === "exam-russia"}
                    onClose={handleClose}
                    showClose={true}
                    layout="focus"
                    onShowQuestionMap={() => setShowQuestionMap(true)}
                    showQuestionMap={mode !== 'exam-russia'}
                    onToggleBookmark={profileId ? toggleBookmark : undefined}
                    isBookmarked={isQuestionBookmarked}
                    bookmarkLoading={bookmarkLoading}
                    onOpenSettings={() => setShowTestSettings(true)}
                    onToggleTranslation={toggleTranslation}
                    showTranslation={showTranslation}
                    onReportProblem={onReportProblem}
                    customLeftContent={
                        <>
                            {/* ─── Ring Timer (экзамены: DGT 30м / ГИБДД 20м / marathon) ─── */}
                            {(mode === "exam" || mode === "exam-russia" || mode === "marathon") && (() => {
                                const maxTime = mode === "exam-russia" ? 1200 : mode === "exam" ? 1800 : 600;
                                const isWarning = timeLeft > 0 && timeLeft <= 120;
                                const isCritical = timeLeft > 0 && timeLeft <= 30;
                                const progress = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
                                const radius = 20;
                                const circumference = 2 * Math.PI * radius;
                                const offset = circumference - (progress / 100) * circumference;
                                const displayValue = timeLeft >= 60
                                    ? `${Math.floor(timeLeft / 60)}м`
                                    : `${timeLeft}с`;
                                const ringColor = isCritical ? '#ef4444' : isWarning ? '#f97316' : '#60a5fa';

                                return (
                                    <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
                                        {isCritical && (
                                            <div
                                                className="absolute inset-0 rounded-full animate-ping"
                                                style={{ background: 'rgba(239,68,68,0.25)' }}
                                            />
                                        )}
                                        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                                            <circle
                                                cx="26" cy="26" r={radius} fill="none"
                                                stroke={ringColor}
                                                strokeWidth="4"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={offset}
                                                strokeLinecap="round"
                                                style={{
                                                    transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                                                    filter: isCritical ? `drop-shadow(0 0 4px ${ringColor})` : undefined,
                                                }}
                                            />
                                        </svg>
                                        <div
                                            className="absolute inset-0 flex items-center justify-center"
                                            style={{ color: isCritical ? '#ef4444' : isWarning ? '#f97316' : 'white' }}
                                        >
                                            <span
                                                className="font-bold leading-none"
                                                style={{
                                                    fontSize: timeLeft >= 60 ? '11px' : '13px',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    animation: isCritical ? 'pulse 1s ease-in-out infinite' : undefined,
                                                }}
                                            >
                                                {displayValue}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Mastery / Marathon Round Indicator */}
                            {(mode === "mastery" || mode === "marathon") && masteryRound > 1 && (
                                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/30 shadow-sm shrink-0">
                                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                                    <span className="font-semibold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                                        Раунд {masteryRound}
                                    </span>
                                </div>
                            )}
                        </>
                    }
                    SettingsMenuComponent={
                        <TestSettingsMenu
                            open={showTestSettings}
                            onOpenChange={setShowTestSettings}
                            voiceOver={voiceOver}
                            onVoiceOverChange={setVoiceOver}
                            answerPopularity={answerPopularity}
                            onAnswerPopularityChange={setAnswerPopularity}
                            ambientMusic={ambientMusic}
                            onAmbientMusicChange={setAmbientMusic}
                            selectedMusicTrack={selectedMusicTrack}
                            onMusicTrackChange={(track: string | null) => setSelectedMusicTrack(track)}
                            fontSize={fontSize}
                            onFontSizeChange={setFontSize}
                            language={testLanguage as any}
                            onLanguageChange={(lang: any) => setTestLanguage(lang)}
                            hideLanguageSelector={mode === 'pdd-ticket' || mode === 'exam-russia'}
                            smartVocabulary={smartVocabularyEnabled}
                            onSmartVocabularyChange={(val) => setSettings({ smartVocabularyEnabled: val })}
                        />
                    }
                />
            )}
        </div>
    );
};
