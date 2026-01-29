import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Типы данных (в будущем можно вынести в types)
export interface DuelPlayer {
    userId: string;
    name: string;
    photoUrl: string | null;
    score: number;
    isBot: boolean;
}

export interface AnswerResult {
    isCorrect: boolean;
    correctOptionId: string; // ID правильного ответа (для подсветки)
    selectedOptionId: string;
    pointsReceived: number;
    newScore: number;
    combo: number;
}

interface DuelState {
    // --- Game Data ---
    duelId: string | null;
    profileId: string | null;
    questions: any[];

    // --- Player State ---
    myPlayerId: string | null;
    players: any[]; // Full players data
    myScore: number;
    opponentScore: number;
    myName: string;
    opponentName: string;
    myPhotoUrl: string | null;
    opponentPhotoUrl: string | null;

    // --- Gameplay State ---
    currentIndex: number;
    timeLeft: number;
    isAnswered: boolean;
    selectedAnswer: string | null;
    combo: number;
    usedBoosts: string[];
    eliminatedOptions: string[];

    // --- Status Flags ---
    isLoading: boolean;
    isWaitingForOpponent: boolean;
    hasFinishedMyQuestions: boolean;
    translationLanguage: 'ru' | 'en' | null;

    // --- Actions ---
    setDuelId: (id: string | null) => void;
    setProfileId: (id: string | null) => void;
    setQuestions: (questions: any[]) => void;
    updateQuestion: (index: number, updates: any) => void;

    setMyPlayerId: (id: string | null) => void;
    setPlayers: (players: any[]) => void;
    setMyScore: (score: number) => void;
    setOpponentScore: (score: number) => void;
    setPlayersData: (data: {
        myName: string;
        opponentName: string;
        myPhotoUrl: string | null;
        opponentPhotoUrl: string | null
    }) => void;

    setCurrentIndex: (index: number) => void;
    nextQuestion: () => void;
    setTimeLeft: (time: number) => void;
    decrementTime: (amount?: number) => void;

    setAnswer: (answerId: string) => void;
    resetAnswerState: () => void;

    setCombo: (combo: number) => void;
    addUsedBoost: (boostId: string) => void;
    setEliminatedOptions: (options: string[]) => void;

    setLoading: (loading: boolean) => void;
    setWaitingForOpponent: (waiting: boolean) => void;
    setFinishedMyQuestions: (finished: boolean) => void;
    setTranslationLanguage: (lang: 'ru' | 'en' | null) => void;

    // Reset logic
    resetGame: () => void;
}

const initialState = {
    duelId: null,
    profileId: null,
    questions: [],

    myPlayerId: null,
    players: [],
    myScore: 0,
    opponentScore: 0,
    myName: '',
    opponentName: '',
    myPhotoUrl: null,
    opponentPhotoUrl: null,

    currentIndex: 0,
    timeLeft: 60, // Default turn time
    isAnswered: false,
    selectedAnswer: null,
    combo: 0,
    usedBoosts: [],
    eliminatedOptions: [],

    isLoading: true,
    isWaitingForOpponent: false,
    hasFinishedMyQuestions: false,
    translationLanguage: null,
};

export const useDuelStore = create<DuelState>()(
    devtools(
        (set) => ({
            ...initialState,

            setDuelId: (id) => set({ duelId: id }),
            setProfileId: (id) => set({ profileId: id }),
            setQuestions: (questions) => set({ questions }),

            updateQuestion: (index, updates) => set((state) => {
                const newQuestions = [...state.questions];
                if (newQuestions[index]) {
                    newQuestions[index] = { ...newQuestions[index], ...updates };
                }
                return { questions: newQuestions };
            }),

            setMyPlayerId: (id) => set({ myPlayerId: id }),
            setPlayers: (players) => set({ players }),
            setMyScore: (score) => set({ myScore: score }),
            setOpponentScore: (score) => set({ opponentScore: score }),
            setPlayersData: (data) => set(data),

            setCurrentIndex: (index) => set({ currentIndex: index }),

            nextQuestion: () => set((state) => ({
                currentIndex: state.currentIndex + 1,
                // Reset answer state automatically when moving to next question
                isAnswered: false,
                selectedAnswer: null,
                timeLeft: 60, // Reset timer
                eliminatedOptions: [], // Clear eliminated options
                usedBoosts: [], // Clear used boosts for next question
            })),

            setTimeLeft: (time) => set({ timeLeft: time }),
            decrementTime: (amount = 100) => set((state) => ({
                timeLeft: Math.max(0, state.timeLeft - amount)
            })),

            setAnswer: (answerId) => set({
                selectedAnswer: answerId,
                isAnswered: true
            }),

            resetAnswerState: () => set({
                selectedAnswer: null,
                isAnswered: false,
                eliminatedOptions: []
            }),

            setCombo: (combo) => set({ combo }),
            addUsedBoost: (boostId) => set((state) => ({
                usedBoosts: [...state.usedBoosts, boostId]
            })),
            setEliminatedOptions: (options) => set({ eliminatedOptions: options }),

            setLoading: (loading) => set({ isLoading: loading }),
            setWaitingForOpponent: (waiting) => set({ isWaitingForOpponent: waiting }),
            setFinishedMyQuestions: (finished) => set({ hasFinishedMyQuestions: finished }),
            setTranslationLanguage: (lang) => set({ translationLanguage: lang }),

            resetGame: () => set(initialState),
        }),
        { name: 'duel-store' }
    )
);
