import { Language } from "@/contexts/LanguageContext";

/**
 * Автоматический перевод текста через DeepL API (или другой сервис)
 * В продакшене можно использовать Edge Function для безопасности API ключа
 */
export async function translateText(
  text: string,
  targetLang: Language,
  sourceLang: Language = 'ru'
): Promise<string> {
  // Если язык тот же, возвращаем оригинал
  if (targetLang === sourceLang) {
    return text;
  }

  // TODO: Реализовать через Edge Function для безопасности
  // Пока возвращаем оригинал с пометкой
  console.warn('Translation not implemented yet. Using original text.');
  return text;
}

/**
 * Кеш для переводов, чтобы не переводить один и тот же текст несколько раз
 */
const translationCache = new Map<string, string>();

export function getCachedTranslation(key: string, lang: Language): string | null {
  return translationCache.get(`${key}:${lang}`) || null;
}

export function setCachedTranslation(key: string, lang: Language, translation: string): void {
  translationCache.set(`${key}:${lang}`, translation);
}


