import type { StateCreator } from 'zustand';

export interface DuelUISlice {
    // Loading & processing
    isLoading: boolean;
    isProcessingAnswer: boolean;

    // Game flow UI
    isWaitingForOpponent: boolean;
    translationLanguage: 'ru' | 'en' | null;

    // Duel started flag (used by some hooks)
    duelStarted: boolean;

    // Actions
    setLoading: (loading: boolean) => void;
    setIsProcessingAnswer: (processing: boolean) => void;
    setWaitingForOpponent: (waiting: boolean) => void;
    /** Alias for setHasFinishedMyQuestions kept for backward compat */
    setFinishedMyQuestions: (finished: boolean) => void;
    setTranslationLanguage: (lang: 'ru' | 'en' | null) => void;
    setDuelStarted: (started: boolean) => void;
}

export const uiInitialState: Omit<DuelUISlice, 'setLoading' | 'setIsProcessingAnswer' | 'setWaitingForOpponent' | 'setFinishedMyQuestions' | 'setTranslationLanguage' | 'setDuelStarted'> = {
    isLoading: true,
    isProcessingAnswer: false,
    isWaitingForOpponent: false,
    translationLanguage: null,
    duelStarted: false,
};

export const createDuelUISlice: StateCreator<DuelUISlice, [], [], DuelUISlice> =
    (set) => ({
        ...uiInitialState,
        setLoading: (loading) => set({ isLoading: loading }),
        setIsProcessingAnswer: (processing) => set({ isProcessingAnswer: processing }),
        setWaitingForOpponent: (waiting) => set({ isWaitingForOpponent: waiting }),
        setFinishedMyQuestions: (finished) => set({ isWaitingForOpponent: !finished }),
        setTranslationLanguage: (lang) => set({ translationLanguage: lang }),
        setDuelStarted: (started) => set({ duelStarted: started }),
    });
