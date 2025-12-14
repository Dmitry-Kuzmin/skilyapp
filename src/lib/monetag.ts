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
 * Мы считаем успехом сам факт показа + закрытия рекламы пользователем.
 * 
 * @returns Promise<boolean> - true если реклама показана и закрыта
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
    
    // Monetag Interstitial: показываем рекламу
    // Promise резолвится, когда реклама закрыта пользователем
    await showFunction();
    
    console.log('[Monetag] Rewarded interstitial completed (closed by user)');
    return true;
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
    
    // Другие ошибки (нет рекламы, пользователь закрыл слишком быстро)
    // Считаем это неуспехом, но не критической ошибкой
    return false;
  }
}
