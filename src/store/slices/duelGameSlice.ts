import type { StateCreator } from 'zustand';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DuelPlayer {
    userId: string;
    name: string;
    photoUrl: string | null;
    score: number;
    isBot: boolean;
}

export interface ExploitState {
    id?: string;
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
    correctOptionId: string;
    selectedOptionId: string;
    pointsReceived: number;
    newScore: number;
    combo: number;
}

// ─── Slice type ───────────────────────────────────────────────────────────────

export interface DuelGameSlice {
    // Core game data
    duelId: string | null;
    profileId: string | null;
    questions: any[];

    // Players
    myPlayerId: string | null;
    players: any[];
    myScore: number;
    opponentScore: number;
    myName: string;
    opponentName: string;
    myPhotoUrl: string | null;
    opponentPhotoUrl: string | null;
    betInfo: {
        betAmount: number;
        totalBank: number;
        isHost: boolean;
        hostInsurance: boolean;
        opponentInsurance: boolean;
        coverageHost: number;
        coverageOpponent: number;
    } | null;

    // Turn state
    currentIndex: number;
    timeLeft: number;
    isAnswered: boolean;
    selectedAnswer: string | null;
    combo: number;
    usedBoosts: string[];
    eliminatedOptions: string[];
    hasFinishedMyQuestions: boolean;

    // Exploits & effects
    activeExploits: Map<string, ExploitState>;
    screenShake: boolean;
    lastAttackTimestamp: number;

    // History
    answerHistory: Array<{ isCorrect: boolean }>;

    // Actions
    setDuelId: (id: string | null) => void;
    setProfileId: (id: string | null) => void;
    setQuestions: (questions: any[]) => void;
    updateQuestion: (index: number, updates: any) => void;
    setMyPlayerId: (id: string | null) => void;
    setPlayers: (players: any[]) => void;
    setMyScore: (score: number) => void;
    setOpponentScore: (score: number) => void;
    setPlayersData: (data: { myName: string; opponentName: string; myPhotoUrl: string | null; opponentPhotoUrl: string | null }) => void;
    setBetInfo: (info: DuelGameSlice['betInfo']) => void;
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
    syncActiveExploits: (incomingExploits: ActiveExploit[]) => void;
    cleanupExpiredExploits: () => void;
    setScreenShake: (shake: boolean) => void;
    setExploitPassed: (type: string) => void;
    addAnswerToHistory: (isCorrect: boolean) => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

export const gameInitialState: Omit<DuelGameSlice, keyof ReturnType<typeof createDuelGameActions>> = {
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
    betInfo: null,
    currentIndex: 0,
    timeLeft: 60,
    isAnswered: false,
    selectedAnswer: null,
    combo: 0,
    usedBoosts: [],
    eliminatedOptions: [],
    hasFinishedMyQuestions: false,
    activeExploits: new Map(),
    screenShake: false,
    lastAttackTimestamp: 0,
    answerHistory: [],
};

// Inline to avoid TS circular ref issue with Omit above
const ATTACK_TYPES = [
    'screen_injector', 'data_leak', 'oil_spill', 'police_backdoor', 'input_lag',
    'gps_spoofing', 'cryptolocker', 'ice_screen', 'sun_glare', 'rain_storm', 'bug_splat', 'fog_screen',
];

function createDuelGameActions(set: any) {
    return {
        setDuelId: (id: string | null) => set({ duelId: id }),
        setProfileId: (id: string | null) => set({ profileId: id }),
        setQuestions: (questions: any[]) => set({ questions }),
        updateQuestion: (index: number, updates: any) => set((s: DuelGameSlice) => {
            const q = [...s.questions];
            if (q[index]) q[index] = { ...q[index], ...updates };
            return { questions: q };
        }),
        setMyPlayerId: (id: string | null) => set({ myPlayerId: id }),
        setPlayers: (players: any[]) => set({ players }),
        setMyScore: (score: number) => set({ myScore: score }),
        setOpponentScore: (score: number) => set({ opponentScore: score }),
        setPlayersData: (data: any) => set(data),
        setBetInfo: (info: any) => set({ betInfo: info }),
        setCurrentIndex: (index: number) => set({ currentIndex: index }),
        nextQuestion: () => set((s: DuelGameSlice) => ({
            currentIndex: s.currentIndex + 1,
            isAnswered: false,
            selectedAnswer: null,
            timeLeft: 60,
            eliminatedOptions: [],
            usedBoosts: [],
        })),
        setTimeLeft: (time: number) => set({ timeLeft: time }),
        decrementTime: (amount = 100) => set((s: DuelGameSlice) => ({ timeLeft: Math.max(0, s.timeLeft - amount) })),
        setAnswer: (answerId: string) => set({ selectedAnswer: answerId, isAnswered: true }),
        resetAnswerState: () => set({ selectedAnswer: null, isAnswered: false, eliminatedOptions: [] }),
        setCombo: (combo: number) => set({ combo }),
        addUsedBoost: (boostId: string) => set((s: DuelGameSlice) => ({ usedBoosts: [...s.usedBoosts, boostId] })),
        setEliminatedOptions: (options: string[]) => set({ eliminatedOptions: options }),
        setIsAnswered: (isAnswered: boolean) => set({ isAnswered }),
        setSelectedAnswer: (answer: string | null) => set({ selectedAnswer: answer }),
        setUsedBoosts: (boosts: string[]) => set({ usedBoosts: boosts }),
        setHasFinishedMyQuestions: (finished: boolean) => set({ hasFinishedMyQuestions: finished }),
        syncActiveExploits: (incomingExploits: ActiveExploit[]) => set((s: DuelGameSlice) => {
            if (!incomingExploits || incomingExploits.length === 0) return s;
            const newMap = new Map<string, ExploitState>(s.activeExploits);
            let hasNewAttack = false;
            incomingExploits.forEach(exploit => {
                const existing = s.activeExploits.get(exploit.type);
                newMap.set(exploit.type, {
                    id: (exploit as any).id || existing?.id,
                    expiresAt: exploit.expiresAt,
                    receivedAt: exploit.receivedAt,
                    passed: existing?.passed || false,
                });
                if (!existing && ATTACK_TYPES.includes(exploit.type)) hasNewAttack = true;
            });
            return { activeExploits: newMap, lastAttackTimestamp: hasNewAttack ? Date.now() : s.lastAttackTimestamp };
        }),
        cleanupExpiredExploits: () => set((s: DuelGameSlice) => {
            const now = Date.now();
            let changed = false;
            const updated = new Map(s.activeExploits);
            s.activeExploits.forEach((_, key) => { if (s.activeExploits.get(key)!.expiresAt <= now) { updated.delete(key); changed = true; } });
            return changed ? { activeExploits: updated } : s;
        }),
        setScreenShake: (shake: boolean) => set({ screenShake: shake }),
        setExploitPassed: (type: string) => set((s: DuelGameSlice) => {
            const updated = new Map(s.activeExploits);
            const current = updated.get(type);
            if (current) updated.set(type, { ...current, passed: true });
            return { activeExploits: updated };
        }),
        addAnswerToHistory: (isCorrect: boolean) => set((s: DuelGameSlice) => ({
            answerHistory: [...s.answerHistory, { isCorrect }],
        })),
    };
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createDuelGameSlice: StateCreator<DuelGameSlice, [], [], DuelGameSlice> =
    (set) => ({
        ...gameInitialState,
        ...createDuelGameActions(set),
    });
