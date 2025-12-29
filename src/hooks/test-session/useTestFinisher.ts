import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { clearTestProgress } from '@/lib/localTestProgress';
import { checkOnlineStatus } from '@/hooks/useOnlineStatus';
import { enqueueOfflineAction, trackOfflineAction } from '@/utils/offlineAnalytics';
import type { QuestionData, Answer } from '@/types/question';

interface TestRewardResult {
    success?: boolean;
    coins_awarded: number;
    sp_awarded: number;
    message?: string;
}

interface UseTestFinisherOptions {
    // State
    mode: string;
    questions: QuestionData[];
    answers: Answer[];
    testInfo: { id: string; title: string } | null;
    testId: string | null;
    profileId: string | null;
    startTime: number;
    timeLeft: number;
    initialTimeBudget: number;
    isPremium: boolean;
    testSessionIdRef: React.MutableRefObject<string | null>;

    // Mastery Mode specific
    masteryWrongQuestions: string[];
    masteryRound: number;
    setMasteryWrongQuestions: (questions: string[]) => void;
    setMasteryRound: (round: number) => void;

    // Engine controls
    setQuestions: (questions: QuestionData[]) => void;
    setCurrentIndex: (index: number) => void;
    setAnswers: (answers: Answer[]) => void;
    setSelectedOption: (option: string | null) => void;

    // UI resets
    setShowTranslation: (show: boolean) => void;
    setShowAIExplanation: (show: boolean) => void;

    // Topic for module mode
    topic?: string;

    // Session ID generator
    getOrCreateSessionId: () => string;
}

interface UseTestFinisherResult {
    finishTest: () => Promise<void>;
    isFinishing: boolean;
}

/**
 * Hook for handling test completion logic.
 * Handles saving results, awarding rewards, and navigation to results page.
 */
export function useTestFinisher(options: UseTestFinisherOptions): UseTestFinisherResult {
    const {
        mode,
        questions,
        answers,
        testInfo,
        testId,
        profileId,
        startTime,
        timeLeft,
        initialTimeBudget,
        isPremium,
        testSessionIdRef,
        masteryWrongQuestions,
        masteryRound,
        setMasteryWrongQuestions,
        setMasteryRound,
        setQuestions,
        setCurrentIndex,
        setAnswers,
        setSelectedOption,
        setShowTranslation,
        setShowAIExplanation,
        topic,
        getOrCreateSessionId,
    } = options;

    const navigate = useNavigate();
    const isFinishingRef = useRef(false);

    const finishTest = useCallback(async () => {
        if (isFinishingRef.current) return;
        isFinishingRef.current = true;

        try {
            // Clear local saved progress
            if (testInfo?.id) {
                clearTestProgress(testInfo.id).catch((error) => {
                    console.error('[TestSession] Error clearing saved progress:', error);
                });
            }

            // MASTERY MODE: Repeat wrong questions
            if (mode === "mastery" && masteryWrongQuestions.length > 0) {
                const wrongQuestionsData = questions.filter(q => masteryWrongQuestions.includes(q.id));

                if (wrongQuestionsData.length > 0) {
                    toast.info(
                        `Раунд ${masteryRound} завершён! Повторяем ${wrongQuestionsData.length} неправильных вопросов 🔄`,
                        { duration: 3000 }
                    );

                    // Restart with wrong questions
                    setQuestions(wrongQuestionsData);
                    setMasteryWrongQuestions([]);
                    setMasteryRound(masteryRound + 1);
                    setCurrentIndex(0);
                    setAnswers([]);
                    setSelectedOption(null);
                    setShowTranslation(false);
                    setShowAIExplanation(false);
                    isFinishingRef.current = false;
                    return; // Don't finish test!
                }
            }

            // Mastery Mode complete - show congratulation
            if (mode === "mastery") {
                toast.success(`🎉 ИДЕАЛЬНО! Все вопросы правильно за ${masteryRound} раундов!`, { duration: 5000 });
            }

            // Calculate results
            const correctCount = answers.filter((a) => a.isCorrect).length;
            let score = 0;
            if (mode === "blitz") {
                score = (correctCount * 100) + (Math.max(0, timeLeft) * 10);
            } else {
                score = Math.round((correctCount / Math.max(1, questions.length)) * 100);
            }
            const timeSpent = startTime > 0
                ? Math.floor((Date.now() - startTime) / 1000)
                : (initialTimeBudget > 0 && timeLeft > 0)
                    ? initialTimeBudget - timeLeft
                    : 0;

            let rewardResult: TestRewardResult | null = null;

            try {
                // Update sequential test progress
                if (testId && profileId) {
                    const { error: progressError } = await (supabase as any).rpc('update_test_progress', {
                        p_user_id: profileId,
                        p_test_id: testId,
                        p_correct_answers: correctCount,
                        p_total_questions: questions.length,
                        p_time_spent_seconds: timeSpent,
                    });

                    if (progressError) {
                        console.error("Error updating test progress:", progressError);
                    }
                }

                // Save module topic progress
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

                // Save to game_sessions
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await (supabase as any)
                        .from("profiles")
                        .select("id")
                        .eq("user_id", user.id)
                        .single();

                    if (profile) {
                        const sessionData = {
                            user_id: profile.id,
                            game_type: testId
                                ? "test_sequential"
                                : mode === "marathon"
                                    ? "test_marathon"
                                    : mode === "nonstop"
                                        ? "test_nonstop"
                                        : mode === "traps"
                                            ? "test_traps"
                                            : mode === "exam" || mode === "exam-russia"
                                                ? "test_exam"
                                                : mode === "blitz"
                                                    ? "test_blitz"
                                                    : mode === "module"
                                                        ? "test_module"
                                                        : "test_practice",
                            score: mode === "blitz" ? Math.max(0, score) : Math.min(Math.max(0, score), 100),
                            total_questions: Math.min(Math.max(1, questions.length), 100),
                            duration_seconds: Math.min(Math.max(0, timeSpent), 7200),
                        };

                        await (supabase as any).from("game_sessions").insert(sessionData);
                    }
                }
            } catch (error) {
                console.error("Error saving results:", error);
            }

            // Award rewards
            if (profileId) {
                try {
                    const sessionId = getOrCreateSessionId();
                    const realOnline = await checkOnlineStatus();

                    if (!realOnline) {
                        // Offline mode - queue for later
                        console.log("[TestSession] Offline mode detected, queuing test result for later sync");

                        await enqueueOfflineAction('test-result', {
                            user_id: profileId,
                            session_id: sessionId,
                            test_id: testId || null,
                            score,
                            questions_count: questions.length,
                            correct_count: correctCount,
                            test_duration_seconds: Math.max(timeSpent, 0),
                            premium_flag: Boolean(isPremium),
                            double_sp_active: false,
                        });

                        const baseCoins = Math.max(2, Math.floor(score / 10));
                        const baseSP = Math.max(1, Math.floor(score / 20));

                        rewardResult = {
                            coins_awarded: baseCoins,
                            sp_awarded: baseSP,
                            message: "Результат сохранён локально. Награды будут начислены при восстановлении сети.",
                        };

                        trackOfflineAction('test-submit', true);
                        toast.info("Результат сохранён. Награды будут начислены при восстановлении соединения.", {
                            duration: 4000,
                        });
                    } else {
                        // Online - normal submission
                        const { data: rewardData, error: rewardError } = await supabase.functions.invoke("complete-test-and-award", {
                            body: {
                                user_id: profileId,
                                session_id: sessionId,
                                test_id: testId || null,
                                score,
                                questions_count: questions.length,
                                correct_count: correctCount,
                                test_duration_seconds: Math.max(timeSpent, 0),
                                premium_flag: Boolean(isPremium),
                                double_sp_active: false,
                            },
                        });

                        if (rewardError) throw rewardError;
                        rewardResult = rewardData as TestRewardResult;
                        trackOfflineAction('test-submit', true);
                        console.log("[TestSession] Rewards awarded successfully:", rewardResult);
                    }
                } catch (awardError: any) {
                    console.error("[TestSession] Error awarding test:", awardError);
                    trackOfflineAction('test-submit', false, awardError.message);

                    const baseCoins = Math.max(2, Math.floor(score / 10));
                    const baseSP = Math.max(1, Math.floor(score / 20));

                    rewardResult = {
                        success: false,
                        coins_awarded: baseCoins,
                        sp_awarded: baseSP,
                        message: "Награды будут начислены позже",
                    };

                    toast.warning("Результаты сохранены. Награды будут начислены при восстановлении соединения.", {
                        duration: 5000,
                    });
                }
            }

            // Navigate to results
            navigate("/test/results", {
                state: {
                    questions,
                    answers,
                    mode: testId ? "sequential" : mode,
                    timeSpent,
                    testId,
                    testInfo,
                    rewardResult,
                    sessionId: testSessionIdRef.current,
                },
            });
        } finally {
            isFinishingRef.current = false;
        }
    }, [
        mode,
        questions,
        answers,
        testInfo,
        testId,
        profileId,
        startTime,
        timeLeft,
        initialTimeBudget,
        isPremium,
        testSessionIdRef,
        masteryWrongQuestions,
        masteryRound,
        setMasteryWrongQuestions,
        setMasteryRound,
        setQuestions,
        setCurrentIndex,
        setAnswers,
        setSelectedOption,
        setShowTranslation,
        setShowAIExplanation,
        topic,
        getOrCreateSessionId,
        navigate,
    ]);

    return {
        finishTest,
        isFinishing: isFinishingRef.current,
    };
}
