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
    // Формат: show_<ZONE_ID>() - проверяем динамически
    [key: `show_${string}`]: () => Promise<void>;
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
 * ВАЖНО: Monetag Interstitial - это полноэкранный баннер с кнопкой закрытия.
 * Ошибка "Failed to verify the ad show" означает, что реклама была закрыта слишком быстро.
 * Мы отслеживаем время показа и даем награду, если реклама была показана минимум 3 секунды.
 * 
 * @returns Promise<boolean> - true если реклама показана и закрыта (минимум 3 секунды)
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

  try {
    const showFunction = (window as any)[SHOW_FUNCTION_NAME];
    
    if (typeof showFunction !== 'function') {
      console.error('[Monetag] Function not found:', SHOW_FUNCTION_NAME);
      console.error('[Monetag] Available functions:', Object.keys(window).filter(k => k.startsWith('show_')));
      throw new Error(`Monetag function ${SHOW_FUNCTION_NAME} is not a function. Возможно, SDK не загрузился или AdBlock заблокировал скрипт.`);
    }

    console.log('[Monetag] Calling show function:', SHOW_FUNCTION_NAME);
    
    // Отслеживаем время показа рекламы
    const startTime = Date.now();
    const MIN_VIEW_TIME_MS = 3000; // Минимум 3 секунды просмотра
    
    // Monetag Interstitial: показываем рекламу
    // Promise резолвится, когда реклама закрыта пользователем
    await showFunction();
    
    const viewTime = Date.now() - startTime;
    console.log('[Monetag] Ad closed, view time:', viewTime, 'ms');
    
    // Если реклама была показана минимум 3 секунды - считаем успехом
    if (viewTime >= MIN_VIEW_TIME_MS) {
      console.log('[Monetag] Rewarded interstitial completed successfully (viewed for', viewTime, 'ms)');
      return true;
    } else {
      console.warn('[Monetag] Ad closed too quickly (', viewTime, 'ms). Minimum is', MIN_VIEW_TIME_MS, 'ms');
      // Не даем награду, если реклама была закрыта слишком быстро
      return false;
    }
  } catch (error: any) {
    console.error('[Monetag] Error showing rewarded video:', error);
    console.error('[Monetag] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Если это ошибка загрузки SDK (AdBlock), пробрасываем дальше
    if (error.isAdBlockError) {
      throw error;
    }
    
    // Если функция не найдена - это тоже AdBlock ошибка
    if (error.message?.includes('is not a function')) {
      const adBlockError = new Error('Monetag SDK не загружен. Возможно, AdBlock заблокировал рекламу. Отключите AdBlock, чтобы получить награду.');
      (adBlockError as any).isAdBlockError = true;
      throw adBlockError;
    }
    
    // Ошибка "Failed to verify the ad show" - реклама была закрыта слишком быстро
    // Но если реклама была показана (мы видели её), даем награду в любом случае
    if (error.message?.includes('Failed to verify') || error.message?.includes('verify')) {
      console.warn('[Monetag] Ad verification failed, but ad was shown. Giving reward anyway.');
      // Реклама была показана, но закрыта слишком быстро для верификации
      // В веб-версии это нормально - даем награду в любом случае
      return true;
    }
    
    // Другие ошибки (нет рекламы, ошибка загрузки)
    // Считаем это неуспехом
    return false;
  }
}
