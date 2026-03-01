import { create } from 'zustand';
import { UniversalQuestion } from '@/types/pdd';
import {
    RussiaExamState,
    AnswerResult,
    createRussiaExamState,
    ExtraQuestion,
    RussiaExamStats
} from '@/types/pddExam';
import { handleMainQuestionAnswer, handleExtraQuestionAnswer, applyAnswerToState, getExamStats } from '@/utils/russiaExamLogic';

// --- Types for Standard Modes (Blitz, Practice, etc) ---

export type TestMode =
    | 'practice' | 'exam' | 'blitz' | 'exam-russia' | 'marathon' | 'nonstop'
    | 'pdd-ticket' | 'pdd-topic' | 'by-topic' | 'traps' | 'mastery' | 'sequential';

interface StandardTestState {
    questions: UniversalQuestion[];
    currentIndex: number;
    answers: Record<string, { // questionId -> answer
        isCorrect: boolean;
        selectedOptionId: string;
        answeredAt: number;
    }>;

    // === PHASE 1: UI State (было в useState) ===
    selectedOption: string | null; // Текущий выбранный вариант (до подтверждения)
    isAnswerLocked: boolean;       // Заблокирован ли ввод (показываем фидбек)
    feedbackStatus: 'idle' | 'correct' | 'incorrect'; // Статус текущего ответа для подсветки

    // Blitz specific
    streak: number;
    bestStreak: number;

    // Timer & Stats
    startTime: number;
    endTime?: number;
    timeLimit?: number; // null = infinite
    timeInfo: number; // meaning depends on mode (elapsed or remaining)

    status: 'in-progress' | 'passed' | 'failed' | 'completed';
    mode: TestMode;
}

// Union State
type UnifiedState = {
    kind: 'russia';
    data: RussiaExamState;
} | {
    kind: 'standard';
    data: StandardTestState;
};

export interface StandardExamStats {
    correct: number;
    total: number;
    streak: number;
    timeSpent: number;
}

export interface ExamOptions {
    allQuestionsByBlock?: Record<number, UniversalQuestion[]>;
    timeLimit?: number;
}

interface ExamActions {
    // Initialization
    initializeExam: (mode: TestMode, questions: UniversalQuestion[], options?: ExamOptions) => void;
    resetExam: () => void;

    // === PHASE 1: UI Interactions ===
    selectOption: (optionId: string) => void; // Выбор варианта (без подтверждения)
    setIsAnswerLocked: (locked: boolean) => void; // Блокировка ответа после выбора

    // Interaction
    answerQuestion: (answerId: string, isCorrect: boolean) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    jumpToQuestion: (index: number) => void;
    modifyTime: (amount: number) => void; // For Blitz bonuses

    // Timer
    tickTimer: () => void;

    // Selectors/Helpers attached to store for convenience
    getCurrentQuestion: () => UniversalQuestion | null;
    getComputedProgress: () => { current: number; total: number; percent: number; label: string };
    getComputedStats: () => RussiaExamStats | StandardExamStats | null;
}

type ExamStore = {
    activeState: UnifiedState | null;
    // Shared UI state for russia mode (kind='russia' doesn't have these in data)
    russiaSelectedOption: string | null;
    russiaAnswerLocked: boolean;
} & ExamActions & {
    setRussiaSelectedOption: (id: string | null) => void;
    setRussiaAnswerLocked: (locked: boolean) => void;
};

export const useExamStore = create<ExamStore>((set, get) => ({
    activeState: null,
    russiaSelectedOption: null,
    russiaAnswerLocked: false,

    initializeExam: (mode, questions, options) => {
        const currentState = get().activeState;

        // Allow re-initialization even with same questions to support round-restarts (Marathon/Mastery)
        // Previous guard was: if (currentState && same questions) return;


        if (mode === 'exam-russia') {
            // Initialize Russia Logic
            const russiaState = createRussiaExamState(questions, options?.allQuestionsByBlock);
            set({
                activeState: { kind: 'russia', data: russiaState },
                russiaSelectedOption: null,
                russiaAnswerLocked: false,
            });
        } else {
            // Initialize Standard Logic
            const timeLimit = options?.timeLimit || (mode === 'blitz' ? 90 : (mode === 'exam' ? 1200 : undefined));

            const standardState: StandardTestState = {
                questions,
                currentIndex: 0,
                answers: {},
                // Phase 1: UI State
                selectedOption: null,
                isAnswerLocked: false,
                feedbackStatus: 'idle',
                // Blitz
                streak: 0,
                bestStreak: 0,
                startTime: Date.now(),
                timeLimit,
                timeInfo: timeLimit || 0, // starts at limit (countdown) or 0 (countup)
                status: 'in-progress',
                mode
            };

            set({
                activeState: { kind: 'standard', data: standardState }
            });
        }
    },

    resetExam: () => set({ activeState: null }),

    // === PHASE 1: UI Actions Implementation ===
    selectOption: (optionId) => {
        const { activeState } = get();
        if (!activeState) return;

        if (activeState.kind === 'russia') {
            // Russia mode: store in shared UI state, allow changing before confirm
            if (get().russiaAnswerLocked) return;
            set({ russiaSelectedOption: optionId });
            return;
        }

        // Нельзя менять выбор, если ответ уже дан
        if (activeState.data.isAnswerLocked) return;

        set({
            activeState: {
                kind: 'standard',
                data: { ...activeState.data, selectedOption: optionId }
            }
        });
    },

    setIsAnswerLocked: (locked: boolean) => {
        const { activeState } = get();
        if (!activeState) return;
        if (activeState.kind === 'russia') {
            set({ russiaAnswerLocked: locked });
        } else {
            set({
                activeState: {
                    kind: 'standard',
                    data: { ...activeState.data, isAnswerLocked: locked }
                }
            });
        }
    },

    setRussiaSelectedOption: (id) => set({ russiaSelectedOption: id }),
    setRussiaAnswerLocked: (locked) => set({ russiaAnswerLocked: locked }),

    answerQuestion: (answerId, isCorrect) => {
        console.log('📝 [ExamStore] answerQuestion called:', { answerId, isCorrect });

        const { activeState } = get();
        if (!activeState) {
            console.error('📝 [ExamStore] ❌ No activeState!');
            return;
        }

        console.log('📝 [ExamStore] activeState.kind:', activeState.kind);

        if (activeState.kind === 'russia') {
            // --- RUSSIA LOGIC ---
            const currentQ = get().getCurrentQuestion();
            if (!currentQ) return;

            // Calc logic
            let result: AnswerResult;
            if (activeState.data.isExtraMode) {
                result = handleExtraQuestionAnswer(activeState.data, activeState.data.currentExtraIndex, isCorrect);
            } else {
                result = handleMainQuestionAnswer(activeState.data, activeState.data.currentMainIndex, isCorrect);
            }

            // Apply
            const newState = applyAnswerToState(activeState.data, result, currentQ.id);
            set({ activeState: { kind: 'russia', data: newState } });

        } else {
            // --- STANDARD LOGIC ---
            const { data } = activeState;
            const currentQ = data.questions[data.currentIndex];

            console.log('📝 [ExamStore] Recording answer for question:', currentQ.id);

            // Record answer
            const newAnswers = { ...data.answers };
            newAnswers[currentQ.id] = {
                isCorrect,
                selectedOptionId: answerId,
                answeredAt: Date.now()
            };

            console.log('📝 [ExamStore] ✅ Answer recorded. Total answers now:', Object.keys(newAnswers).length);

            // Streak logic
            let newStreak = data.streak;
            let newBestStreak = data.bestStreak;
            if (isCorrect) {
                newStreak++;
                newBestStreak = Math.max(newStreak, newBestStreak);
            } else {
                newStreak = 0;
            }

            // Check completion / failure
            const newStatus = data.status;

            // Blitz Failure Condition (1 error = fail or time out)
            // BUT usually blitz allows errors but streak resets? Let's assume standard behavior:
            // If mode is 'exam' (DGT), specific failure rules apply (usually > 3 errors).
            // Let's keep it simple for now: status updates happen on explicit finish or timeout.

            set({
                activeState: {
                    kind: 'standard',
                    data: {
                        ...data,
                        answers: newAnswers,
                        streak: newStreak,
                        bestStreak: newBestStreak,
                        status: newStatus,
                        // === PHASE 1: Обновляем UI state ===
                        isAnswerLocked: true,  // Блокируем UI
                        feedbackStatus: isCorrect ? 'correct' : 'incorrect' // Фидбек
                    }
                }
            });
        }
    },

    nextQuestion: () => {
        const { activeState } = get();
        if (!activeState) return;

        if (activeState.kind === 'russia') {
            // Russia logic handles auto-advance in 'answerQuestion' implicitly via state update
            // But if we need manual advance (unlikely in this mode), we do nothing or specific logic
            // For now, Russia exam auto-advances.
        } else {
            // Standard logic
            const { data } = activeState;
            if (data.currentIndex < data.questions.length - 1) {
                set({
                    activeState: {
                        kind: 'standard',
                        data: {
                            ...data,
                            currentIndex: data.currentIndex + 1,
                            // === PHASE 1: Сбрасываем UI state при переходе ===
                            selectedOption: null,
                            isAnswerLocked: false,
                            feedbackStatus: 'idle'
                        }
                    }
                });
            } else {
                set({
                    activeState: {
                        kind: 'standard',
                        data: { ...data, status: 'completed', endTime: Date.now() }
                    }
                });
            }
        }
    },

    prevQuestion: () => {
        const { activeState } = get();
        if (!activeState) return;

        if (activeState.kind === 'standard') {
            if (activeState.data.currentIndex > 0) {
                set({
                    activeState: {
                        kind: 'standard',
                        data: { ...activeState.data, currentIndex: activeState.data.currentIndex - 1 }
                    }
                });
            }
        }
    },

    jumpToQuestion: (index) => {
        const { activeState } = get();
        if (!activeState) return;

        if (activeState.kind === 'standard') {
            if (index >= 0 && index < activeState.data.questions.length) {
                set({
                    activeState: {
                        kind: 'standard',
                        data: { ...activeState.data, currentIndex: index }
                    }
                });
            }
        }
    },

    modifyTime: (amount) => {
        const { activeState } = get();
        if (activeState?.kind === 'standard') {
            set({
                activeState: {
                    kind: 'standard',
                    data: { ...activeState.data, timeInfo: activeState.data.timeInfo + amount }
                }
            });
        }
    },

    tickTimer: () => {
        const { activeState } = get();
        if (!activeState || activeState.data.status !== 'in-progress') return;

        if (activeState.kind === 'russia') {
            // Downward timer
            if (activeState.data.timeRemaining <= 0) {
                set({ activeState: { kind: 'russia', data: { ...activeState.data, status: 'failed', failureReason: 'Время вышло' } } });
            } else {
                set({ activeState: { kind: 'russia', data: { ...activeState.data, timeRemaining: activeState.data.timeRemaining - 1 } } });
            }
        } else {
            // Standard timer
            const { data } = activeState;
            if (data.timeLimit) {
                // Countdown (Blitz, Exam)
                if (data.timeInfo <= 0) {
                    set({ activeState: { kind: 'standard', data: { ...data, status: 'failed', timeInfo: 0, endTime: Date.now() } } });
                } else {
                    set({ activeState: { kind: 'standard', data: { ...data, timeInfo: data.timeInfo - 1 } } });
                }
            } else {
                // Countup (Practice)
                set({ activeState: { kind: 'standard', data: { ...data, timeInfo: data.timeInfo + 1 } } });
            }
        }
    },

    getCurrentQuestion: () => {
        const { activeState } = get();
        if (!activeState) return null;

        if (activeState.kind === 'russia') {
            if (activeState.data.isExtraMode) {
                return activeState.data.extraQuestions[activeState.data.currentExtraIndex]?.question || null;
            }
            return activeState.data.mainQuestions[activeState.data.currentMainIndex] || null;
        } else {
            return activeState.data.questions[activeState.data.currentIndex] || null;
        }
    },

    getComputedProgress: () => {
        const { activeState } = get();
        if (!activeState) return { current: 0, total: 0, percent: 0, label: '' };

        if (activeState.kind === 'russia') {
            const total = activeState.data.isExtraMode ? activeState.data.extraQuestions.length : activeState.data.mainQuestions.length;
            const current = activeState.data.isExtraMode ? activeState.data.currentExtraIndex + 1 : activeState.data.currentMainIndex + 1;
            return {
                current,
                total,
                percent: (current / total) * 100,
                label: activeState.data.isExtraMode ? 'Доп. вопросы' : 'Вопросы'
            };
        } else {
            const current = activeState.data.currentIndex + 1;
            const total = activeState.data.questions.length;
            return {
                current,
                total,
                percent: total > 0 ? (current / total) * 100 : 0,
                label: 'Вопрос' // TODO: localize
            };
        }
    },

    getComputedStats: () => {
        const { activeState } = get();
        if (!activeState) return null;
        if (activeState.kind === 'russia') return getExamStats(activeState.data);

        // Standard stats
        const correctCount = Object.values(activeState.data.answers).filter(a => a.isCorrect).length;
        return {
            correct: correctCount,
            total: Object.keys(activeState.data.answers).length,
            streak: activeState.data.streak,
            timeSpent: activeState.data.timeLimit ? (activeState.data.timeLimit - activeState.data.timeInfo) : activeState.data.timeInfo
        };
    }
}));

// Selectors
export const selectActiveState = (store: ExamStore) => store.activeState;
export const selectCurrentQuestion = (store: ExamStore) => {
    if (!store.activeState) return null;
    if (store.activeState.kind === 'russia') {
        const d = store.activeState.data;
        return d.isExtraMode ? d.extraQuestions[d.currentExtraIndex]?.question : d.mainQuestions[d.currentMainIndex];
    }
    return store.activeState.data.questions[store.activeState.data.currentIndex];
};
export const selectCurrentIndex = (store: ExamStore) => {
    if (!store.activeState) return 0;
    if (store.activeState.kind === 'russia') {
        return store.activeState.data.isExtraMode ? store.activeState.data.currentExtraIndex : store.activeState.data.currentMainIndex;
    }
    return store.activeState.data.currentIndex;
};
export const selectTimerValue = (store: ExamStore) => {
    if (!store.activeState) return 0;
    if (store.activeState.kind === 'russia') return store.activeState.data.timeRemaining;
    return store.activeState.data.timeInfo;
};
export const selectIsCorrectAnswer = (store: ExamStore, questionId: string) => {
    if (!store.activeState) return undefined;
    if (store.activeState.kind === 'russia') {
        // Check main and extra
        // Simplified search
        return Object.values(store.activeState.data.mainAnswers).find(a => a.questionId === questionId)?.isCorrect;
    }
    return store.activeState.data.answers[questionId]?.isCorrect;
};

// === PHASE 1: UI State Selectors ===
export const selectSelectedOption = (store: ExamStore) => {
    if (!store.activeState) return null;
    if (store.activeState.kind === 'russia') return store.russiaSelectedOption;
    return store.activeState.data.selectedOption;
};

export const selectIsAnswerLocked = (store: ExamStore) => {
    if (!store.activeState) return false;
    if (store.activeState.kind === 'russia') return store.russiaAnswerLocked;
    return store.activeState.data.isAnswerLocked;
};

export const selectFeedbackStatus = (store: ExamStore) => {
    if (!store.activeState || store.activeState.kind !== 'standard') return 'idle';
    return store.activeState.data.feedbackStatus;
};

export const selectStreak = (store: ExamStore) => {
    if (!store.activeState || store.activeState.kind !== 'standard') return 0;
    return store.activeState.data.streak;
};
