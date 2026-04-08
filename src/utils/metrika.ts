/**
 * Analytics helpers — Yandex Metrika + Google Ads conversions
 * Счётчики Метрики определены в index.html (skilyapp.com → 108379787, sdadim.eu → 108379913)
 * Google Ads тег: AW-18034090184 (также в index.html)
 */

const GADS_CONVERSION_REGISTRATION = 'AW-18034090184/LGu7CMTx0pMcEMjBqZdD';

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/** Получить активный ID счётчика (зависит от домена, задаётся в index.html) */
function getCounterId(): number | null {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'skilyapp.com' || hostname.endsWith('.skilyapp.com')) return 108379787;
  if (hostname === 'sdadim.eu' || hostname.endsWith('.sdadim.eu')) return 108379913;
  return null;
}

/**
 * Отправить цель в Яндекс.Метрику
 * @param goalId   — идентификатор цели (как задан в интерфейсе Метрики)
 * @param params   — необязательные параметры визита
 */
export function ymGoal(goalId: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.ym) return;
  const id = getCounterId();
  if (!id) return;
  try {
    if (params) {
      window.ym(id, 'reachGoal', goalId, params);
    } else {
      window.ym(id, 'reachGoal', goalId);
    }
  } catch (e) {
    console.warn('[Metrika] reachGoal failed:', e);
  }
}

/**
 * Отправить конверсию регистрации в Google Ads + Яндекс.Метрику одновременно.
 * Вызывать только при создании НОВОГО профиля (первый вход).
 */
export function trackRegistrationConversion(): void {
  // Google Ads
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', { send_to: GADS_CONVERSION_REGISTRATION });
    }
  } catch (e) {
    console.warn('[Analytics] gtag conversion failed:', e);
  }
  // Yandex Metrika
  ymGoal('registration_complete');
}
