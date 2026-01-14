import { memo } from 'react';
import { AnimatePresence } from "@/components/optimized/Motion";
import { TestQuestionMap } from "@/components/test-session/TestQuestionMap";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { ChallengeBankNotification } from "@/components/ChallengeBankNotification";
import { ReflectionOverlay } from "@/components/test-session/redemption/ReflectionOverlay";
import { PenaltyAlert } from "@/components/exam/PenaltyAlert";
import { ExamFailureModal } from "@/components/exam/ExamFailureModal";
import { TestExitDialog } from "@/components/test-session/TestExitDialog";
import { UniversalQuestion } from '@/types/pdd';
import { Answer } from '@/types/pdd';

interface TestSessionModalsProps {
    // Question Map
    showQuestionMap: boolean;
    setShowQuestionMap: (show: boolean) => void;
    questions: UniversalQuestion[];
    currentIndex: number;
    answers: Answer[];
    jumpToQuestion: (index: number) => void;
    mode: string;

    // Report Problem
    showReportModal: boolean;
    setShowReportModal: (show: boolean) => void;
    currentQuestion: UniversalQuestion;
    showTranslation: boolean;
    testLanguage: string;

    // Challenge Bank
    showChallengeBankNotification: boolean;
    setShowChallengeBankNotification: (show: boolean) => void;

    // Redemption / Reflection
    isRedemptionMode: boolean;
    showReflectionOverlay: boolean;
    setShowReflectionOverlay: (show: boolean) => void;
    redemptionStep: string;
    redemptionFlashcards: any[];
    redemptionAnalysisData: any;

    // Russia Exam specific
    showPenaltyAlert: boolean;
    setShowPenaltyAlert: (show: boolean) => void;
    penaltyBlock: number | null;
    setPenaltyBlock: (block: number | null) => void;
    russiaExam: any;
    setIsAnswerLocked: (locked: boolean) => void;
    setIsTransitioning: (trans: boolean) => void;
    setCurrentIndex: (index: number) => void;
    showFailureModal: boolean;
    failureReason: string;

    // Exit
    showExitConfirm: boolean;
    setShowExitConfirm: (show: boolean) => void;
    userLanguage: string;
}

export const TestSessionModals = memo(function TestSessionModals({
    showQuestionMap,
    setShowQuestionMap,
    questions,
    currentIndex,
    answers,
    jumpToQuestion,
    mode,
    showReportModal,
    setShowReportModal,
    currentQuestion,
    showTranslation,
    testLanguage,
    showChallengeBankNotification,
    setShowChallengeBankNotification,
    isRedemptionMode,
    showReflectionOverlay,
    setShowReflectionOverlay,
    redemptionStep,
    redemptionFlashcards,
    redemptionAnalysisData,
    showPenaltyAlert,
    setShowPenaltyAlert,
    penaltyBlock,
    setPenaltyBlock,
    russiaExam,
    setIsAnswerLocked,
    setIsTransitioning,
    setCurrentIndex,
    showFailureModal,
    failureReason,
    showExitConfirm,
    setShowExitConfirm,
    userLanguage
}: TestSessionModalsProps) {
    return (
        <>
            <TestQuestionMap
                open={showQuestionMap}
                onClose={() => setShowQuestionMap(false)}
                questions={questions}
                currentIndex={currentIndex}
                answers={answers}
                jumpToQuestion={jumpToQuestion}
                mode={mode}
            />

            <ReportProblemModal
                open={showReportModal}
                onOpenChange={setShowReportModal}
                questionId={currentQuestion.id}
                questionText={showTranslation ? currentQuestion.question_ru : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es)}
            />

            <ChallengeBankNotification
                isVisible={showChallengeBankNotification}
                onClose={() => setShowChallengeBankNotification(false)}
            />

            <AnimatePresence>
                {isRedemptionMode && showReflectionOverlay && redemptionStep === 'reflection' && (
                    <ReflectionOverlay
                        currentQuestionId={questions[currentIndex]?.id || ''}
                        flashcards={redemptionFlashcards}
                        fallbackSummary={redemptionAnalysisData?.summary || "Разбор ошибки"}
                        onClose={() => setShowReflectionOverlay(false)}
                        isFirstTime={true}
                    />
                )}
            </AnimatePresence>

            {mode === 'exam-russia' && (
                <>
                    <PenaltyAlert
                        open={showPenaltyAlert}
                        blockNumber={penaltyBlock || 0}
                        questionsAdded={russiaExam.state?.extraQuestions.length || 0}
                        minutesAdded={5}
                        onContinue={() => {
                            setShowPenaltyAlert(false);
                            setPenaltyBlock(null);
                            setIsAnswerLocked(false);

                            // Переходим к следующему вопросу
                            setCurrentIndex(russiaExam.progress.current - 1);

                            // selectedOption сбросится автоматически в examStore
                            setIsTransitioning(true);
                            setTimeout(() => setIsTransitioning(false), 300);
                        }}
                    />

                    <ExamFailureModal
                        open={showFailureModal}
                        reason={failureReason}
                        onViewResults={() => {
                            console.log('ExamFailureModal: Navigating to /tests');
                            window.location.href = '/tests';
                        }}
                    />
                </>
            )}

            <TestExitDialog
                open={showExitConfirm}
                onOpenChange={setShowExitConfirm}
                language={userLanguage === 'es' ? 'es' : 'ru'}
            />
        </>
    );
});
