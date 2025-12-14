/**
 * Monetag SDK интеграция для веб-версии
 * 
 * Документация: https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/
 */

declare global {
  interface Window {
    // Monetag Rewarded Interstitial функция
    show_10323437?: () => Promise<void>;
  }
}

// Zone ID для Rewarded Interstitial (получить из Monetag кабинета)
export const MONETAG_REWARDED_ZONE_ID = '10323437';

/**
 * Инициализация Monetag SDK
 * SDK загружается автоматически через скрипт в index.html
 */
export function initMonetag(): void {
  if (typeof window === 'undefined') {
    console.warn('[Monetag] Window is not available');
    return;
  }

  // Проверяем, загружен ли SDK
  if (!window.show_10323437) {
    console.warn('[Monetag] SDK not loaded. Make sure script is included in index.html');
    return;
  }

  console.log('[Monetag] SDK initialized successfully');
}

/**
 * Показывает Rewarded Interstitial рекламу (Monetag)
 * @returns Promise<boolean> - true если реклама просмотрена до конца
 */
export async function showMonetagRewardedVideo(): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('Monetag SDK is not available');
  }

  if (!window.show_10323437) {
    console.warn('[Monetag] SDK not initialized. Attempting to initialize...');
    initMonetag();
    
    if (!window.show_10323437) {
      throw new Error('Monetag SDK failed to initialize');
    }
  }

  try {
    // Monetag SDK возвращает Promise, который резолвится при успешном просмотре
    await window.show_10323437();
    console.log('[Monetag] Rewarded video completed successfully');
    return true;
  } catch (error: any) {
    console.error('[Monetag] Error showing rewarded video:', error);
    // Если пользователь закрыл рекламу или произошла ошибка, Promise отклоняется
    return false;
  }
}

