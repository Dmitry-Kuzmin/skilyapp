import type { StateCreator } from 'zustand';

export interface DuelNetworkSlice {
    // Opponent connection
    opponentActivityStatus: 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';
    opponentLastSeen: string | null;
    opponentIsConnected: boolean;

    // Reconnection
    isReconnecting: boolean;
    showReconnectionModal: boolean;
    reconnectAttempt: number;

    // Actions
    setOpponentActivityStatus: (status: DuelNetworkSlice['opponentActivityStatus']) => void;
    setReconnectionState: (state: Partial<{
        isReconnecting: boolean;
        showReconnectionModal: boolean;
        reconnectAttempt: number;
        opponentIsConnected: boolean;
        opponentLastSeen: string | null;
    }>) => void;
}

export const networkInitialState: Omit<DuelNetworkSlice, 'setOpponentActivityStatus' | 'setReconnectionState'> = {
    opponentActivityStatus: 'online',
    opponentLastSeen: null,
    opponentIsConnected: true,
    isReconnecting: false,
    showReconnectionModal: false,
    reconnectAttempt: 0,
};

export const createDuelNetworkSlice: StateCreator<DuelNetworkSlice, [], [], DuelNetworkSlice> =
    (set) => ({
        ...networkInitialState,
        setOpponentActivityStatus: (status) => set({ opponentActivityStatus: status }),
        setReconnectionState: (newState) => set((s) => ({ ...s, ...newState })),
    });
