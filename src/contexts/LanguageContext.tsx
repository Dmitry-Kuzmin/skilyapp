import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { UserContext } from "./UserContext";
import { helpCenterTranslations } from "@/translations/helpCenter";
import { es } from "@/translations/locales/es";
import { en } from "@/translations/locales/en";
import { ru } from "@/translations/locales/ru";

export type Language = 'es' | 'en' | 'ru';

const SUPPORTED_LANGUAGES: Language[] = ['es', 'en', 'ru'];
const DEFAULT_LANGUAGE: Language = 'en';

const isBrowser = typeof window !== 'undefined';

const normalizeLanguage = (lang?: string | null): Language | null => {
  if (!lang) return null;
  const short = lang.split('-')[0]?.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(short as Language) ? (short as Language) : null;
};

const getStoredLanguage = (): Language | null => {
  if (!isBrowser) return null;

  // 1. Try sdadim-settings first (unified settings store)
  const settingsJson = localStorage.getItem('sdadim-settings');
  if (settingsJson) {
    try {
      const parsed = JSON.parse(settingsJson);
      const lang = parsed?.state?.language;
      if (lang && SUPPORTED_LANGUAGES.includes(lang as Language)) {
        return lang as Language;
      }
    } catch (e) {
      console.warn('[LanguageContext] Error parsing sdadim-settings:', e);
    }
  }

  // 2. Fallback to legacy key
  const saved = localStorage.getItem('app_language');
  return normalizeLanguage(saved);
};

const detectNavigatorLanguage = (): Language | null => {
  if (!isBrowser || typeof navigator === 'undefined') return null;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const detectPreferredLanguage = (): Language => {
  return (
    getStoredLanguage() ||
    detectNavigatorLanguage() ||
    DEFAULT_LANGUAGE
  );
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations object
const translations: Record<Language, Record<string, any>> = {
  es,
  en,
  ru
};

const languageOverrides: Partial<Record<Language, Record<string, any>>> = {
  ru: {
    dashboard: {
      onlineStatus: "Система онлайн",
      licenseStatus: "Лицензия B",
      cockpitButton: "Панель пилота",
      heroGreeting: "Привет, пилот!",
      heroEfficiencyPrefix: "Твоя эффективность составляет",
      heroStatus: {
        ready: "Датчики показывают, что ты готов к новой сессии.",
        progress: "Продолжай тренироваться для лучшего результата.",
        start: "Рекомендуем пройти больше тестов для улучшения готовности.",
      },
      stats: {
        xp: "Опыт",
        tests: "Тестов",
        coins: "Монеты",
      },
      startButton: "Старт",
      level: "Уровень",
      streak: "Серия дней",
    },
  },
  en: {
    dashboard: {
      onlineStatus: "System online",
      licenseStatus: "License B",
      cockpitButton: "Cockpit",
      heroGreeting: "Welcome, Pilot!",
      heroEfficiencyPrefix: "Your efficiency is",
      heroStatus: {
        ready: "Sensors show you're ready for the next session.",
        progress: "Keep training to push the score higher.",
        start: "Run more tests to boost your readiness.",
      },
      stats: {
        xp: "XP",
        tests: "Tests",
        coins: "Coins",
      },
      startButton: "Start",
      level: "Level",
      streak: "Daily Streak",
    },
  },
};

const resolveFromObject = (source: Record<string, any> | undefined, key: string): any => {
  if (!source) return undefined;
  const keys = key.split('.');
  let value: any = source;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return value;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const [language, setLanguageState] = useState<Language>(() => detectPreferredLanguage());

  const applyLanguage = useCallback((lang: Language, persist: boolean = true) => {
    setLanguageState(lang);
    if (persist && isBrowser) {
      localStorage.setItem('app_language', lang);
    }
  }, []);

  useEffect(() => {
    const loadLanguage = async () => {
      if (!profileId) {
        applyLanguage(detectPreferredLanguage());
        return;
      }

      const supabase = await getSupabaseClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('settings, preferred_country')
        .eq('id', profileId)
        .single();

      if (!error && data) {
        const profile = data as any;
        const settings = profile.settings as Record<string, any> | null;
        const preferredCountry = profile.preferred_country;
        const lang = settings?.language as Language | undefined;

        // If country is Russia, force Russian language unless it's already ru
        if (preferredCountry === 'russia' || preferredCountry === 'ru') {
          if (lang !== 'ru') {
            applyLanguage('ru');
            return;
          }
        }

        if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
          applyLanguage(lang);
          return;
        }
      }

      applyLanguage(detectPreferredLanguage());
    };

    loadLanguage();
  }, [profileId, applyLanguage]);

  const setLanguage = async (lang: Language) => {
    // Немедленно обновляем UI и localStorage (синхронно, без ожидания)
    applyLanguage(lang);

    // Сохраняем в Supabase в фоне — не блокируем UI и навигацию
    if (profileId) {
      getSupabaseClient().then(async (supabase) => {
        try {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', profileId)
            .single();

          const currentSettings = ((currentProfile as any)?.settings as Record<string, any>) || {};

          await (supabase as any)
            .from('profiles')
            .update({ settings: { ...currentSettings, language: lang } })
            .eq('id', profileId);
        } catch {
          // Non-critical — language is already stored in localStorage
        }
      });
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    if (helpCenterTranslations[language] && key in helpCenterTranslations[language]) {
      const value = helpCenterTranslations[language][key];
      return typeof value === 'string' ? applyParams(value, params) : key;
    }

    const overrideValue = resolveFromObject(languageOverrides[language], key);
    if (typeof overrideValue === 'string') {
      return applyParams(overrideValue, params);
    }

    const baseTranslations = translations[language] || translations.es;
    const resolved = resolveFromObject(baseTranslations, key);
    return typeof resolved === 'string' ? applyParams(resolved, params) : key;
  };

  const applyParams = (text: string, params?: Record<string, string | number>): string => {
    if (!params) return text;
    return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
      const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
      return acc.replace(regex, String(paramValue));
    }, text);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return fallback to prevent crashes if provider is missing during initialization/lazy loading
    return {
      language: 'en' as Language,
      setLanguage: () => { },
      t: (key: string) => key
    };
  }
  return context;
}
