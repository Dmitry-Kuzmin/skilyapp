/**
 * Browser Fingerprinting для партнерской программы
 * Использует FingerprintJS для генерации уникального хеша устройства
 * 
 * Установка:
 * npm install @fingerprintjs/fingerprintjs
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<ReturnType<typeof FingerprintJS.load>> | null = null;
let cachedFingerprint: string | null = null;

/**
 * Инициализирует FingerprintJS (вызывается один раз)
 */
function initFingerprint(): Promise<ReturnType<typeof FingerprintJS.load>> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
}

/**
 * Получает browser fingerprint hash
 * Кэширует результат для повторного использования
 * 
 * @returns Promise<string> - Уникальный хеш устройства
 */
export async function getFingerprint(): Promise<string> {
  // Если уже есть кэш, возвращаем его
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    const fp = await initFingerprint();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    return cachedFingerprint;
  } catch (error) {
    console.error('[Fingerprint] Error getting fingerprint:', error);
    // Fallback: генерируем простой хеш на основе доступных данных
    return generateFallbackFingerprint();
  }
}

/**
 * Генерирует fallback fingerprint если FingerprintJS недоступен
 */
function generateFallbackFingerprint(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
  ].join('|');

  // Простой хеш (для fallback)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return 'fallback_' + Math.abs(hash).toString(36);
}

/**
 * Сбрасывает кэш fingerprint (для тестирования)
 */
export function resetFingerprintCache(): void {
  cachedFingerprint = null;
  fpPromise = null;
}

