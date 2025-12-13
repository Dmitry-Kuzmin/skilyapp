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
 * Инициализация AdsGram SDK
 * Должна быть вызвана один раз при загрузке приложения
 */
export function initAdsGram(): AdsGramAdController | null {
  if (typeof window === 'undefined') {
    console.warn('[AdsGram] Window is not available');
    return null;
  }

  if (!window.Adsgram) {
    console.error('[AdsGram] SDK not loaded. Make sure script is included in index.html');
    return null;
  }

  if (adController) {
    console.log('[AdsGram] Already initialized');
    return adController;
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
export function showAdsGramRewardedVideo(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!adController) {
      // Пытаемся инициализировать, если еще не инициализировано
      const controller = initAdsGram();
      if (!controller) {
        reject(new Error('AdsGram SDK not initialized'));
        return;
      }
    }

    const controller = adController!;

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
      .catch((result: ShowPromiseResult) => {
        // Ошибка или пользователь пропустил рекламу
        console.error('[AdsGram] Rewarded video error:', result);
        reject(new Error(result.description || 'Ad error'));
      });
  });
}

/**
 * Получить текущий контроллер рекламы
 */
export function getAdsGramController(): AdsGramAdController | null {
  if (!adController) {
    return initAdsGram();
  }
  return adController;
}

export { ADSGRAM_CONFIG, type ShowPromiseResult };

