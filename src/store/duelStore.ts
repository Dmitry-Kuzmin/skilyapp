import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createDuelGameSlice, gameInitialState, type DuelGameSlice } from './slices/duelGameSlice';
import { createDuelUISlice, uiInitialState, type DuelUISlice } from './slices/duelUISlice';
import { createDuelNetworkSlice, networkInitialState, type DuelNetworkSlice } from './slices/duelNetworkSlice';

// ─── Re-export shared types for backward compatibility ─────────────────────────
export type { DuelPlayer, ExploitState, ActiveExploit, AnswerResult } from './slices/duelGameSlice';

// ─── Combined store type ──────────────────────────────────────────────────────

type DuelStore = DuelGameSlice & DuelUISlice & DuelNetworkSlice & {
    resetGame: () => void;
};

// ─── Combined initial state (for resetGame) ───────────────────────────────────

const fullInitialState = {
    ...gameInitialState,
    ...uiInitialState,
    ...networkInitialState,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDuelStore = create<DuelStore>()(
    devtools(
        (...args) => {
            const [set] = args;
            return {
                ...createDuelGameSlice(...args),
                ...createDuelUISlice(...args),
                ...createDuelNetworkSlice(...args),

                // Cross-slice action: resets all slices to initial state
                resetGame: () => set(fullInitialState),
            };
        },
        { name: 'duel-store' }
    )
);
