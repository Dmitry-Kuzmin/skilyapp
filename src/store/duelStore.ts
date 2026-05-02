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

export interface ExploitState {
    id?: string;        // ID из duel_active_exploits (нужен для removeExploit)
    expiresAt: number;
    passed?: boolean;
    receivedAt?: number;
}

export interface ActiveExploit {
    type: string;
    expiresAt: number;
    receivedAt: number;
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
    opponentActivityStatus: 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';
    betInfo: {
        betAmount: number;
        totalBank: number;
        isHost: boolean;
        hostInsurance: boolean;
        opponentInsurance: boolean;
        coverageHost: number;
        coverageOpponent: number;
    } | null;


    // --- Gameplay State ---
    currentIndex: number;
    timeLeft: number;
    isAnswered: boolean;
    selectedAnswer: string | null;
    combo: number;
    usedBoosts: string[];
    eliminatedOptions: string[];
    activeExploits: Map<string, ExploitState>;

    // --- Visual Effects State ---
    screenShake: boolean;
    lastAttackTimestamp: number; // To trigger effects


    // --- Answer History ---
    answerHistory: Array<{ isCorrect: boolean }>;

    // --- Status Flags ---
    isLoading: boolean;
    isProcessingAnswer: boolean; // Shows loading animation after answer selection
    isWaitingForOpponent: boolean;
    hasFinishedMyQuestions: boolean;
    translationLanguage: 'ru' | 'en' | null;

    // --- Reconnection State ---
    isReconnecting: boolean;
    showReconnectionModal: boolean;
    reconnectAttempt: number;
    opponentIsConnected: boolean;
    opponentLastSeen: string | null; // ISO string


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
    setOpponentActivityStatus: (status: 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline') => void;
    setBetInfo: (info: DuelState['betInfo']) => void;


    setCurrentIndex: (index: number) => void;
    nextQuestion: () => void;
    setTimeLeft: (time: number) => void;
    decrementTime: (amount?: number) => void;

    setAnswer: (answerId: string) => void;
    resetAnswerState: () => void;

    setCombo: (combo: number) => void;
    addUsedBoost: (boostId: string) => void;
    setEliminatedOptions: (options: string[]) => void;
    setIsAnswered: (isAnswered: boolean) => void;
    setSelectedAnswer: (answer: string | null) => void;
    setUsedBoosts: (boosts: string[]) => void;
    setHasFinishedMyQuestions: (finished: boolean) => void;

    setLoading: (loading: boolean) => void;
    setIsProcessingAnswer: (processing: boolean) => void;
    setWaitingForOpponent: (waiting: boolean) => void;
    setFinishedMyQuestions: (finished: boolean) => void;
    setTranslationLanguage: (lang: 'ru' | 'en' | null) => void;

    // --- New Actions ---
    syncActiveExploits: (incomingExploits: ActiveExploit[]) => void;
    cleanupExpiredExploits: () => void;
    setScreenShake: (shake: boolean) => void;

    setReconnectionState: (state: Partial<{
        isReconnecting: boolean;
        showReconnectionModal: boolean;
        reconnectAttempt: number;
        opponentIsConnected: boolean;
        opponentLastSeen: string | null;
    }>) => void;

    setExploitPassed: (type: string) => void;

    addAnswerToHistory: (isCorrect: boolean) => void;

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
    opponentActivityStatus: 'online' as const,
    betInfo: null,


    currentIndex: 0,
    timeLeft: 60, // Default turn time
    isAnswered: false,
    selectedAnswer: null,
    combo: 0,
    usedBoosts: [],
    eliminatedOptions: [],

    isLoading: true,
    isProcessingAnswer: false,
    isWaitingForOpponent: false,
    hasFinishedMyQuestions: false,
    translationLanguage: null,

    activeExploits: new Map(),
    screenShake: false,
    lastAttackTimestamp: 0,

    isReconnecting: false,
    showReconnectionModal: false,
    reconnectAttempt: 0,
    opponentIsConnected: true,
    opponentLastSeen: null,

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
            setOpponentActivityStatus: (status) => set({ opponentActivityStatus: status }),
            setBetInfo: (info) => set({ betInfo: info }),


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
            setIsProcessingAnswer: (processing) => set({ isProcessingAnswer: processing }),
            setWaitingForOpponent: (waiting) => set({ isWaitingForOpponent: waiting }),
            setFinishedMyQuestions: (finished) => set({ hasFinishedMyQuestions: finished }),
            setTranslationLanguage: (lang) => set({ translationLanguage: lang }),
            setIsAnswered: (isAnswered) => set({ isAnswered }),
            setSelectedAnswer: (answer) => set({ selectedAnswer: answer }),
            setUsedBoosts: (boosts) => set({ usedBoosts: boosts }),
            setHasFinishedMyQuestions: (finished) => set({ hasFinishedMyQuestions: finished }),

            // --- New Actions Implementation ---
            syncActiveExploits: (incomingExploits) => set((state) => {
                // ИСПРАВЛЕНИЕ: Если входящий массив пуст — НЕ очищаем стор.
                // Это устраняет race condition, когда realtimeState.activeExploits
                // временно становится пустым между polling-итерациями.
                // Очистка происходит только через cleanupExpiredExploits.
                if (!incomingExploits || incomingExploits.length === 0) {
                    return state;
                }

                // 🔴 CRITICAL DEBUG: Логируем КАЖДЫЙ вызов syncActiveExploits (console.error = видно в prod)
                console.error('[duelStore] 🔴 syncActiveExploits CALLED:', {
                    incomingCount: incomingExploits.length,
                    incomingTypes: incomingExploits.map((e: any) => e.type),
                    incomingIds: incomingExploits.map((e: any) => e.id),
                    currentMapSize: state.activeExploits.size,
                    currentMapKeys: Array.from(state.activeExploits.keys()),
                });

                const newMap = new Map<string, ExploitState>(state.activeExploits);
                let hasNewAttack = false;

                incomingExploits.forEach(exploit => {
                    const existing = state.activeExploits.get(exploit.type);
                    const isNew = !existing;

                    newMap.set(exploit.type, {
                        id: (exploit as any).id || existing?.id,   // Сохраняем ID для removeExploit
                        expiresAt: exploit.expiresAt,
                        receivedAt: exploit.receivedAt,
                        passed: existing?.passed || false,
                    });

                    if (isNew) {
                        const isAttack = ['screen_injector', 'data_leak', 'oil_spill', 'police_backdoor', 'input_lag', 'gps_spoofing', 'cryptolocker', 'ice_screen', 'sun_glare', 'rain_storm', 'bug_splat', 'fog_screen'].includes(exploit.type);
                        if (isAttack) hasNewAttack = true;
                    }
                });

                // 🔴 CRITICAL DEBUG: Логируем результат
                console.error('[duelStore] 🔴 syncActiveExploits RESULT:', {
                    newMapSize: newMap.size,
                    newMapKeys: Array.from(newMap.keys()),
                    newMapEntries: Array.from(newMap.entries()).map(([k, v]) => ({ type: k, id: v.id, expiresAt: v.expiresAt, passed: v.passed })),
                    hasNewAttack,
                });

                return {
                    activeExploits: newMap,
                    lastAttackTimestamp: hasNewAttack ? Date.now() : state.lastAttackTimestamp
                };
            }),

            cleanupExpiredExploits: () => set((state) => {
                const now = Date.now();
                let changed = false;
                const updated = new Map(state.activeExploits);

                state.activeExploits.forEach((value, key) => {
                    if (value.expiresAt <= now) {
                        updated.delete(key);
                        changed = true;
                    }
                });

                return changed ? { activeExploits: updated } : state;
            }),

            setScreenShake: (shake) => set({ screenShake: shake }),

            setExploitPassed: (type) => set((state) => {
                const updated = new Map(state.activeExploits);
                const current = updated.get(type);
                if (current) {
                    updated.set(type, { ...current, passed: true });
                }
                return { activeExploits: updated };
            }),

            setReconnectionState: (newState) => set((state) => ({ ...state, ...newState })),

            resetGame: () => set(initialState),
        }),
        { name: 'duel-store' }
    )
);
