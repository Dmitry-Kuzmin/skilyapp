import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { saveTestProgress, clearTestProgress } from "@/utils/testStorage";
import { triggerHapticFeedback, isTelegramMiniApp } from '@/lib/telegram';
import { Zap, Timer } from 'lucide-react';
import React from 'react';
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
    addTime?: (seconds: number) => void;

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
        addTime,
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
                        toast.info(`+ ${Math.floor(result.extraTime / 60)} минут добавлено за ошибку`, {
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
                    currentIndex + 1,
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
                if (profileId) {
                    if (!isCorrect && mode !== "mastery") {
                        // Add to Challenge Bank on error
                        await handleChallengeBankUpdate(
                            currentQuestion.id,
                            profileId,
                            answers,
                            isFirstWrongAnswer,
                            setIsFirstWrongAnswer,
                            setShowChallengeBankNotification
                        ).catch(err => console.error('[Challenge Bank] Silent error:', err));
                    } else if (isCorrect) {
                        // Mark as mastered if correct (removes from Errors, keeps in Favorites if favorite)
                        await handleChallengeBankSuccess(
                            currentQuestion.id,
                            profileId
                        ).catch(err => console.error('[Challenge Bank] Silent error:', err));
                    }
                }

                // Save user progress to server
                await saveUserProgress(currentQuestion.id, isCorrect).catch(err => console.error('[Progress] Silent error:', err));
            }

            // Mode-specific behavior
            if (mode === "marathon" && !isCorrect) {
                if (testInfo?.id) {
                    clearTestProgress(testInfo.id).catch(console.error);
                }
                setFailureReason("Марафон окончен: ошибка недопустима. Попробуйте еще раз!");
                setShowFailureModal(true);
                return;
            }

            if (mode === "blitz") {
                if (isCorrect) {
                    // Bonus logic
                    if (addTime) addTime(10);
                    toast.success("+10 сек", {
                        duration: 1500,
                        icon: React.createElement(Zap, { className: "w-5 h-5 text-emerald-500 fill-emerald-500/20" })
                    });
                } else {
                    // Penalty logic
                    if (addTime) addTime(-10);
                    toast.error("-10 сек", {
                        duration: 1500,
                        icon: React.createElement(Timer, { className: "w-5 h-5 text-red-500" })
                    });
                }

                // Save progress
                // The saveTestProgress call for blitz mode is already handled above for all modes.
                // await saveTestProgress(testInfo.id, updatedAnswers, currentIndex + 1, startTime);

                // Check finish condition (all answered)
                // Logic handled by useEffect in TestSession usually, or explicit finishTest
            }

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
    setShowChallengeBankNotification: (show: boolean) => void
): Promise<void> {
    try {
        const wrongAnswersInThisTest = answers.filter(a => !a.isCorrect).length;
        const showNotification = wrongAnswersInThisTest === 0 && isFirstWrongAnswer;

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
                    correct_streak: 0, // Reset streak on error
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
                    correct_streak: 0,
                    // is_favorite defaults to false
                    // mastered defaults to false
                });
        }
    } catch (error) {
        console.error('[Challenge Bank] Error:', error);
    }
}

async function handleChallengeBankSuccess(
    questionId: string,
    profileId: string
): Promise<void> {
    try {
        // Fetch current streak and favorite status
        const { data: existing, error: fetchError } = await (supabase as any)
            .from('user_challenge_questions')
            .select('id, correct_streak, is_favorite')
            .eq('user_id', profileId)
            .eq('question_id', questionId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const newStreak = (existing?.correct_streak || 0) + 1;

        // Mark as mastered (removes from Errors list)
        // If it was favorite, it stays favorite (is_favorite is untouched).
        // If it was error, it is resolved.
        await (supabase as any)
            .from('user_challenge_questions')
            .update({
                mastered: true,
                correct_streak: newStreak,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', profileId)
            .eq('question_id', questionId);

        // Interval Learning: If correctly answered 3 times and is in favorites, suggest removal
        if (existing?.is_favorite && newStreak >= 3) {
            toast.success("Вопрос освоен!", {
                description: "Вы ответили правильно 3 раза подряд. Удалить из избранного?",
                duration: 6000,
                action: {
                    label: "Удалить",
                    onClick: async () => {
                        const { error: deleteError } = await (supabase as any)
                            .from('user_challenge_questions')
                            .update({ is_favorite: false, updated_at: new Date().toISOString() })
                            .eq('user_id', profileId)
                            .eq('question_id', questionId);

                        if (deleteError) {
                            toast.error("Не удалось удалить из избранного");
                        } else {
                            toast.success("Удалено из избранного");
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('[Challenge Bank] Error marking success:', error);
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
