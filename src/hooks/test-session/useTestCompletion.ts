import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearTestProgress } from "@/utils/testStorage";
import { useExamStore } from "@/store/examStore";
import { checkOnlineStatus } from "@/hooks/useOnlineStatus";

interface UseTestCompletionParams {
    profileId?: string;
    mode: string;
    questions: any[];
    testInfo: any;
    startTime: number;
    timeLeft: number;
    initialTimeBudget: number;
    testId: string | undefined;
    ticketIdParam: string | undefined;
    pddCountry: string;
    topic: string | undefined;
    isPremium: boolean;
    enqueueOfflineAction: any;
    getOrCreateSessionId: () => string;

    // Mastery Mode
    masteryWrongQuestions: string[];
    masteryRound: number;
    setQuestions: (q: any[]) => void;
    setMasteryWrongQuestions: (q: string[]) => void;
    setMasteryRound: (r: number) => void;
    setCurrentIndex: (i: number) => void;
    initializeExam: any;
    setShowTranslation: (v: boolean) => void;
    closeAIChat: () => void;
    russiaExamQuestions: any[];
    isRussia: boolean;
    answers?: any[];
    setAnswers: (a: any[]) => void;
}

interface TestRewardResult {
    coins_awarded?: number;
    sp_awarded?: number;
    base_coins?: number;
    base_sp?: number;
    abuse_penalty?: number;
    diminishing_factor?: number;
    message?: string;
    level_up?: boolean;
    new_level?: number;
    tests_today?: number;
}

export const useTestCompletion = ({
    profileId,
    mode,
    questions,
    testInfo,
    startTime,
    timeLeft,
    initialTimeBudget,
    testId,
    ticketIdParam,
    pddCountry,
    topic,
    isPremium,
    enqueueOfflineAction,
    getOrCreateSessionId,
    masteryWrongQuestions,
    masteryRound,
    setQuestions,
    setMasteryWrongQuestions,
    setMasteryRound,
    setCurrentIndex,
    initializeExam,
    setShowTranslation,
    closeAIChat,
    russiaExamQuestions,
    isRussia,
    answers = [],
    setAnswers
}: UseTestCompletionParams) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const finishTest = async () => {
        // Получаем самое свежее состояние из стора
        const latestState = useExamStore.getState().activeState;

        // Безопасно извлекаем ответы
        const currentAnswers = latestState
            ? (latestState.kind === 'russia'
                ? [...Object.values(latestState.data.mainAnswers), ...Object.values(latestState.data.extraAnswers)].map((a: any) => ({
                    questionId: a.questionId,
                    selectedAnswerId: a.selectedAnswerId || '',
                    isCorrect: a.isCorrect
                }))
                : Object.entries(latestState.data.answers).map(([qid, ans]: [string, any]) => ({
                    questionId: qid,
                    selectedAnswerId: ans.selectedOptionId,
                    isCorrect: ans.isCorrect
                })))
            : answers;

        const currentQuestions = latestState
            ? (latestState.kind === 'russia'
                ? russiaExamQuestions
                : latestState.data.questions)
            : questions;

        // КРИТИЧНО: Очищаем локальное сохранение после завершения теста
        if (testInfo?.id) {
            clearTestProgress(testInfo.id).catch((error) => {
                console.error('[TestSession] Error clearing saved progress:', error);
            });
        }

        // MASTERY / MARATHON MODE: Если есть неправильные вопросы - повторяем!
        if ((mode === "mastery" || mode === "marathon") && masteryWrongQuestions.length > 0) {
            // ФИКС: Берем ТОЛЬКО те вопросы, которые были в masteryWrongQuestions
            const wrongQuestionsData = currentQuestions.filter((q: any) => masteryWrongQuestions.includes(q.id));

            if (wrongQuestionsData.length > 0) {
                const nextRound = masteryRound + 1;
                toast.info(
                    `🎉 Раунд ${masteryRound} пройден! Переходим к Раунду ${nextRound} (${wrongQuestionsData.length} вопросов)`,
                    { duration: 4500 }
                );

                // Очищаем локальные ответы сразу, чтобы UI не мигал старыми данными
                setAnswers([]);

                // Перезапускаем с неправильными вопросами
                setQuestions(wrongQuestionsData);
                setMasteryWrongQuestions([]); // Сбрасываем для нового раунда
                setMasteryRound(nextRound);
                setCurrentIndex(0);

                // Реинициализируем экзамен
                initializeExam(mode, wrongQuestionsData, { timeLimit: initialTimeBudget });

                setShowTranslation(false);
                if (closeAIChat) closeAIChat();
                return; // НЕ завершаем тест!
            }
        }

        // Если Mastery / Marathon Mode и все правильно - показываем поздравление!
        if (mode === "mastery") {
            toast.success(`🎉 ИДЕАЛЬНО! Все вопросы правильно за ${masteryRound} раундов!`, { duration: 5000 });
        } else if (mode === "marathon") {
            toast.success(`🏆 Марафон пройден за ${masteryRound} раундов без единой ошибки!`, { duration: 6000 });
        }

        const correctCount = currentAnswers.filter((a: any) => a.isCorrect).length;
        const score = Math.round((correctCount / Math.max(1, currentQuestions.length)) * 100);

        // ДИАГНОСТИКА: Подробное логирование
        console.log('[TestSession] finishTest final report:', {
            questionsTotal: currentQuestions.length,
            answersTotal: currentAnswers.length,
            correctCount,
            score,
            allAnswers: currentAnswers.map((a: any) => ({ id: a.questionId, ok: a.isCorrect }))
        });

        // Валидация
        if (currentQuestions.length > 0 && currentAnswers.length === 0) {
            console.error('[TestSession] ❌ CRITICAL: No answers recorded but questions exist!');
        }

        const timeSpent = startTime > 0
            ? Math.floor((Date.now() - startTime) / 1000)
            : initialTimeBudget > 0
                ? initialTimeBudget - timeLeft
                : 0;

        // Определяем эффективный ID теста для сохранения прогресса
        const effectiveTestId = testId ? testId : (mode === 'pdd-ticket' && ticketIdParam ? `pdd-ticket-${ticketIdParam}` : null);

        let rewardResult: TestRewardResult | null = null;

        try {
            // Для билетов ПДД: сохраняем в ИЗОЛИРОВАННУЮ таблицу
            if (mode === 'pdd-ticket' && effectiveTestId && profileId) {
                const ticketScore = Math.round((correctCount / Math.max(1, questions.length)) * 100);
                const ticketStatus = ticketScore >= 90 ? 'passed' : (ticketScore > 0 ? 'failed' : 'in_progress');

                // Определяем код страны для БД
                const dbCountry = pddCountry === 'russia' ? 'ru' : pddCountry === 'spain' ? 'es' : (pddCountry || 'ru');

                const { error: upsertError } = await supabase
                    .from('user_pdd_ticket_progress')
                    .upsert({
                        user_id: profileId,
                        ticket_id: effectiveTestId,
                        country: dbCountry,
                        status: ticketStatus,
                        score: ticketScore,
                        correct_answers: correctCount,
                        total_questions: questions.length,
                        time_spent_seconds: timeSpent,
                        completed_at: new Date().toISOString(),
                        best_score: ticketScore, // Will be handled by DB trigger/logic for max
                    }, {
                        onConflict: 'user_id,ticket_id,country'
                    });

                if (upsertError) {
                    console.error("[TestSession] Error saving ticket progress to DB:", upsertError);
                    // Fallback: сохраняем в localStorage
                    const localKey = `pdd-ticket-progress-${profileId}-${dbCountry}`;
                    const existingData = localStorage.getItem(localKey);
                    const tickets = existingData ? JSON.parse(existingData) : [];

                    // Найти или добавить запись для этого билета
                    const existingIndex = tickets.findIndex((t: { ticket_id: string }) => t.ticket_id === effectiveTestId);
                    const ticketData = {
                        ticket_id: effectiveTestId,
                        score: ticketScore,
                        status: ticketStatus,
                        correct_answers: correctCount,
                        total_questions: questions.length,
                        best_score: Math.max(ticketScore, existingIndex >= 0 ? tickets[existingIndex].best_score || 0 : 0)
                    };

                    if (existingIndex >= 0) {
                        tickets[existingIndex] = ticketData;
                    } else {
                        tickets.push(ticketData);
                    }

                    localStorage.setItem(localKey, JSON.stringify(tickets));
                }
                // Invalidate cache so useTicketsStatus refetches
                queryClient.invalidateQueries({ queryKey: ['user-pdd-ticket-progress'] });
            }
            // Для sequential тестов с UUID: используем RPC функцию
            else if (effectiveTestId && profileId && testId) {
                const { error: progressError } = await (supabase as any).rpc('update_test_progress', {
                    p_user_id: profileId,
                    p_test_id: effectiveTestId,
                    p_correct_answers: correctCount,
                    p_total_questions: questions.length,
                    p_time_spent_seconds: timeSpent,
                });

                if (progressError) {
                    console.error("Error updating test progress:", progressError);
                }
            }

            // Для module-теста сохраняем прогресс по теме с мягким порогом (>= 70%)
            if (mode === "module" && profileId && topic) {
                try {
                    await (supabase as any)
                        .from("user_topic_progress")
                        .upsert(
                            {
                                user_id: profileId,
                                topic_id: topic,
                                subtopic_id: null,
                                completed: score >= 70,
                                score,
                            },
                            { onConflict: "user_id,topic_id,subtopic_id" }
                        );
                } catch (progressError) {
                    console.error("Error updating module topic progress:", progressError);
                }
            }

            // Сохраняем в game_sessions для совместимости
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await (supabase as any)
                    .from("profiles")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (profile) {
                    const duration = timeSpent;
                    const sessionData = {
                        user_id: profile.id,
                        game_type: testId
                            ? "test_sequential"
                            : mode === "exam"
                                ? "test_exam"
                                : mode === "blitz"
                                    ? "test_blitz"
                                    : mode === "module"
                                        ? "test_module"
                                        : "test_practice",
                        score: Math.min(Math.max(0, score), 100), // Ensure 0-100 range
                        total_questions: Math.min(Math.max(1, questions.length), 100), // Ensure 1-100 range
                        duration_seconds: Math.min(Math.max(0, duration), 7200), // Ensure 0-7200 range
                    };

                    await (supabase as any).from("game_sessions").insert(sessionData);
                }
            }
        } catch (error) {
            console.error("Error saving results:", error);
        }

        if (profileId) {
            try {
                const sessionId = getOrCreateSessionId();

                // OFFLINE-FIRST: Если offline - добавляем в очередь вместо прямой отправки
                const realOnline = await checkOnlineStatus();
                if (!realOnline) {
                    await enqueueOfflineAction('test-result', {
                        user_id: profileId,
                        session_id: sessionId,
                        test_id: testId || null,
                        score,
                        questions_count: currentQuestions.length,
                        correct_count: correctCount,
                        test_duration_seconds: Math.max(timeSpent, 0),
                        premium_flag: Boolean(isPremium),
                        double_sp_active: false,
                        mode,
                    });

                    // Базовые награды для UI (будут пересчитаны при sync)
                    rewardResult = {
                        coins_awarded: 0,
                        sp_awarded: 0,
                        message: "OFFLINE: Результаты сохранены и будут отправлены при подключении."
                    };
                } else {
                    const { data, error } = await supabase.functions.invoke('complete-test-and-award', {
                        body: {
                            user_id: profileId,
                            session_id: sessionId,
                            test_id: testId || null,
                            score,
                            questions_count: currentQuestions.length,
                            correct_count: correctCount,
                            test_duration_seconds: Math.max(timeSpent, 0),
                            premium_flag: Boolean(isPremium),
                            double_sp_active: false,
                            mode,
                        }
                    });
                    if (error) {
                        console.error("Error calculating rewards:", error);
                    } else if (data) {
                        rewardResult = data;
                    }
                }
            } catch (err) {
                console.error("Failed to process rewards:", err);
            }
        }

        navigate("/test/results", {
            state: {
                score,
                total: currentQuestions.length,
                correctCount,
                wrongAnswers: currentAnswers.filter((a: any) => !a.isCorrect).map((a: any) => a.questionId), // ID неправильных
                answers: currentAnswers, // Полный список с questionId и selectedAnswerId
                questions: currentQuestions,
                timeSpent,
                mode,
                rewardResult,
                masteryRound
            },
        });
    };

    return { finishTest };
};
