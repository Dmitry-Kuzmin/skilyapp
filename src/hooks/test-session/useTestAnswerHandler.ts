import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { saveTestProgress } from '@/lib/localTestProgress';
import { triggerHapticFeedback } from '@/lib/telegram';
import { isTelegramMiniApp } from '@/lib/telegram';
import type { QuestionData, Answer } from '@/types/question';

// Types for Russia Exam
interface RussiaExamResult {
    shouldContinue: boolean;
    shouldAddExtra?: boolean;
    extraTime?: number;
    blockId?: number;
    failureReason?: string;
}

interface RussiaExamHook {
    currentQuestion: {
        id: string;
        answers: Array<{ id: string; isCorrect: boolean }>;
    } | null;
    handleAnswer: (isCorrect: boolean) => RussiaExamResult;
    isExtraMode: boolean;
    progress: { current: number };
}

interface UseTestAnswerHandlerOptions {
    // Current state
    mode: string;
    currentIndex: number;
    selectedOption: string | null;
    answers: Answer[];
    questions: QuestionData[];
    testInfo: { id: string; title: string } | null;
    profileId: string | null;
    startTime: number;
    masteryWrongQuestions: string[];
    isFirstWrongAnswer: boolean;

    // Russia exam specific
    russiaExam: RussiaExamHook;

    // State setters
    setAnswers: (answers: Answer[]) => void;
    setCurrentIndex: (index: number) => void;
    setSelectedOption: (option: string | null) => void;
    setIsTransitioning: (transitioning: boolean) => void;
    setIsAnswerLocked: (locked: boolean) => void;
    setPenaltyBlock: (block: number | null) => void;
    setShowPenaltyAlert: (show: boolean) => void;
    setFailureReason: (reason: string) => void;
    setShowFailureModal: (show: boolean) => void;
    setMasteryWrongQuestions: (questions: string[]) => void;
    setIsFirstWrongAnswer: (isFirst: boolean) => void;
    setIsQuestionBookmarked: (bookmarked: boolean) => void;
    setShowChallengeBankNotification: (show: boolean) => void;

    // Timer
    addPenalty: (minutes: number) => void;

    // Navigation
    nextQuestion: () => void;

    // Practice mode detection
    isPracticeLikeMode: boolean;
    isRussia?: boolean;
}

interface UseTestAnswerHandlerResult {
    handleAnswer: (optionId?: string) => Promise<void>;
    isProcessing: boolean;
}

/**
 * Hook for handling answer submission logic.
 * Extracts the complex handleAnswer function from TestSession.
 */
export function useTestAnswerHandler(options: UseTestAnswerHandlerOptions): UseTestAnswerHandlerResult {
    const {
        mode,
        currentIndex,
        selectedOption,
        answers,
        questions,
        testInfo,
        profileId,
        startTime,
        masteryWrongQuestions,
        isFirstWrongAnswer,
        russiaExam,
        setAnswers,
        setCurrentIndex,
        setSelectedOption,
        setIsTransitioning,
        setIsAnswerLocked,
        setPenaltyBlock,
        setShowPenaltyAlert,
        setFailureReason,
        setShowFailureModal,
        setMasteryWrongQuestions,
        setIsFirstWrongAnswer,
        setIsQuestionBookmarked,
        setShowChallengeBankNotification,
        addPenalty,
        nextQuestion,
        isPracticeLikeMode,
        isRussia = false,
    } = options;

    const isProcessingRef = useRef(false);
    const isTelegramApp = isTelegramMiniApp();

    const handleAnswer = useCallback(async (optionId?: string) => {
        const answerId = optionId || selectedOption;
        if (!answerId) return;

        // Prevent double submissions
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            // === RUSSIA EXAM MODE ===
            if (mode === 'exam-russia' && russiaExam.currentQuestion) {
                const selectedAnswer = russiaExam.currentQuestion.answers.find(a => a.id === answerId);
                const isCorrect = selectedAnswer?.isCorrect || false;

                const result = russiaExam.handleAnswer(isCorrect);

                if (!result.shouldContinue) {
                    // Exam failed - show modal
                    setFailureReason(result.failureReason || "Экзамен не сдан");
                    setShowFailureModal(true);

                    const newAnswer: Answer = {
                        questionId: russiaExam.currentQuestion.id,
                        selectedAnswerId: answerId,
                        isCorrect,
                    };
                    setAnswers([...answers, newAnswer]);
                    return;
                }

                // Lock UI on error with penalty
                if (!isCorrect && result?.shouldAddExtra) {
                    setIsAnswerLocked(true);
                    setPenaltyBlock(result.blockId || null);
                    setShowPenaltyAlert(true);

                    // Add penalty time
                    if (result.extraTime) {
                        addPenalty(result.extraTime / 60); // Hook expects minutes
                        toast.info(`+${Math.floor(result.extraTime / 60)} минут добавлено за ошибку`, {
                            icon: "⏱️",
                            className: "bg-orange-500 text-white border-none",
                        });
                    }

                    // Haptic feedback on error
                    if (isTelegramApp) {
                        triggerHapticFeedback('error');
                    }

                    const newAnswer: Answer = {
                        questionId: russiaExam.currentQuestion.id,
                        selectedAnswerId: answerId,
                        isCorrect,
                    };
                    setAnswers([...answers, newAnswer]);
                    return;
                }

                // Update state for correct/incorrect without penalty
                const newAnswer: Answer = {
                    questionId: russiaExam.currentQuestion.id,
                    selectedAnswerId: answerId,
                    isCorrect,
                };
                setAnswers([...answers, newAnswer]);

                // Move to next question
                setCurrentIndex(russiaExam.progress.current - 1);
                setSelectedOption(null);
                setIsTransitioning(true);
                setTimeout(() => setIsTransitioning(false), 300);
                return;
            }

            // === STANDARD MODE ===
            const currentQuestion = questions[currentIndex];
            if (!currentQuestion || !currentQuestion.answer_options) {
                toast.error("Ошибка: вопрос не найден");
                return;
            }

            const selectedAnswer = currentQuestion.answer_options.find(opt => opt.id === answerId);
            const isCorrect = selectedAnswer?.is_correct || false;

            // Haptic feedback in Telegram
            if (isTelegramApp) {
                triggerHapticFeedback(isCorrect ? 'success' : 'error');
            }

            const newAnswer: Answer = {
                questionId: currentQuestion.id,
                selectedAnswerId: answerId,
                isCorrect,
            };

            const updatedAnswers = [...(answers || []), newAnswer];
            setAnswers(updatedAnswers);

            // Save progress locally for offline mode
            if (testInfo?.id) {
                saveTestProgress(
                    testInfo.id,
                    mode,
                    updatedAnswers.map(a => ({
                        questionId: a.questionId,
                        selectedAnswerId: a.selectedAnswerId,
                        isCorrect: a.isCorrect,
                        timestamp: Date.now(),
                    })),
                    currentIndex,
                    startTime
                ).catch((error) => {
                    console.error('[TestSession] Error saving progress locally:', error);
                });
            }

            // Mastery Mode: track wrong questions for retry
            if (mode === "mastery" && !isCorrect) {
                if (!masteryWrongQuestions.includes(currentQuestion.id)) {
                    setMasteryWrongQuestions([...masteryWrongQuestions, currentQuestion.id]);
                }
            }

            // Save user progress to server (Skip for Russia due to FK constraints)
            if (!isRussia) {
                // Add to Challenge Bank on first error (not in mastery mode)
                if (!isCorrect && profileId && mode !== "mastery") {
                    await handleChallengeBankUpdate(
                        currentQuestion.id,
                        profileId,
                        answers,
                        isFirstWrongAnswer,
                        setIsFirstWrongAnswer,
                        setIsQuestionBookmarked,
                        setShowChallengeBankNotification
                    ).catch(err => console.error('[Challenge Bank] Silent error:', err));
                }

                // Save user progress to server
                await saveUserProgress(currentQuestion.id, isCorrect).catch(err => console.error('[Progress] Silent error:', err));
            }

            // Mode-specific behavior
            if (isPracticeLikeMode) {
                // Practice mode - stay on question to show feedback
            } else {
                // Exam mode - move to next question immediately
                setSelectedOption(null);
                nextQuestion();
            }
        } finally {
            isProcessingRef.current = false;
        }
    }, [
        mode,
        currentIndex,
        selectedOption,
        answers,
        questions,
        testInfo,
        profileId,
        startTime,
        masteryWrongQuestions,
        isFirstWrongAnswer,
        russiaExam,
        setAnswers,
        setCurrentIndex,
        setSelectedOption,
        setIsTransitioning,
        setIsAnswerLocked,
        setPenaltyBlock,
        setShowPenaltyAlert,
        setFailureReason,
        setShowFailureModal,
        setMasteryWrongQuestions,
        setIsFirstWrongAnswer,
        setIsQuestionBookmarked,
        setShowChallengeBankNotification,
        addPenalty,
        nextQuestion,
        isPracticeLikeMode,
        isTelegramApp,
    ]);

    return {
        handleAnswer,
        isProcessing: isProcessingRef.current,
    };
}

// Helper function to update Challenge Bank
async function handleChallengeBankUpdate(
    questionId: string,
    profileId: string,
    answers: Answer[],
    isFirstWrongAnswer: boolean,
    setIsFirstWrongAnswer: (isFirst: boolean) => void,
    setIsQuestionBookmarked: (bookmarked: boolean) => void,
    setShowChallengeBankNotification: (show: boolean) => void
): Promise<void> {
    try {
        const wrongAnswersInThisTest = answers.filter(a => !a.isCorrect).length;
        const showNotification = wrongAnswersInThisTest === 0 && isFirstWrongAnswer;

        // Mark bookmark icon as blue
        setIsQuestionBookmarked(true);

        // Show notification only on first wrong answer
        const isNotificationHidden = localStorage.getItem('challenge-bank-notification-hidden') === 'true';
        if (showNotification && !isNotificationHidden) {
            setIsFirstWrongAnswer(false);
            setShowChallengeBankNotification(true);
        }

        // Check if question already exists in Challenge Bank
        const { data: existing, error: selectError } = await (supabase as any)
            .from('user_challenge_questions')
            .select('id, times_wrong')
            .eq('user_id', profileId)
            .eq('question_id', questionId)
            .maybeSingle();

        if (selectError) {
            console.error('[Challenge Bank] Error checking existing question:', selectError);
            return;
        }

        if (existing) {
            // Update existing record
            await (supabase as any)
                .from('user_challenge_questions')
                .update({
                    times_wrong: existing.times_wrong + 1,
                    last_wrong_at: new Date().toISOString(),
                    mastered: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
        } else {
            // Create new record
            await (supabase as any)
                .from('user_challenge_questions')
                .insert({
                    user_id: profileId,
                    question_id: questionId,
                    times_wrong: 1,
                    last_wrong_at: new Date().toISOString(),
                });
        }
    } catch (error) {
        console.error('[Challenge Bank] Error:', error);
    }
}

// Helper function to save user progress to server
async function saveUserProgress(questionId: string, isCorrect: boolean): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!profile) return;

        const progressData = {
            user_id: profile.id,
            question_id: questionId,
            is_answered: true,
            is_correct: isCorrect,
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
        };

        await (supabase as any)
            .from("user_progress")
            .upsert(progressData, {
                onConflict: 'user_id,question_id',
            });
    } catch (error) {
        console.error("Error saving progress:", error);
    }
}
