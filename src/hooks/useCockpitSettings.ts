import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { setAudioMuted } from '@/services/audioService';

const STORAGE_KEY = 'cockpit_settings_v1';

export type CockpitAnimationMode = 'full' | 'reduced' | 'off';
export type CockpitSoundProfile = 'comfort' | 'sport' | 'stealth';
export type CockpitThemeMode = 'light' | 'dark' | 'auto';

export interface CockpitSettings {
  language: 'ru' | 'es' | 'en';
  theme: CockpitThemeMode;
  masterSound: boolean;
  soundProfile: CockpitSoundProfile;
  animationMode: CockpitAnimationMode;
  hudBrightness: number; // 0 - 1
  adasHints: boolean;
  duelAlerts: boolean;
  hapticFeedback: boolean;
}

const DEFAULT_SETTINGS: CockpitSettings = {
  language: 'ru',
  theme: 'dark',
  masterSound: true,
  soundProfile: 'comfort',
  animationMode: 'full',
  hudBrightness: 0.8,
  adasHints: true,
  duelAlerts: true,
  hapticFeedback: true,
};

const isClient = typeof window !== 'undefined';

const readStoredSettings = (): Partial<CockpitSettings> => {
  if (!isClient) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<CockpitSettings>;
  } catch (error) {
    console.error('[CockpitSettings] Failed to read storage', error);
    return {};
  }
};

const persistSettings = (settings: CockpitSettings) => {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[CockpitSettings] Failed to persist settings', error);
  }
};

export const useCockpitSettings = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [settings, setSettings] = useState<CockpitSettings>(() => {
    const stored = readStoredSettings();
    const normalizedTheme =
      stored.theme ??
      (theme === 'system' ? 'auto' : ((theme as CockpitThemeMode | undefined) ?? DEFAULT_SETTINGS.theme));
    const normalizedLanguage = stored.language ?? (language ?? DEFAULT_SETTINGS.language);
    const merged = {
      ...DEFAULT_SETTINGS,
      ...stored,
      theme: normalizedTheme,
      language: normalizedLanguage,
    };
    setAudioMuted(!merged.masterSound);
    return merged;
  });

  // Synchronize with external theme changes (e.g. quick panel)
  useEffect(() => {
    const resolved: CockpitThemeMode =
      theme === 'system' ? 'auto' : ((theme as CockpitThemeMode | undefined) ?? settings.theme);
    setSettings((prev) => (prev.theme === resolved ? prev : { ...prev, theme: resolved }));
  }, [theme]);

  // Synchronize with language changes (from other areas)
  useEffect(() => {
    if (!language) return;
    setSettings((prev) => (prev.language === language ? prev : { ...prev, language }));
  }, [language]);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof CockpitSettings>(key: K, value: CockpitSettings[K]) => {
      setSettings((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };

        if (key === 'theme') {
          const mapped = value === 'auto' ? 'system' : value;
          setTheme(mapped);
        }

        if (key === 'language') {
          setLanguage(value as CockpitSettings['language']);
        }

        if (key === 'masterSound') {
          setAudioMuted(!(value as boolean));
        }

        return next;
      });
    },
    [setLanguage, setTheme],
  );

  const controls = useMemo(
    () => ({
      languages: [
        { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
        { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
        { code: 'en' as const, label: 'English', flag: '🇬🇧' },
      ],
      themes: [
        { value: 'light' as CockpitThemeMode, label: 'Daylight', icon: '☀️' },
        { value: 'dark' as CockpitThemeMode, label: 'Night', icon: '🌙' },
        { value: 'auto' as CockpitThemeMode, label: 'Auto', icon: '⚙️' },
      ],
      soundProfiles: [
        { value: 'comfort' as CockpitSoundProfile, label: 'Comfort' },
        { value: 'sport' as CockpitSoundProfile, label: 'Sport' },
        { value: 'stealth' as CockpitSoundProfile, label: 'Stealth' },
      ],
      animationModes: [
        { value: 'full' as CockpitAnimationMode, label: 'Full FX' },
        { value: 'reduced' as CockpitAnimationMode, label: 'Eco' },
        { value: 'off' as CockpitAnimationMode, label: 'Off' },
      ],
    }),
    [],
  );

  return {
    settings,
    controls,
    updateSetting,
  };
};

