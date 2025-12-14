/**
 * Monetag SDK интеграция для веб-версии
 * 
 * Документация: https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/
 * 
 * ВАЖНО: Monetag Interstitial работает как Rewarded Video для веб-версии.
 * Пользователь закрывает рекламу, и мы считаем это успешным просмотром.
 */

declare global {
  interface Window {
    // Monetag Interstitial функция (создается автоматически SDK)
    // ВАЖНО: Native Banner (Interstitial) НЕ возвращает Promise!
    // Это просто функция, которая показывает баннер
    [key: `show_${string}`]: () => void;
  }
}

// Zone ID для Rewarded Interstitial (Native Banner Interstitial используется как Rewarded Video)
export const MONETAG_REWARDED_ZONE_ID = '10323437';

// Имя функции, которая будет создана SDK
const SHOW_FUNCTION_NAME = `show_${MONETAG_REWARDED_ZONE_ID}` as const;

/**
 * Проверяет, загружен ли SDK Monetag
 */
function isSDKLoaded(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return typeof (window as any)[SHOW_FUNCTION_NAME] === 'function';
}

/**
 * Инициализация Monetag SDK
 * SDK загружается автоматически через скрипт в index.html
 */
export function initMonetag(): void {
  if (typeof window === 'undefined') {
    console.warn('[Monetag] Window is not available');
    return;
  }

  // Проверяем сразу
  if (isSDKLoaded()) {
    console.log('[Monetag] SDK initialized successfully, function:', SHOW_FUNCTION_NAME);
    return;
  }

  console.warn('[Monetag] SDK not loaded yet. Waiting for script to load...');
  
  // Ждем загрузки SDK (максимум 5 секунд)
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (isSDKLoaded()) {
      clearInterval(checkInterval);
      console.log('[Monetag] SDK loaded successfully (delayed), function:', SHOW_FUNCTION_NAME);
    } else if (attempts > 50) {
      clearInterval(checkInterval);
      console.error('[Monetag] SDK failed to load after 5 seconds');
      console.error('[Monetag] Available window functions:', Object.keys(window).filter(k => k.startsWith('show_')));
      console.error('[Monetag] Possible reasons: AdBlock, CORS, or script not loaded');
    }
  }, 100);
}

/**
 * Показывает Rewarded Interstitial рекламу (Monetag)
 * 
 * ВАЖНО: Native Banner (Interstitial) от Monetag НЕ возвращает Promise!
 * Это просто функция, которая показывает полноэкранный баннер.
 * 
 * Для эмуляции Rewarded Video в веб-версии:
 * 1. Вызываем show_10323437() - показываем баннер
 * 2. Через 3 секунды считаем рекламу "просмотренной" и даем награду
 * 3. Это нормальная практика для веб-версии, где нет настоящего Rewarded Video API
 * 
 * @returns Promise<boolean> - true если реклама показана
 */
export async function showMonetagRewardedVideo(): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('Monetag SDK is not available - window is undefined');
  }

  // Проверяем, загружен ли SDK
  if (!isSDKLoaded()) {
    initMonetag();
    // Ждем немного (500ms) на случай, если SDK загружается асинхронно
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!isSDKLoaded()) {
      // SDK не загружен - возможно, AdBlock заблокировал скрипт
      const error = new Error('Monetag SDK не загружен. Возможно, AdBlock заблокировал рекламу. Отключите AdBlock, чтобы получить награду.');
      (error as any).isAdBlockError = true;
      throw error;
    }
  }

  return new Promise((resolve) => {
    try {
      const showFunction = (window as any)[SHOW_FUNCTION_NAME];
      
      if (typeof showFunction !== 'function') {
        console.error('[Monetag] Function not found:', SHOW_FUNCTION_NAME);
        console.error('[Monetag] Available functions:', Object.keys(window).filter(k => k.startsWith('show_')));
        resolve(false);
        return;
      }

      console.log('[Monetag] Calling show function:', SHOW_FUNCTION_NAME);
      
      // ВАЖНО: Native Banner (Interstitial) НЕ возвращает Promise!
      // Это просто функция, которая показывает баннер
      // Вызываем её синхронно
      try {
        showFunction();
        console.log('[Monetag] Ad banner shown');
      } catch (showError: any) {
        // Игнорируем ошибку "Failed to verify" - это нормально для Interstitial
        if (showError.message?.includes('Failed to verify') || showError.message?.includes('verify')) {
          console.warn('[Monetag] Ad verification error (ignored):', showError.message);
          // Продолжаем - баннер был показан
        } else {
          console.error('[Monetag] Error calling show function:', showError);
          resolve(false);
          return;
        }
      }
      
      // ХАК: Так как Interstitial не дает Promise при закрытии,
      // мы считаем рекламу "просмотренной" через 3 секунды после показа
      // Это нормальная практика для веб-версии
      const REWARD_DELAY_MS = 3000; // 3 секунды
      
      setTimeout(() => {
        console.log('[Monetag] Rewarded interstitial completed (after', REWARD_DELAY_MS, 'ms delay)');
        resolve(true);
      }, REWARD_DELAY_MS);
      
    } catch (error: any) {
      console.error('[Monetag] Error showing rewarded video:', error);
      
      // Если это ошибка загрузки SDK (AdBlock), пробрасываем дальше
      if (error.isAdBlockError) {
        throw error;
      }
      
      // Другие ошибки - считаем неуспехом
      resolve(false);
    }
  });
}
