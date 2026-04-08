/**
 * Yandex Metrika helpers
 * Счётчики определены в index.html (skilyapp.com → 108379787, sdadim.eu → 108379913)
 */

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void;
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
