/**
 * AdsGram SDK интеграция
 * 
 * Документация: https://docs.adsgram.ai/publisher/reward-interstitial-integration
 */

interface ShowPromiseResult {
  done: boolean; // true если пользователь досмотрел до конца
  description: string; // описание события
  state: 'load' | 'render' | 'playing' | 'destroy'; // состояние рекламы
  error: boolean; // true если была ошибка
}

interface AdsGramAdController {
  show: () => Promise<ShowPromiseResult>;
}

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string }) => AdsGramAdController;
    };
  }
}

// Конфигурация
const ADSGRAM_CONFIG = {
  // Block ID из вашего кабинета AdsGram
  REWARDED_VIDEO_BLOCK_ID: '19051', // Ваш созданный блок
};

let adController: AdsGramAdController | null = null;

/**
 * Динамическая загрузка скрипта AdsGram SDK
 */
async function loadAdsGramScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.Adsgram) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = "https://sad.adsgram.ai/js/sad.min.js";
    script.async = true;
    script.onload = () => {
      console.log('[AdsGram] SDK Script loaded dynamically');
      resolve(true);
    };
    script.onerror = () => {
      console.error('[AdsGram] Failed to load SDK script');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Инициализация AdsGram SDK
 * Должна быть вызвана один раз при загрузке приложения
 */
export async function initAdsGram(): Promise<AdsGramAdController | null> {
  if (typeof window === 'undefined') {
    console.warn('[AdsGram] Window is not available');
    return null;
  }

  if (adController) {
    return adController;
  }

  // Если скрипта еще нет, загружаем его
  if (!window.Adsgram) {
    const loaded = await loadAdsGramScript();
    if (!loaded || !window.Adsgram) {
      console.error('[AdsGram] SDK not loaded even after dynamic attempt');
      return null;
    }
  }

  try {
    // Инициализация с blockId
    adController = window.Adsgram.init({
      blockId: ADSGRAM_CONFIG.REWARDED_VIDEO_BLOCK_ID,
    });

    console.log('[AdsGram] SDK initialized successfully with blockId:', ADSGRAM_CONFIG.REWARDED_VIDEO_BLOCK_ID);
    return adController;
  } catch (error) {
    console.error('[AdsGram] Initialization error:', error);
    return null;
  }
}

/**
 * Показать Rewarded Video рекламу
 * 
 * Promise резолвится, если пользователь досмотрел рекламу до конца
 * Promise реджектится, если была ошибка или пользователь пропустил рекламу
 */
export async function showAdsGramRewardedVideo(): Promise<boolean> {
  if (!adController) {
    // Пытаемся инициализировать
    const controller = await initAdsGram();
    if (!controller) {
      throw new Error('AdsGram SDK not initialized');
    }
  }

  const controller = adController!;

  return new Promise((resolve, reject) => {
    controller
      .show()
      .then((result: ShowPromiseResult) => {
        // result.done === true означает, что пользователь досмотрел рекламу до конца
        if (result.done) {
          console.log('[AdsGram] Rewarded video completed:', result);
          resolve(true);
        } else {
          console.warn('[AdsGram] Rewarded video not completed:', result);
          reject(new Error(result.description || 'Ad not completed'));
        }
      })
      .catch((error: any) => {
        // Обработка различных типов ошибок
        console.error('[AdsGram] Rewarded video error:', error);

        // Проверяем тип ошибки
        const errorMessage = error?.message || error?.description || 'Unknown error';
        const errorName = error?.name || '';

        // NotAllowedError - браузер блокирует автовоспроизведение
        if (errorName === 'NotAllowedError' || errorMessage.includes('not allowed') || errorMessage.includes('NotAllowedError')) {
          reject(new Error('Автовоспроизведение заблокировано браузером. Пожалуйста, нажмите на кнопку "Смотреть видео" еще раз.'));
          return;
        }

        // Если это объект ShowPromiseResult
        if (typeof error === 'object' && 'description' in error) {
          reject(new Error(error.description || 'Ad error'));
          return;
        }

        // Общая ошибка
        reject(new Error(errorMessage || 'Не удалось показать рекламу'));
      });
  });
}

/**
 * Получить текущий контроллер рекламы
 */
export async function getAdsGramController(): Promise<AdsGramAdController | null> {
  if (!adController) {
    return initAdsGram();
  }
  return adController;
}

export { ADSGRAM_CONFIG, type ShowPromiseResult };

