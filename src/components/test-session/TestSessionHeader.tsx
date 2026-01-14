import { cn } from '@/lib/utils';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { BlitzHeader } from '@/components/blitz';
import { QuestionProgressBar } from '@/components/QuestionProgressBar';
import { TestSettingsMenu } from '@/components/TestSettingsMenu';
import { Clock, Trophy } from 'lucide-react';
import type { TestMode } from '@/store/examStore';
import type { RussiaExamState } from '@/types/pddExam';
import type { Answer } from '@/types/pdd';

interface TestSessionHeaderProps {
    // Общие
    mode: TestMode;
    isTelegramApp: boolean;
    currentIndex: number;
    totalQuestions: number;
    answers: Answer[];
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
    russiaExamAnswers: Answer[];

    // Settings
    showTestSettings: boolean;
    setShowTestSettings: (show: boolean) => void;
    voiceOver: boolean;
    setVoiceOver: (value: boolean) => void;
    answerPopularity: boolean;
    setAnswerPopularity: (value: boolean) => void;
    ambientMusic: boolean;
    setAmbientMusic: (value: boolean) => void;
    selectedMusicTrack: string;
    setSelectedMusicTrack: (track: string) => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    testLanguage: string;
    setTestLanguage: (lang: string) => void;
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
    handleClose,
}: TestSessionHeaderProps) => {
    return (
        <div
            className={cn(
                "sticky z-40 bg-background/95 backdrop-blur-xl transition-all duration-300",
                !isTelegramApp && "top-0",
                mode === 'exam-russia' ? "-mx-4 px-4 py-4 border-b border-border/50" : "py-1 sm:py-2"
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
                    customLeftContent={
                        <>
                            {/* Timer */}
                            {(mode === "exam" || mode === "exam-russia" || mode === "marathon") && (
                                <div className={cn(
                                    "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border shadow-sm shrink-0 transition-colors duration-300",
                                    timeLeft < 300
                                        ? "bg-red-500/10 border-red-500/30 animate-pulse"
                                        : "bg-background/80 backdrop-blur-md border-border/50"
                                )}>
                                    <Clock className={cn(
                                        "w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                                        timeLeft < 300 ? "text-red-500" : "text-foreground/70"
                                    )} />
                                    <span className={cn(
                                        "font-mono font-semibold text-xs sm:text-sm transition-colors",
                                        timeLeft < 300 ? "text-red-600 dark:text-red-400" : "text-foreground"
                                    )}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            )}

                            {/* Mastery Round Indicator */}
                            {mode === "mastery" && masteryRound > 1 && (
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
                            onMusicTrackChange={setSelectedMusicTrack}
                            fontSize={fontSize}
                            onFontSizeChange={setFontSize}
                            language={testLanguage}
                            onLanguageChange={setTestLanguage}
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
