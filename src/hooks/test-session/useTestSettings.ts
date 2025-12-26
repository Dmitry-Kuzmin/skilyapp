import { useCallback } from 'react';
import { useSettingsStore, type FontSize } from '@/stores/useSettingsStore';

/**
 * Backward-compatible interface for TestSession
 */
export interface TestSettings {
    voiceOver: boolean;
    setVoiceOver: (value: boolean) => void;
    answerPopularity: boolean;
    setAnswerPopularity: (value: boolean) => void;
    ambientMusic: boolean;
    setAmbientMusic: (value: boolean) => void;
    selectedMusicTrack: string | null;
    setSelectedMusicTrack: (value: string | null) => void;
    fontSize: number; // 0=small, 1=medium, 2=large (legacy interface)
    setFontSize: (value: number) => void;
}

/**
 * Maps numeric fontSize (0/1/2) to FontSize type ('small'/'normal'/'large')
 */
const numericToFontSize = (num: number): FontSize => {
    switch (num) {
        case 0: return 'small';
        case 2: return 'large';
        default: return 'normal';
    }
};

/**
 * Maps FontSize type to numeric (for backward compatibility)
 */
const fontSizeToNumeric = (size: FontSize): number => {
    switch (size) {
        case 'small': return 0;
        case 'large': return 2;
        default: return 1;
    }
};

/**
 * Test Settings Hook - Bridge to Zustand Store
 * 
 * Provides backward-compatible interface for TestSession
 * while using global Zustand store for state management.
 * 
 * Benefits:
 * - Settings persist across app (not just per-component)
 * - Single source of truth
 * - No duplicate localStorage logic
 * - Synchronized across duel and regular modes
 */
export const useTestSettings = (): TestSettings => {
    const {
        isVoiceOverEnabled,
        setVoiceOver,
        isAnswerPopularityEnabled,
        setAnswerPopularity,
        isMusicEnabled,
        setMusic,
        selectedMusicTrack,
        setSelectedMusicTrack,
        fontSize: fontSizeStr,
        setFontSize: setFontSizeStr,
    } = useSettingsStore();

    // Convert FontSize string to numeric for backward compatibility
    const fontSize = fontSizeToNumeric(fontSizeStr);

    // Wrapper to convert numeric input to FontSize string
    const setFontSize = useCallback((value: number) => {
        setFontSizeStr(numericToFontSize(value));
    }, [setFontSizeStr]);

    return {
        voiceOver: isVoiceOverEnabled,
        setVoiceOver,
        answerPopularity: isAnswerPopularityEnabled,
        setAnswerPopularity,
        ambientMusic: isMusicEnabled,
        setAmbientMusic: setMusic,
        selectedMusicTrack,
        setSelectedMusicTrack,
        fontSize,
        setFontSize,
    };
};
