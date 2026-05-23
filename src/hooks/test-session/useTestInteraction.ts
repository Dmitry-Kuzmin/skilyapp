import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { triggerHapticFeedback } from "@/lib/telegram";
import { TestMode } from './useTestDataLoader';
import { Zap, Timer, Clock } from 'lucide-react';
import React from 'react';
import type { TestQuestionData, UserAnswer, ActiveExamState, RussiaExamAdapter, NavigateFunction } from '@/types/test-session';

interface UseTestInteractionParams {
    // Context
    profileId?: string;
    mode: string;
    isTelegramApp: boolean;
    pddCountry: string;

    // Data
    questions: TestQuestionData[];
    currentIndex: number;
    activeState: ActiveExamState | null;
    russiaExam: RussiaExamAdapter;

    // Actions (Zustand & Setters)
    answerQuestionZ: (answerId: string, isCorrect: boolean) => void;
    nextQuestion: () => void;
    modifyTime: (amount: number) => void;
    selectOption: (id: string) => void;
    setRussiaSelectedOption: (id: string | null) => void;

    // UI Local State Setters
    setIsTransitioning: (v: boolean) => void;
    setBlitzShaking: (v: boolean) => void;
    setIsAnswerLocked: (v: boolean) => void;
    setPenaltyBlock: (v: number | null) => void;
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
    navigate: NavigateFunction;
    answers: UserAnswer[];
    isAnswerLocked: boolean;

    // Server-validated session (test-manager). Если есть — is_correct берётся от сервера.
    serverSubmit?: (params: {
        test_session_question_id: string;
        selected_option_id: string | null;
        time_taken_ms: number;
        client_reported_correct?: boolean;
        is_skipped?: boolean;
    }) => Promise<{ isCorrect: boolean; correctOptionId: string | null }>;
    getServerQuestionId?: (questionId: string) => string | null;
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
    setRussiaSelectedOption,
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
    answers,
    isAnswerLocked,
    serverSubmit,
    getServerQuestionId,
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
            // Атомарный UPSERT через RPC — один запрос вместо SELECT + INSERT/UPDATE (N+1).
            if (!isCorrect && mode !== "mastery") {
                const { data: rpcResult, error: rpcError } = await supabase.rpc(
                    'upsert_challenge_question',
                    { p_user_id: profileId, p_question_id: questionId }
                );

                if (!rpcError) {
                    const wasNew = Array.isArray(rpcResult) ? rpcResult[0]?.was_new : (rpcResult as any)?.was_new;
                    // Уведомление о первом добавлении (кроме Блица и РФ)
                    if (wasNew && isFirstWrongAnswer && mode !== 'blitz' && mode !== 'exam-russia') {
                        const isNotificationHidden = localStorage.getItem('challenge-bank-notification-hidden') === 'true';
                        if (!isNotificationHidden) {
                            setIsFirstWrongAnswer(false);
                            setShowChallengeBankNotification(true);
                        }
                    }
                    queryClient.invalidateQueries({ queryKey: ["challenge-bank-count"] });
                }
            }

            // 2. Общий прогресс — атомарный SM-2 апдейт через RPC
            const { error } = await supabase.rpc('record_answer', {
                p_user_id: profileId,
                p_question_id: questionId,
                p_is_correct: isCorrect,
                p_time_spent: 0,
            });

            if (!error) {
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
        if (!answerId || isAnswerLocked) return;

        const isExamMode = mode === 'exam' || mode === 'exam-russia';

        // --- RUSSIA EXAM ---
        if (mode === 'exam-russia' && russiaExam.currentQuestion) {
            const selectedAnswer = (russiaExam.currentQuestion.answers || []).find((a: any) => a.id === answerId);
            const isCorrect = selectedAnswer?.isCorrect || false;

            // Server-validated submit (fire-and-forget). Сервер пересчитает финальный
            // score при complete_session — клиентскому isCorrect верить не обязательно.
            if (serverSubmit && getServerQuestionId) {
                const tsqId = getServerQuestionId(russiaExam.currentQuestion.id);
                if (tsqId) {
                    serverSubmit({
                        test_session_question_id: tsqId,
                        selected_option_id: answerId,
                        time_taken_ms: 0,
                        client_reported_correct: Boolean(isCorrect),
                        is_skipped: false,
                    }).catch((err) => {
                        console.error('[useTestInteraction][russia] serverSubmit failed:', err);
                    });
                }
            }

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
                return;
            }

            if (isTelegramApp) {
                triggerHapticFeedback('light');
            }
            return;
        }

        // --- STANDARD MODES ---
        const currentQuestion = questions[currentIndex];

        if (!currentQuestion) {
            console.error('[TestInteraction] ❌ Question object missing!', {
                currentIndex,
                questionsLoaded: questions.length,
                mode
            });
            // Не показываем тост, если это конец теста (просто возвращаемся)
            if (currentIndex >= questions.length && questions.length > 0) return;
            toast.error("Ошибка: вопрос не найден");
            return;
        }

        const options = currentQuestion.answer_options || currentQuestion.answers;
        if (!options) {
            console.error('[TestInteraction] ❌ Options missing for question!', {
                questionId: currentQuestion.id,
                currentIndex
            });
            toast.error("Ошибка: варианты ответов не найдены");
            return;
        }

        const selectedAnswer = options.find((opt: any) => opt.id === answerId);
        // Локальная (клиентская) оценка — для optimistic UI (мгновенно).
        // Серверный submit идёт в фоне для аудита; при complete_session сервер
        // пересчитывает финальный score из test_session_answers, игнорируя клиента.
        const isCorrect = selectedAnswer?.is_correct ?? selectedAnswer?.isCorrect ?? false;

        // === SERVER-VALIDATED SUBMIT (background, не блокирует UI) ===
        if (serverSubmit && getServerQuestionId) {
            const tsqId = getServerQuestionId(currentQuestion.id);
            if (tsqId) {
                // Fire-and-forget: сервер сам запишет ответ и при complete_session
                // вернёт авторитетный score. Если есть расхождение — лог в БД.
                serverSubmit({
                    test_session_question_id: tsqId,
                    selected_option_id: answerId,
                    time_taken_ms: 0,
                    client_reported_correct: Boolean(isCorrect),
                    is_skipped: false,
                }).catch((err) => {
                    console.error('[useTestInteraction] serverSubmit failed (background):', err);
                });
            }
        }

        if (isTelegramApp) {
            // В режиме экзамена всегда одинаковая слабая вибрация, чтобы не подсказывать ответ
            triggerHapticFeedback(isExamMode ? 'light' : (isCorrect ? 'success' : 'error'));
        }
        if (profileId) saveAnswerToDB(currentQuestion.id, isCorrect);

        answerQuestionZ(answerId, isCorrect);

        // Inbox Zero
        if (mode === 'challenge-bank' && isCorrect) {
            markQuestionAsMastered(currentQuestion.id);
        }

        // Mastery & Marathon Mode — трекаем ошибки для следующего раунда
        if ((mode === "mastery" || mode === "marathon") && !isCorrect) {
            setMasteryWrongQuestions((prev: string[]) => prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id]);
        }

        // Blitz Mode
        if (mode === 'blitz') {
            if (isCorrect) {
                modifyTime(10);
                toast.success("+10 сек", {
                    duration: 1500,
                    icon: React.createElement(Zap, { className: "w-5 h-5 text-emerald-500 fill-emerald-500/20" })
                });
            } else {
                modifyTime(-10);
                toast.error("-10 сек", {
                    duration: 1500,
                    icon: React.createElement(Timer, { className: "w-5 h-5 text-red-500" })
                });
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
        // Режимы, в которых пользователь вручную жмёт "Следующий" (нет авто-перехода после ответа).
        // exam и blitz — авто-переход после 300ms (они НЕ в этом списке).
        const isPracticeLikeMode = [
            'practice', 'dgt', 'pdd-topic', 'pdd-ticket', 'by-topic', 'traps',
            'mastery', 'hardest', 'sequential', 'challenge-bank',
            'marathon', 'redemption', 'module', 'favorites', 'nonstop', 'smart'
        ].includes(mode);

        if (isPracticeLikeMode) {
            // В режиме практики не переходим автоматически, ждем пользователя 
            // (или можно добавить опцию авто-перехода в настройках)
            // Если мы тут, состояние уже обновлено в сторе.
        } else {
            // Для экзамена, блица и нон-стопа автопереход
            if (!isCorrect && mode === 'exam') {
                // В обычном экзамене ошибка не блокирует переход, просто записывается
            }
            // Автопереход после небольшой задержки (для всех режимов кроме practice-like)
            setIsTransitioning(true);
            setTimeout(() => {
                setIsTransitioning(false);
                nextQuestion();
            }, 300);
        }
    };

    return { handleAnswer };
};
