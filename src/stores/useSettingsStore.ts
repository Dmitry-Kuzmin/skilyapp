import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Font size options
 */
export type FontSize = 'small' | 'normal' | 'large';

/**
 * Settings Store State
 */
interface SettingsState {
    // State
    fontSize: FontSize;
    isSoundEnabled: boolean;
    isMusicEnabled: boolean;
    isVoiceOverEnabled: boolean;
    isAnswerPopularityEnabled: boolean;
    selectedMusicTrack: string | null;

    // Actions
    setFontSize: (size: FontSize) => void;
    toggleSound: () => void;
    toggleMusic: () => void;
    toggleVoiceOver: () => void;
    toggleAnswerPopularity: () => void;
    setSound: (enabled: boolean) => void;
    setMusic: (enabled: boolean) => void;
    setVoiceOver: (enabled: boolean) => void;
    setAnswerPopularity: (enabled: boolean) => void;
    setSelectedMusicTrack: (trackName: string | null) => void;

    // Reset
    resetToDefaults: () => void;
}

/**
 * Default values
 */
const DEFAULT_SETTINGS = {
    fontSize: 'normal' as FontSize,
    isSoundEnabled: true,
    isMusicEnabled: false,
    isVoiceOverEnabled: false,
    isAnswerPopularityEnabled: false,
    selectedMusicTrack: null,
};

/**
 * Global Settings Store with persistence
 * 
 * Manages application-wide settings:
 * - Font size (small/normal/large)
 * - Sound effects toggle
 * - Background music toggle
 * - Voice-over (TTS) toggle
 * - Answer popularity display toggle
 * 
 * Persisted to localStorage under 'app-settings-storage'
 */
export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Initial state
            ...DEFAULT_SETTINGS,

            // Font size
            setFontSize: (size) => set({ fontSize: size }),

            // Sound
            toggleSound: () => set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
            setSound: (enabled) => set({ isSoundEnabled: enabled }),

            // Music
            toggleMusic: () => set((state) => ({ isMusicEnabled: !state.isMusicEnabled })),
            setMusic: (enabled) => set({ isMusicEnabled: enabled }),

            // Voice-over (TTS)
            toggleVoiceOver: () => set((state) => ({ isVoiceOverEnabled: !state.isVoiceOverEnabled })),
            setVoiceOver: (enabled) => set({ isVoiceOverEnabled: enabled }),

            // Answer popularity
            toggleAnswerPopularity: () => set((state) => ({
                isAnswerPopularityEnabled: !state.isAnswerPopularityEnabled
            })),
            setAnswerPopularity: (enabled) => set({ isAnswerPopularityEnabled: enabled }),

            // Music Track
            setSelectedMusicTrack: (trackName) => set({ selectedMusicTrack: trackName }),

            // Reset to defaults
            resetToDefaults: () => set(DEFAULT_SETTINGS),
        }),
        {
            name: 'app-settings-storage',
            storage: createJSONStorage(() => localStorage),
            // Only persist state, not actions
            partialize: (state) => ({
                fontSize: state.fontSize,
                isSoundEnabled: state.isSoundEnabled,
                isMusicEnabled: state.isMusicEnabled,
                isVoiceOverEnabled: state.isVoiceOverEnabled,
                isAnswerPopularityEnabled: state.isAnswerPopularityEnabled,
                selectedMusicTrack: state.selectedMusicTrack,
            }),
        }
    )
);

/**
 * Selectors for optimized re-renders
 */
export const selectFontSize = (state: SettingsState) => state.fontSize;
export const selectIsSoundEnabled = (state: SettingsState) => state.isSoundEnabled;
export const selectIsMusicEnabled = (state: SettingsState) => state.isMusicEnabled;
export const selectIsVoiceOverEnabled = (state: SettingsState) => state.isVoiceOverEnabled;
export const selectIsAnswerPopularityEnabled = (state: SettingsState) => state.isAnswerPopularityEnabled;
