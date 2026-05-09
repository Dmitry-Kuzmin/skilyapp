import { create } from 'zustand';

export const useTTSStore = create<{ isSpeaking: boolean; setSpeaking: (v: boolean) => void }>()(
    (set) => ({ isSpeaking: false, setSpeaking: (isSpeaking) => set({ isSpeaking }) })
);
