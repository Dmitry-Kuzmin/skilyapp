import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { triggerHapticFeedback } from "@/lib/telegram";
import { TestMode } from './useTestDataLoader';

interface UseTestInteractionParams {
    // Context
    profileId?: string;
    mode: string;
    isTelegramApp: boolean;
    pddCountry: string;

    // Data
    questions: any[];
    currentIndex: number;
    activeState: any;
    russiaExam: any;

    // Actions (Zustand & Setters)
    answerQuestionZ: (answerId: string, isCorrect: boolean) => void;
    nextQuestion: () => void;
    modifyTime: (amount: number) => void;
    selectOption: (id: string) => void;

    // UI Local State Setters
    setIsTransitioning: (v: boolean) => void;
    setBlitzShaking: (v: boolean) => void;
    setIsAnswerLocked: (v: boolean) => void;
    setPenaltyBlock: (v: string | null) => void;
    setShowPenaltyAlert: (v: boolean) => void;
    setShowFailureModal: (v: boolean) => void;
    setFailureReason: (v: string) => void;
    setShowChallengeBankNotification: (v: boolean) => void;
    setShowReflectionOverlay: (v: boolean) => void;

    // Mastery / Redemption
    setMasteryWrongQuestions: (updater: (prev: string[]) => string[]) => void;
    isRedemptionMode: boolean;
    redemptionStep: 'reflection' | 'drill' | 'completed';
    setRedemptionStep: (v: 'reflection' | 'drill' | 'completed') => void;
    redemptionOriginalCount: number;
    redemptionFailedQuestions: any[];

    // Navigation
    navigate: any;
    answers: any[];
}

export const useTestInteraction = ({
    profileId,
    mode,
    isTelegramApp,
    pddCountry,
    questions,
    currentIndex,
    activeState,
    russiaExam,
    answerQuestionZ,
    nextQuestion,
    modifyTime,
    selectOption,
    setIsTransitioning,
    setBlitzShaking,
    setIsAnswerLocked,
    setPenaltyBlock,
    setShowPenaltyAlert,
    setShowFailureModal,
    setFailureReason,
    setShowChallengeBankNotification,
    setShowReflectionOverlay,
    setMasteryWrongQuestions,
    isRedemptionMode,
    redemptionStep,
    setRedemptionStep,
    redemptionOriginalCount,
    redemptionFailedQuestions,
    navigate,
    answers
}: UseTestInteractionParams) => {
    const queryClient = useQueryClient();
    const [isFirstWrongAnswer, setIsFirstWrongAnswer] = useState(true);

    /**
     * Помечает вопрос как "отработанный" (Inbox Zero)
     */
    const markQuestionAsMastered = async (questionId: string) => {
        if (!profileId) return;
        try {
            const { error } = await supabase
                .from('user_challenge_questions')
                .update({ mastered: true, updated_at: new Date().toISOString() })
                .eq('user_id', profileId)
                .eq('question_id', questionId);

            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ["challenge-bank-count"] });
        } catch (error) {
            console.error('[Challenge Bank] Error marking as mastered:', error);
        }
    };

    /**
     * Сохранение ответа в БД (Прогресс + Банк ошибок)
     */
    const saveAnswerToDB = async (questionId: string, isCorrect: boolean) => {
        if (!profileId) return;

        try {
            // 1. Challenge Bank (только при ошибке и не в режиме mastery/russia)
            if (!isCorrect && mode !== "mastery") {
                const { data: existing, error: selectError } = await supabase
                    .from('user_challenge_questions')
                    .select('id, times_wrong')
                    .eq('user_id', profileId)
                    .eq('question_id', questionId)
                    .maybeSingle();

                if (!selectError) {
                    if (existing) {
                        await supabase.from('user_challenge_questions')
                            .update({
                                times_wrong: existing.times_wrong + 1,
                                last_wrong_at: new Date().toISOString(),
                                mastered: false,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', existing.id);
                    } else {
                        await supabase.from('user_challenge_questions')
                            .insert({
                                user_id: profileId,
                                question_id: questionId,
                                times_wrong: 1,
                                last_wrong_at: new Date().toISOString(),
                            });

                        // Уведомление о первом добавлении (кроме Блица и РФ)
                        if (isFirstWrongAnswer && mode !== 'blitz' && mode !== 'exam-russia') {
                            const isNotificationHidden = localStorage.getItem('challenge-bank-notification-hidden') === 'true';
                            if (!isNotificationHidden) {
                                setIsFirstWrongAnswer(false);
                                setShowChallengeBankNotification(true);
                            }
                        }
                    }
                    queryClient.invalidateQueries({ queryKey: ["challenge-bank-count"] });
                }
            }

            // 2. Общий прогресс
            const { error } = await (supabase as any).from("user_progress").upsert({
                user_id: profileId,
                question_id: questionId,
                is_answered: true,
                is_correct: isCorrect,
                attempts: 1,
                last_attempt_at: new Date().toISOString(),
            }, { onConflict: 'user_id,question_id' });

            if (!error || error.code === '23505') {
                if (isCorrect) markQuestionAsMastered(questionId);
                queryClient.invalidateQueries({ queryKey: ["tickets-status"] });
                queryClient.invalidateQueries({ queryKey: ["user-progress"] });
            }
        } catch (error) {
            console.error('[TestSession] Error saving answer to DB:', error);
        }
    };

    /**
     * Основной обработчик ответа
     */
    const handleAnswer = async (optionId?: string, selectedOptionValue?: string | null) => {
        const answerId = optionId || selectedOptionValue;
        if (!answerId) return;

        // --- RUSSIA EXAM ---
        if (mode === 'exam-russia' && russiaExam.currentQuestion) {
            const selectedAnswer = (russiaExam.currentQuestion.answers || []).find((a: any) => a.id === answerId);
            const isCorrect = selectedAnswer?.isCorrect || false;

            const result = russiaExam.handleAnswer(isCorrect);
            saveAnswerToDB(russiaExam.currentQuestion.id, isCorrect);
            answerQuestionZ(answerId, isCorrect);

            if (!result.shouldContinue) {
                setFailureReason(result.failureReason || "Экзамен не сдан");
                setShowFailureModal(true);
                return;
            }

            if (!isCorrect && result?.shouldAddExtra) {
                setIsAnswerLocked(true);
                setPenaltyBlock(result.blockId || null);
                setShowPenaltyAlert(true);
                if (result.extraTime) {
                    toast.info(`+${Math.floor(result.extraTime / 60)} минут добавлено за ошибку`, {
                        icon: "⏱️",
                        className: "bg-orange-500 text-white border-none",
                    });
                }
                if (isTelegramApp) triggerHapticFeedback('heavy');
                return;
            }

            // Анимация перехода
            setIsTransitioning(true);
            setTimeout(() => setIsTransitioning(false), 300);
            return;
        }

        // --- STANDARD MODES ---
        const currentQuestion = questions[currentIndex];
        if (!currentQuestion || !currentQuestion.answer_options) {
            toast.error("Ошибка: вопрос не найден");
            return;
        }

        const selectedAnswer = currentQuestion.answer_options.find((opt: any) => opt.id === answerId);
        const isCorrect = selectedAnswer?.is_correct || false;

        if (isTelegramApp) triggerHapticFeedback(isCorrect ? 'success' : 'error');
        if (profileId) saveAnswerToDB(currentQuestion.id, isCorrect);

        answerQuestionZ(answerId, isCorrect);

        // Inbox Zero
        if (mode === 'challenge-bank' && isCorrect) {
            markQuestionAsMastered(currentQuestion.id);
        }

        // Mastery Mode
        if (mode === "mastery" && !isCorrect) {
            setMasteryWrongQuestions((prev: string[]) => prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id]);
        }

        // Blitz Mode
        if (mode === 'blitz') {
            if (isCorrect) {
                modifyTime(10);
                toast.success("+10 сек", { duration: 1000, icon: "⚡️" });
            } else {
                modifyTime(-10);
                toast.error("-10 сек", { duration: 1000, icon: "📉" });
                setBlitzShaking(true);
                setTimeout(() => setBlitzShaking(false), 300);
            }
        }

        // --- REDEMPTION MODE ---
        if (isRedemptionMode) {
            if (redemptionStep === 'reflection') {
                if (!isCorrect) {
                    setTimeout(() => setShowReflectionOverlay(true), 800);
                    return;
                } else {
                    const isLastOriginal = (currentIndex + 1) === redemptionOriginalCount;
                    if (isLastOriginal) {
                        toast.success("Отлично! Ты понял принцип. А теперь — контрольные вопросы!", { icon: "🛡️", duration: 4000 });
                        setTimeout(() => {
                            setRedemptionStep('drill');
                            nextQuestion();
                        }, 1000);
                    } else {
                        setTimeout(nextQuestion, 1000);
                    }
                    return;
                }
            } else if (redemptionStep === 'drill') {
                if (!isCorrect) {
                    toast.error("Ошибка на контрольном вопросе. Навык не восстановлен.", { icon: "❌", duration: 5000 });
                    setFailureReason("Ошибка на контрольном вопросе");
                    setShowFailureModal(true);
                    return;
                } else {
                    const isLastDrill = (currentIndex + 1) === questions.length;
                    if (isLastDrill) {
                        toast.success("Навык восстановлен! Рекорд обновлен.", { icon: "💎", duration: 5000 });
                        if (profileId) {
                            supabase.functions.invoke('complete-redemption', {
                                body: { user_id: profileId, failed_questions: redemptionFailedQuestions, pdd_country: pddCountry }
                            }).then(({ data, error }) => {
                                if (!error && data?.sp_awarded) toast.success(`Награда получена: +${data.sp_awarded} SP!`, { icon: "✨" });
                            });
                        }
                        setTimeout(() => {
                            navigate("/test/results", {
                                state: {
                                    isRedemptionSuccess: true,
                                    questions: questions,
                                    answers: [...answers, { questionId: currentQuestion.id, selectedAnswerId: answerId, isCorrect: true }],
                                    mode: 'redemption'
                                }
                            });
                        }, 1000);
                        return;
                    } else {
                        setTimeout(nextQuestion, 1000);
                    }
                    return;
                }
            }
        }

        // --- DEFAULT NAVIGATION ---
        const isPracticeLikeMode = ['practice', 'pdd-topic', 'pdd-ticket', 'by-topic', 'traps', 'mastery', 'hardest', 'sequential', 'challenge-bank'].includes(mode);

        if (isPracticeLikeMode) {
            // В режиме практики не переходим автоматически, ждем пользователя 
            // (или можно добавить опцию авто-перехода в настройках)
            // Но оригинальный код использовал selectedOption для блокировки
            // Если мы тут, состояние уже обновлено в сторе.
        } else {
            // Для экзамена и блица автопереход
            if (!isCorrect && mode === 'exam') {
                // В обычном экзамене ошибка не блокирует переход, просто записывается
            }
            if (mode !== 'practice') {
                setIsTransitioning(true);
                setTimeout(() => {
                    setIsTransitioning(false);
                    nextQuestion();
                }, 300);
            }
        }
    };

    return { handleAnswer };
};
