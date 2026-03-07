/**
 * Monetag SDK интеграция
 * 
 * Документация: https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/
 * 
 * Поддерживает:
 * - Rewarded Interstitial для Telegram Mini App (Zone ID: 10323643) - возвращает Promise
 * - Native Banner (Interstitial) для веб-версии (Zone ID: 10323437) - НЕ возвращает Promise
 */

declare global {
  interface Window {
    // Monetag Rewarded Interstitial для Telegram Mini App (возвращает Promise)
    show_10323643?: () => Promise<void>;
    // Monetag Native Banner (Interstitial) для веб-версии (НЕ возвращает Promise)
    [key: `show_${string}`]: (() => void) | (() => Promise<void>);
  }
}

// Zone ID для Rewarded Interstitial в Telegram Mini App (настроен Димой)
export const MONETAG_TMA_REWARDED_ZONE_ID = '10694746';

// Zone ID для Native Banner (Interstitial) в веб-версии
export const MONETAG_WEB_REWARDED_ZONE_ID = '10323509';

// Имена функций, которые будут созданы SDK
const TMA_SHOW_FUNCTION_NAME = `show_${MONETAG_TMA_REWARDED_ZONE_ID}` as const;
const WEB_SHOW_FUNCTION_NAME = `show_${MONETAG_WEB_REWARDED_ZONE_ID}` as const;

/**
 * Проверяет, загружен ли SDK Monetag для Telegram Mini App
 */
function isTMASDKLoaded(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return typeof (window as any)[TMA_SHOW_FUNCTION_NAME] === 'function';
}

/**
 * Проверяет, загружен ли SDK Monetag для веб-версии
 */
function isWebSDKLoaded(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return typeof (window as any)[WEB_SHOW_FUNCTION_NAME] === 'function';
}

/**
 * Инициализация Monetag SDK для Telegram Mini App
 * SDK загружается автоматически через скрипт в index.html
 */
export function initMonetagTMA(): void {
  if (typeof window === 'undefined') {
    console.warn('[Monetag TMA] Window is not available');
    return;
  }

  // Проверяем сразу
  if (isTMASDKLoaded()) {
    console.log('[Monetag TMA] SDK initialized successfully, function:', TMA_SHOW_FUNCTION_NAME);
    return;
  }

  console.warn('[Monetag TMA] SDK not loaded yet. Waiting for script to load...');

  // Ждем загрузки SDK (максимум 5 секунд)
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (isTMASDKLoaded()) {
      clearInterval(checkInterval);
      console.log('[Monetag TMA] SDK loaded successfully (delayed), function:', TMA_SHOW_FUNCTION_NAME);
    } else if (attempts > 50) {
      clearInterval(checkInterval);
      console.error('[Monetag TMA] SDK failed to load after 5 seconds');
      console.error('[Monetag TMA] Available window functions:', Object.keys(window).filter(k => k.startsWith('show_')));
      console.error('[Monetag TMA] Possible reasons: AdBlock, CORS, or script not loaded');
    }
  }, 100);
}

/**
 * Инициализация Monetag SDK для веб-версии
 * SDK загружается автоматически через скрипт в index.html
 */
export function initMonetagWeb(): void {
  if (typeof window === 'undefined') {
    console.warn('[Monetag Web] Window is not available');
    return;
  }

  // Проверяем сразу
  if (isWebSDKLoaded()) {
    console.log('[Monetag Web] SDK initialized successfully, function:', WEB_SHOW_FUNCTION_NAME);
    return;
  }

  console.warn('[Monetag Web] SDK not loaded yet. Waiting for script to load...');

  // Ждем загрузки SDK (максимум 5 секунд)
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (isWebSDKLoaded()) {
      clearInterval(checkInterval);
      console.log('[Monetag Web] SDK loaded successfully (delayed), function:', WEB_SHOW_FUNCTION_NAME);
    } else if (attempts > 50) {
      clearInterval(checkInterval);
      console.error('[Monetag Web] SDK failed to load after 5 seconds');
      console.error('[Monetag Web] Available window functions:', Object.keys(window).filter(k => k.startsWith('show_')));
      console.error('[Monetag Web] Possible reasons: AdBlock, CORS, or script not loaded');
    }
  }, 100);
}

/**
 * Инициализация Monetag SDK (обертка для обратной совместимости)
 * Определяет платформу автоматически
 */
export function initMonetag(): void {
  // Для обратной совместимости - инициализируем веб-версию
  initMonetagWeb();
}

/**
 * Показывает Rewarded Interstitial рекламу для Telegram Mini App (Monetag)
 * 
 * ВАЖНО: Rewarded Interstitial для TMA возвращает Promise!
 * Promise резолвится, когда пользователь просмотрел рекламу до конца.
 * 
 * @returns Promise<boolean> - true если реклама просмотрена до конца
 */
export async function showMonetagRewardedVideoTMA(): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('Monetag SDK is not available - window is undefined');
  }

  // Проверяем, загружен ли SDK
  if (!isTMASDKLoaded()) {
    initMonetagTMA();
    // Ждем немного (500ms) на случай, если SDK загружается асинхронно
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!isTMASDKLoaded()) {
      // SDK не загружен - возможно, AdBlock заблокировал скрипт
      const error = new Error('Monetag SDK не загружен. Если вы в Telegram — это ошибка определения платформы. Если в браузере — проверьте AdBlock.');
      (error as any).isAdBlockError = true;
      throw error;
    }
  }

  try {
    const showFunction = (window as any)[TMA_SHOW_FUNCTION_NAME];

    if (typeof showFunction !== 'function') {
      console.error('[Monetag TMA] Function not found:', TMA_SHOW_FUNCTION_NAME);
      console.error('[Monetag TMA] Available functions:', Object.keys(window).filter(k => k.startsWith('show_')));
      return false;
    }

    console.log('[Monetag TMA] Calling show function:', TMA_SHOW_FUNCTION_NAME);

    // КРИТИЧНО: Добавляем таймаут 3 секунды, чтобы интерфейс не зависал
    // Rewarded Interstitial для TMA возвращает Promise
    // Promise резолвится, когда пользователь просмотрел рекламу до конца
    await Promise.race([
      showFunction(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Monetag ad timeout - ad did not show within 3 seconds')), 3000)
      )
    ]);

    console.log('[Monetag TMA] Rewarded interstitial completed successfully');
    return true;
  } catch (error: any) {
    console.error('[Monetag TMA] Error showing rewarded video:', error);

    // Если это ошибка загрузки SDK (AdBlock), пробрасываем дальше
    if (error.isAdBlockError) {
      throw error;
    }

    // Если это таймаут, логируем и возвращаем false
    if (error.message?.includes('timeout')) {
      console.warn('[Monetag TMA] Ad timeout - ad may not have shown, skipping reward');
      return false;
    }

    // Другие ошибки - считаем неуспехом
    return false;
  }
}

/**
 * Показывает Rewarded Interstitial рекламу для веб-версии (Monetag)
 * 
 * ВАЖНО: Native Banner (Interstitial) от Monetag НЕ возвращает Promise!
 * Это просто функция, которая показывает полноэкранный баннер.
 * 
 * Логика награды:
 * Monetag платит за ПОКАЗЫ (impressions), не за клики.
 * Поэтому награда выдается сразу после показа рекламы.
 * 
 * Переходы по ссылке (клики) - это дополнительный доход, но не обязательны.
 * Если пользователь перейдет - хорошо, если нет - тоже нормально.
 * 
 * @returns Promise<boolean> - true если реклама показана
 */
export async function showMonetagRewardedVideoWeb(): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('Monetag SDK is not available - window is undefined');
  }

  // Проверяем, загружен ли SDK
  if (!isWebSDKLoaded()) {
    initMonetagWeb();
    // Ждем немного (500ms) на случай, если SDK загружается асинхронно
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!isWebSDKLoaded()) {
      // SDK не загружен - возможно, AdBlock заблокировал скрипт
      const error = new Error('Monetag SDK не загружен. Если вы в Telegram — это ошибка определения платформы. Если в браузере — проверьте AdBlock.');
      (error as any).isAdBlockError = true;
      throw error;
    }
  }

  // КРИТИЧНО: Добавляем таймаут 3 секунды, чтобы интерфейс не зависал
  return Promise.race([
    new Promise<boolean>((resolve) => {
      try {
        const showFunction = (window as any)[WEB_SHOW_FUNCTION_NAME];

        if (typeof showFunction !== 'function') {
          console.error('[Monetag Web] Function not found:', WEB_SHOW_FUNCTION_NAME);
          console.error('[Monetag Web] Available functions:', Object.keys(window).filter(k => k.startsWith('show_')));
          resolve(false);
          return;
        }

        console.log('[Monetag Web] Calling show function:', WEB_SHOW_FUNCTION_NAME);

        // Показываем рекламу
        try {
          showFunction();
          console.log('[Monetag Web] Ad banner shown');

          // Проверяем, что реклама действительно показалась
          // Monetag обычно создает iframe или div с рекламой
          const checkAdShown = () => {
            const monetagSelectors = [
              'iframe[src*="monetag"]',
              'iframe[src*="groleegni"]',
              'iframe[src*="gizokraijaw"]',
              'div[id*="monetag"]',
              'div[class*="monetag"]',
              '[data-zone="10323437"]'
            ];

            for (const selector of monetagSelectors) {
              if (document.querySelector(selector)) {
                return true;
              }
            }
            return false;
          };

          // Проверяем через 500ms, что реклама показалась
          setTimeout(() => {
            const adShown = checkAdShown();
            if (adShown) {
              console.log('[Monetag Web] Ad confirmed shown - reward granted ✅');
              resolve(true);
            } else {
              console.warn('[Monetag Web] Ad might not have shown - checking again...');
              // Проверяем еще раз через 1 секунду
              setTimeout(() => {
                const adShownRetry = checkAdShown();
                if (adShownRetry) {
                  console.log('[Monetag Web] Ad confirmed shown (retry) - reward granted ✅');
                  resolve(true);
                } else {
                  console.error('[Monetag Web] Ad not shown - NO reward ❌');
                  resolve(false);
                }
              }, 1000);
            }
          }, 500);
        } catch (showError: any) {
          // Игнорируем ошибку "Failed to verify" - это нормально для Interstitial
          if (showError.message?.includes('Failed to verify') || showError.message?.includes('verify')) {
            console.warn('[Monetag Web] Ad verification error (ignored):', showError.message);
            // Продолжаем - баннер был показан, награда выдается
            setTimeout(() => {
              console.log('[Monetag Web] Rewarded interstitial completed (with verification error) - reward granted ✅');
              resolve(true);
            }, 500);
          } else {
            console.error('[Monetag Web] Error calling show function:', showError);
            resolve(false);
            return;
          }
        }

      } catch (error: any) {
        console.error('[Monetag Web] Error showing rewarded video:', error);

        // Если это ошибка загрузки SDK (AdBlock), пробрасываем дальше
        if (error.isAdBlockError) {
          throw error;
        }

        // Другие ошибки - считаем неуспехом
        resolve(false);
      }
    }),
    // Таймаут: если реклама не показалась за 3 секунды, отменяем ожидание
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn('[Monetag Web] Ad timeout - ad did not show within 3 seconds, skipping reward');
        resolve(false);
      }, 3000);
    })
  ]);
}

/**
 * Показывает Rewarded Video рекламу (Monetag)
 * Автоматически определяет платформу и использует соответствующий SDK
 * 
 * @returns Promise<boolean> - true если реклама просмотрена
 */
export async function showMonetagRewardedVideo(): Promise<boolean> {
  // Для обратной совместимости используем веб-версию
  // В useRewardedAd будет правильное определение платформы
  return showMonetagRewardedVideoWeb();
}
