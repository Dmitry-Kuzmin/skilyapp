import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkOnlineStatus } from "@/hooks/useOnlineStatus";
import { loadTestProgress } from "@/utils/testStorage";
import { SavedProgress } from "@/store/examStore";

interface TestLifecycleParams {
    // Initialization
    questions: any[];
    questionsState: any[];
    setQuestionsState: (q: any[]) => void;
    initializeExam: any;
    mode: string;
    allQuestionsByBlock: any;
    initialTimeBudget: number;
    // Redemption
    isRedemptionMode?: boolean;
    redemptionFailedQuestions?: any[];

    // Session Tracking
    profileId: string | undefined;
    testId: string | null;
    testSessionStartedRef: React.MutableRefObject<boolean>;
    getOrCreateSessionId: () => string;

    // Monitoring
    activeState: any;
    showFailureModal: boolean;
    setShowFailureModal: (s: boolean) => void;
    setFailureReason: (r: string) => void;
    navigate: any;
    answers: any[];
    testInfo: any;
    russiaExamStatus?: string;
    russiaExamStats?: any;
}

export const useTestLifecycle = ({
    questions,
    questionsState,
    setQuestionsState,
    initializeExam,
    mode,
    allQuestionsByBlock,
    initialTimeBudget,
    isRedemptionMode,
    redemptionFailedQuestions,
    profileId,
    testId,
    testSessionStartedRef,
    getOrCreateSessionId,
    activeState,
    showFailureModal,
    setShowFailureModal,
    setFailureReason,
    navigate,
    answers,
    testInfo,
    russiaExamStatus,
    russiaExamStats
}: TestLifecycleParams) => {
    // 1. Sync questionsState - только при первой загрузке или смене источника данных
    useEffect(() => {
        if (questions && questions.length > 0) {
            // Если в стейте еще пусто - инициализируем
            if (questionsState.length === 0) {
                setQuestionsState(questions);
                return;
            }

            // Если источник (memo в TestSession) реально изменился (сменился тест/билет)
            // Но мы НЕ должны перезаписывать, если мы внутри Марафона/Мастерства (там questionsState управляется вручную)
            const isManualMode = mode === 'mastery' || mode === 'marathon';
            if (!isManualMode) {
                const isSourceChanged = questions.length !== questionsState.length || (questions[0]?.id !== questionsState[0]?.id);
                if (isSourceChanged) {
                    setQuestionsState(questions);
                }
            }
        }
    }, [questions, setQuestionsState, mode, questionsState.length]);

    // 2. Initialize Exam Store (with optional saved progress restore)
    useEffect(() => {
        if (questionsState.length === 0) return;

        // Режимы с таймером/строгими правилами — прогресс не восстанавливаем
        const noRestoreModes = ['blitz', 'exam', 'exam-russia'];
        const canRestore = !noRestoreModes.includes(mode);

        const doInit = async () => {
            let savedProgress: SavedProgress | undefined;

            if (canRestore && testInfo?.id) {
                try {
                    const saved = await loadTestProgress(testInfo.id);
                    if (saved && saved.answers.length > 0) {
                        // Конвертируем массив TestAnswer → Record
                        const answersRecord: SavedProgress['answers'] = {};
                        saved.answers.forEach(a => {
                            answersRecord[a.questionId] = {
                                isCorrect: a.isCorrect,
                                selectedOptionId: a.selectedAnswerId,
                                answeredAt: a.timestamp || Date.now()
                            };
                        });
                        savedProgress = {
                            answers: answersRecord,
                            currentIndex: saved.currentIndex
                        };
                        toast.info('Прогресс восстановлен', { icon: '↩️', id: `restore-${testInfo.id}` });
                    }
                } catch (e) {
                    console.error('[TestLifecycle] Failed to load saved progress:', e);
                }
            }

            initializeExam(mode, questionsState, {
                allQuestionsByBlock,
                timeLimit: initialTimeBudget,
                savedProgress,
            });
        };

        doInit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionsState, mode, allQuestionsByBlock, initialTimeBudget]);

    // 3. Start Test Session (Edge Function)
    useEffect(() => {
        const startTestSession = async () => {
            if (!profileId || questionsState.length === 0 || testSessionStartedRef.current) {
                return;
            }

            const sessionId = getOrCreateSessionId();

            try {
                const realOnline = await checkOnlineStatus();
                if (!realOnline) {
                    testSessionStartedRef.current = true;
                    return;
                }

                const { error } = await supabase.functions.invoke('start-test-session', {
                    body: {
                        user_id: profileId,
                        session_id: sessionId,
                        test_id: testId || null,
                        questions_count: questionsState.length,
                        mode: mode || null,
                    },
                });

                if (error) {
                    console.error('[TestSession] Error starting test session:', error);
                    toast.warning("Не удалось зарегистрировать начало теста. Результаты могут быть не сохранены.");
                } else {
                    testSessionStartedRef.current = true;
                }
            } catch (error) {
                console.error('[TestSession] Unexpected error starting test session:', error);
            }
        };

        startTestSession();
    }, [profileId, questionsState.length, mode, testId, getOrCreateSessionId, testSessionStartedRef]);

    // 4. completion/failure monitor
    useEffect(() => {
        if (!activeState) return;
        const { status } = activeState.data;

        if (status === 'failed' || status === 'failed-extra') {
            if (!showFailureModal) {
                const reason = activeState.kind === 'russia'
                    ? (activeState.data as { failureReason?: string }).failureReason
                    : "Время вышло";
                setFailureReason(reason || "Тест завершен");
                setShowFailureModal(true);
            }
        }

        if (status === 'completed') {
            if (activeState.kind === 'standard') {
                // В режимах Мастерство/Марафон навигация управляется вручную в useTestCompletion
                // так как там может потребоваться запуск следующего раунда.
                if (mode === 'mastery' || mode === 'marathon') return;

                navigate('/test/results', {
                    state: {
                        questions,
                        answers,
                        mode,
                        testInfo,
                        timeSpent: activeState.data.timeLimit ? (activeState.data.timeLimit - activeState.data.timeInfo) : activeState.data.timeInfo,
                    }
                });
            }
        }
    }, [activeState, showFailureModal, navigate, answers, mode, testInfo, questions, setFailureReason, setShowFailureModal]);

    // 5. Russia Exam Success
    useEffect(() => {
        if (mode === 'exam-russia' && russiaExamStatus === 'passed') {
            const timer = setTimeout(() => {
                navigate('/test/results', {
                    state: {
                        questions,
                        answers,
                        mode,
                        testInfo,
                        timeSpent: russiaExamStats?.timeSpent ?? 0,
                        russiaExamStats: russiaExamStats,
                    },
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [mode, russiaExamStatus, russiaExamStats, questions, answers, testInfo, navigate]);
};
