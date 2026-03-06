/**
 * Глобальная утилита для инициализации Paddle SDK
 * Предзагружает SDK при старте приложения для ускорения открытия формы оплаты
 * 
 * Использует envValidation для graceful degradation
 */

import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { isPaddleEnabled, getEnvConfig } from '@/utils/envValidation';

let paddleInstance: Paddle | null | undefined = null;
let initializationPromise: Promise<Paddle | null | undefined> | null = null;
let isInitializing = false;

/**
 * Инициализирует Paddle SDK один раз и кэширует инстанс
 * Можно вызывать несколько раз - вернет тот же промис/инстанс
 */
export async function getPaddleInstance(): Promise<Paddle | null | undefined> {
  // Если уже инициализирован - возвращаем сразу
  // Если уже инициализирован - обновляем настройки и возвращаем
  if (paddleInstance) {
    paddleInstance.Update({
      checkout: {
        settings: {
          displayMode: "overlay",
        }
      }
    });
    return paddleInstance;
  }

  // Если уже идет инициализация - возвращаем тот же промис
  if (initializationPromise) {
    return initializationPromise;
  }

  // Если уже пытались инициализировать, но не получилось - не пытаемся снова
  if (isInitializing) {
    return null;
  }

  // Проверяем доступность Paddle через envValidation
  if (!isPaddleEnabled()) {
    if (import.meta.env.DEV) {
      console.debug('[Paddle] Payments disabled - token not configured');
    }
    return null;
  }

  isInitializing = true;

  initializationPromise = (async () => {
    try {
      const config = getEnvConfig();
      const clientToken = config.paddle.clientToken;

      if (!clientToken) {
        // Это не должно произойти, так как мы проверили isPaddleEnabled
        console.warn('[Paddle] Client token not found despite validation');
        return null;
      }

      // Auto-detect environment based on token or explicit env var
      const environment = (import.meta.env.VITE_PADDLE_ENVIRONMENT === 'production' || clientToken.startsWith('live_'))
        ? 'production'
        : 'sandbox';

      console.log('[Paddle] Initializing SDK (global)...', {
        environment,
        hasToken: !!clientToken,
      });

      const instance = await initializePaddle({
        environment: environment as 'production' | 'sandbox',
        token: clientToken,
        checkout: {
          settings: {
            displayMode: "overlay",
            locale: "en", // Or detect from navigator
          }
        }
      });

      paddleInstance = instance;
      console.log('[Paddle] ✅ SDK initialized successfully (global)');
      return instance;
    } catch (error) {
      console.error('[Paddle] ❌ Failed to initialize SDK:', error);
      return null;
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
}

/**
 * Предзагружает Paddle SDK (не блокирует, выполняется в фоне)
 * Вызывается при загрузке приложения для ускорения открытия формы оплаты
 */
export function preloadPaddle(): void {
  // Запускаем инициализацию в фоне, не ждем результата
  getPaddleInstance().catch((error) => {
    console.error('[Paddle] Preload failed:', error);
  });
}

/**
 * Получить текущий инстанс Paddle (если уже инициализирован)
 * Если не инициализирован - вернет null (не будет инициализировать)
 */
export function getPaddleInstanceSync(): Paddle | null | undefined {
  return paddleInstance;
}

