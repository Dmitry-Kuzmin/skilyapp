/**
 * Глобальная утилита для инициализации Paddle SDK
 * Предзагружает SDK при старте приложения для ускорения открытия формы оплаты
 */

import { initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;
let initializationPromise: Promise<Paddle | null> | null = null;
let isInitializing = false;

/**
 * Инициализирует Paddle SDK один раз и кэширует инстанс
 * Можно вызывать несколько раз - вернет тот же промис/инстанс
 */
export async function getPaddleInstance(): Promise<Paddle | null> {
  // Если уже инициализирован - возвращаем сразу
  if (paddleInstance) {
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

  isInitializing = true;

  initializationPromise = (async () => {
    try {
      const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

      if (!clientToken) {
        console.warn('[Paddle] Client token not found in env');
        return null;
      }

      console.log('[Paddle] Initializing SDK (global)...', {
        environment: import.meta.env.PROD ? 'production' : 'sandbox',
        hasToken: !!clientToken,
      });

      const instance = await initializePaddle({
        environment: import.meta.env.PROD ? 'production' : 'sandbox',
        token: clientToken,
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
export function getPaddleInstanceSync(): Paddle | null {
  return paddleInstance;
}

