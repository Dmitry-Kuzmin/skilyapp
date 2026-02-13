import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Unified Settings Store
 * 
 * Централизованное хранилище всех настроек приложения.
 * Использует zustand/persist для сохранения между сессиями.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageCode = 'ru' | 'en' | 'es';

export interface SettingsState {
    // === Modal State ===
    isOpen: boolean;
    activeTab: 'account' | 'general' | 'cockpit' | 'notifications' | 'subscription' | 'data' | 'about';

    // === General Settings ===
    language: LanguageCode;
    theme: ThemeMode;
    performanceMode: boolean; // Экономный режим (отключает анимации)

    // === Cockpit Settings ===
    soundEnabled: boolean;
    soundVolume: number; // 0-100
    hapticEnabled: boolean;
    adasHints: boolean; // Авто-подсказки AI
    smartVocabularyEnabled: boolean; // Умные словарные подсказки в тестах
    duelNotifications: boolean;

    // === User Info (cached) ===
    userLevel: number;
    userTitle: string;
}

export interface SettingsActions {
    // Modal controls
    openSettings: (tab?: 'account' | 'general' | 'cockpit' | 'notifications' | 'subscription' | 'data' | 'about') => void;
    closeSettings: () => void;
    setActiveTab: (tab: 'account' | 'general' | 'cockpit' | 'notifications' | 'subscription' | 'data' | 'about') => void;

    // General settings
    setLanguage: (lang: LanguageCode) => void;
    setTheme: (theme: ThemeMode) => void;
    togglePerformanceMode: () => void;

    // Cockpit settings
    toggleSound: () => void;
    setSoundVolume: (volume: number) => void;
    toggleHaptic: () => void;
    toggleAdasHints: () => void;
    toggleSmartVocabulary: () => void;
    toggleDuelNotifications: () => void;

    // User info
    setUserInfo: (level: number, title: string) => void;

    // Bulk update
    updateSettings: (settings: Partial<SettingsState>) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
    // Modal
    isOpen: false,
    activeTab: 'general',

    // General
    language: 'ru',
    theme: 'dark',
    performanceMode: false,

    // Cockpit
    soundEnabled: true,
    soundVolume: 80,
    hapticEnabled: true,
    adasHints: true,
    smartVocabularyEnabled: true,
    duelNotifications: true,

    // User
    userLevel: 1,
    userTitle: 'Новичок',
};

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            // === Modal controls ===
            openSettings: (tab = 'general') => set({ isOpen: true, activeTab: tab }),
            closeSettings: () => set({ isOpen: false }),
            setActiveTab: (tab) => set({ activeTab: tab }),

            // === General settings ===
            setLanguage: (language) => set({ language }),
            setTheme: (theme) => set({ theme }),
            togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode })),

            // === Cockpit settings ===
            toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
            setSoundVolume: (soundVolume) => set({ soundVolume }),
            toggleHaptic: () => set((state) => ({ hapticEnabled: !state.hapticEnabled })),
            toggleAdasHints: () => set((state) => ({ adasHints: !state.adasHints })),
            toggleSmartVocabulary: () => set((state) => ({ smartVocabularyEnabled: !state.smartVocabularyEnabled })),
            toggleDuelNotifications: () => set((state) => ({ duelNotifications: !state.duelNotifications })),

            // === User info ===
            setUserInfo: (userLevel, userTitle) => set({ userLevel, userTitle }),

            // === Bulk update ===
            updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
        }),
        {
            name: 'sdadim-settings', // Key in localStorage
            partialize: (state) => ({
                // Сохраняем только настройки, не состояние модалки
                language: state.language,
                theme: state.theme,
                performanceMode: state.performanceMode,
                soundEnabled: state.soundEnabled,
                soundVolume: state.soundVolume,
                hapticEnabled: state.hapticEnabled,
                adasHints: state.adasHints,
                smartVocabularyEnabled: state.smartVocabularyEnabled,
                duelNotifications: state.duelNotifications,
            }),
        }
    )
);

// === Selectors for optimized re-renders ===
export const selectIsOpen = (state: SettingsStore) => state.isOpen;
export const selectActiveTab = (state: SettingsStore) => state.activeTab;
export const selectSoundEnabled = (state: SettingsStore) => state.soundEnabled;
export const selectHapticEnabled = (state: SettingsStore) => state.hapticEnabled;
export const selectPerformanceMode = (state: SettingsStore) => state.performanceMode;
