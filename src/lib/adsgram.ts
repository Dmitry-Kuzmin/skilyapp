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
  REWARDED_VIDEO_BLOCK_ID: '24504', // Новый блок для @skilyapp_bot
};

let adController: AdsGramAdController | null = null;

/**
 * Инициализация AdsGram SDK
 * @param userId - ID пользователя (Telegram ID) для серверных уведомлений
 */
export async function initAdsGram(userId?: string): Promise<AdsGramAdController | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  // Скрипт теперь загружается в index.html через <script>
  if (!window.Adsgram) {
    console.error('[AdsGram] SDK not found on window. Ensure script is in index.html');
    return null;
  }

  try {
    // Инициализация с blockId и userId
    adController = window.Adsgram.init({
      blockId: ADSGRAM_CONFIG.REWARDED_VIDEO_BLOCK_ID,
      ...(userId ? { userId } : {}),
    });

    console.log('[AdsGram] SDK initialized successfully with blockId:', ADSGRAM_CONFIG.REWARDED_VIDEO_BLOCK_ID, 'userId:', userId);
    return adController;
  } catch (error) {
    console.error('[AdsGram] Initialization error:', error);
    return null;
  }
}

/**
 * Показать Rewarded Video рекламу
 * @param userId - ID пользователя (Telegram ID)
 */
export async function showAdsGramRewardedVideo(userId?: string): Promise<boolean> {
  // Пытаемся инициализировать (или обновить userId)
  const controller = await initAdsGram(userId);
  if (!controller) {
    throw new Error('AdsGram SDK not initialized');
  }

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

