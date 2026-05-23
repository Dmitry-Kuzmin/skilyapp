/**
 * useTestCompletion — orchestrator финализации теста.
 *
 * Декомпозирован на 4 чистые async-утилиты:
 *   - savePddTicketProgress    (PDD билеты)
 *   - saveTopicProgress        (sequential + module)
 *   - logGameSession           (legacy game_sessions log)
 *   - processRewards           (server-validated → legacy fallback)
 *
 * Этот хук только координирует: извлекает ответы из Zustand,
 * обрабатывает mastery/marathon round retry, выбирает какие
 * утилиты вызвать и навигирует на /test/results.
 */

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { clearTestProgress } from '@/utils/testStorage';
import { useExamStore } from '@/store/examStore';
import { savePddTicketProgress } from './completion/savePddTicketProgress';
import { updateSequentialTestProgress, upsertModuleTopicProgress } from './completion/saveTopicProgress';
import { logGameSession } from './completion/logGameSession';
import { processRewards, type TestRewardResult, type ServerCompleteFn } from './completion/processRewards';
import type {
    TestQuestionData,
    TestInfo,
    UserAnswer,
    EnqueueOfflineActionFn,
    InitializeExamFn,
} from '@/types/test-session';
import { isRoundRetryMode } from '@/lib/test-modes';

interface UseTestCompletionParams {
    profileId?: string;
    mode: string;
    questions: TestQuestionData[];
    testInfo: TestInfo | null;
    startTime: number;
    timeLeft: number;
    initialTimeBudget: number;
    testId: string | undefined;
    ticketIdParam: string | undefined;
    pddCountry: string;
    topic: string | undefined;
    isPremium: boolean;
    enqueueOfflineAction: EnqueueOfflineActionFn;
    getOrCreateSessionId: () => string;

    // Mastery Mode
    masteryWrongQuestions: string[];
    masteryRound: number;
    setQuestions: (q: TestQuestionData[]) => void;
    setMasteryWrongQuestions: (q: string[]) => void;
    setMasteryRound: (r: number) => void;
    setCurrentIndex: (i: number) => void;
    initializeExam: InitializeExamFn;
    setShowTranslation: (v: boolean) => void;
    closeAIChat: () => void;
    russiaExamQuestions: TestQuestionData[];
    /** @deprecated не используется в orchestrator, оставлено для back-compat */
    isRussia?: boolean;
    answers?: UserAnswer[];
    setAnswers: (a: UserAnswer[]) => void;

    // Server-validated session
    serverSessionId?: string | null;
    serverComplete?: ServerCompleteFn;
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
    answers = [],
    setAnswers,
    serverSessionId,
    serverComplete,
}: UseTestCompletionParams) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const finishTest = async () => {
        // === 1. ИЗВЛЕКАЕМ СВЕЖИЕ ОТВЕТЫ ИЗ ZUSTAND ===
        const latestState = useExamStore.getState().activeState;

        const currentAnswers = latestState
            ? (latestState.kind === 'russia'
                ? [...Object.values(latestState.data.mainAnswers), ...Object.values(latestState.data.extraAnswers)].map((a: any) => ({
                    questionId: a.questionId,
                    selectedAnswerId: a.selectedAnswerId || '',
                    isCorrect: a.isCorrect,
                }))
                : Object.entries(latestState.data.answers).map(([qid, ans]: [string, any]) => ({
                    questionId: qid,
                    selectedAnswerId: ans.selectedOptionId,
                    isCorrect: ans.isCorrect,
                })))
            : answers;

        const currentQuestions = latestState
            ? (latestState.kind === 'russia' ? russiaExamQuestions : latestState.data.questions)
            : questions;

        // Очищаем локальное сохранение прогресса
        if (testInfo?.id) {
            clearTestProgress(testInfo.id).catch((err) => {
                console.error('[TestSession] Error clearing saved progress:', err);
            });
        }

        // === 2. MASTERY / MARATHON ROUND RETRY ===
        if (isRoundRetryMode(mode) && masteryWrongQuestions.length > 0) {
            const wrongQuestionsData = currentQuestions.filter((q: TestQuestionData) => masteryWrongQuestions.includes(q.id));

            if (wrongQuestionsData.length > 0) {
                const nextRound = masteryRound + 1;
                toast.info(
                    `🎉 Раунд ${masteryRound} пройден! Переходим к Раунду ${nextRound} (${wrongQuestionsData.length} вопросов)`,
                    { duration: 4500 }
                );

                setAnswers([]);
                setQuestions(wrongQuestionsData);
                setMasteryWrongQuestions([]);
                setMasteryRound(nextRound);
                setCurrentIndex(0);
                initializeExam(mode, wrongQuestionsData, { timeLimit: initialTimeBudget });
                setShowTranslation(false);
                if (closeAIChat) closeAIChat();
                return;
            }
        }

        if (mode === 'mastery') {
            toast.success(`🎉 ИДЕАЛЬНО! Все вопросы правильно за ${masteryRound} раундов!`, { duration: 5000 });
        } else if (mode === 'marathon') {
            toast.success(`🏆 Марафон пройден за ${masteryRound} раундов без единой ошибки!`, { duration: 6000 });
        }

        // === 3. БАЗОВЫЕ МЕТРИКИ ===
        const correctCount = currentAnswers.filter((a: any) => a.isCorrect).length;
        const score = Math.round((correctCount / Math.max(1, currentQuestions.length)) * 100);

        const timeSpent = startTime > 0
            ? Math.floor((Date.now() - startTime) / 1000)
            : initialTimeBudget > 0
                ? initialTimeBudget - timeLeft
                : 0;

        const effectiveTestId = testId
            ? testId
            : (mode === 'pdd-ticket' && ticketIdParam ? `pdd-ticket-${ticketIdParam}` : null);

        if (currentQuestions.length > 0 && currentAnswers.length === 0) {
            console.error('[TestSession] ❌ CRITICAL: No answers recorded but questions exist!');
        }

        // === 4. СОХРАНЕНИЕ ПРОГРЕССА (параллельно, не блокирует rewards) ===
        const progressPromises: Promise<void>[] = [];

        if (profileId && effectiveTestId) {
            if (mode === 'pdd-ticket') {
                progressPromises.push(
                    savePddTicketProgress(
                        {
                            profileId,
                            effectiveTestId,
                            pddCountry,
                            // FIX: используем currentQuestions (после mastery round retry),
                            // не оригинальный questions из пропсов
                            questionsTotal: currentQuestions.length,
                            correctCount,
                            timeSpentSec: timeSpent,
                        },
                        queryClient
                    )
                );
            } else if (testId) {
                progressPromises.push(
                    updateSequentialTestProgress({
                        profileId,
                        effectiveTestId,
                        questionsTotal: currentQuestions.length,
                        correctCount,
                        timeSpentSec: timeSpent,
                    })
                );
            }
        }

        if (mode === 'module' && profileId && topic) {
            progressPromises.push(
                upsertModuleTopicProgress({ profileId, topicId: topic, score })
            );
        }

        progressPromises.push(
            logGameSession({
                mode,
                testId,
                questionsTotal: currentQuestions.length,
                correctCount,
                durationSec: timeSpent,
            })
        );

        // Promise.allSettled — не валит весь flow если один progress save упал
        await Promise.allSettled(progressPromises);

        // === 5. НАГРАДЫ: server-validated приоритет, legacy fallback ===
        let rewardResult: TestRewardResult | null = null;
        let finalScore = score;
        let finalCorrect = correctCount;
        let finalTimeSpent = timeSpent;
        let speedCheatDetected = false;

        if (profileId) {
            const rewardOutcome = await processRewards({
                profileId,
                mode,
                testId,
                questionsTotal: currentQuestions.length,
                correctCount,
                timeSpentSec: timeSpent,
                isPremium,
                answersLength: currentAnswers.length,
                serverSessionId,
                serverComplete,
                enqueueOfflineAction,
                getOrCreateSessionId,
            });

            rewardResult = rewardOutcome.rewardResult;
            if (rewardOutcome.overrideScore !== undefined) finalScore = rewardOutcome.overrideScore;
            if (rewardOutcome.overrideCorrect !== undefined) finalCorrect = rewardOutcome.overrideCorrect;
            if (rewardOutcome.overrideTimeSpent !== undefined) finalTimeSpent = rewardOutcome.overrideTimeSpent;
            speedCheatDetected = Boolean(rewardOutcome.speedCheatDetected);
        }

        // Persist rewards чтобы выжили reload страницы
        if (rewardResult) {
            try { sessionStorage.setItem('last_test_reward', JSON.stringify(rewardResult)); } catch { /* */ }
        }

        // === 6. NAVIGATE ===
        navigate('/test/results', {
            state: {
                score: finalScore,
                total: currentQuestions.length,
                correctCount: finalCorrect,
                wrongAnswers: currentAnswers.filter((a: any) => !a.isCorrect).map((a: any) => a.questionId),
                answers: currentAnswers,
                questions: currentQuestions,
                timeSpent: finalTimeSpent,
                mode,
                rewardResult,
                masteryRound,
                country: pddCountry,
                ...(speedCheatDetected ? { speedCheatDetected: true } : {}),
            },
        });
    };

    return { finishTest };
};
