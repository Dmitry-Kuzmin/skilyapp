/**
 * Утилита для работы с Rollbar - отслеживание ошибок
 * Инициализирует Rollbar только в production и только если токен доступен
 */

import Rollbar from 'rollbar';

let rollbar: Rollbar | null = null;

/**
 * Инициализирует Rollbar с настройками для production
 */
export function initRollbar(): Rollbar | null {
  // Не инициализируем в development
  if (!import.meta.env.PROD) {
    console.log('[Rollbar] Skipped initialization in development mode');
    return null;
  }

  // Проверяем наличие токена
  const accessToken = import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('[Rollbar] VITE_ROLLBAR_ACCESS_TOKEN not found, Rollbar disabled');
    return null;
  }

  // Если уже инициализирован, возвращаем существующий экземпляр
  if (rollbar) {
    return rollbar;
  }

  try {
    rollbar = new Rollbar({
      accessToken,
      captureUncaught: true,
      captureUnhandledRejections: true,
      environment: import.meta.env.PROD ? 'production' : 'development',
      enabled: true,
      payload: {
        client: {
          javascript: {
            source_map_enabled: true,
            code_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
            // Опционально: можно добавить source maps для лучшей отладки
            // guess_uncaught_frames: true,
          },
        },
        // Добавляем информацию о пользователе (если доступна)
        person: {
          id: undefined, // Будет установлено позже через setPerson
        },
      },
      // Игнорируем некоторые ошибки, которые не критичны
      ignoredMessages: [
        // Игнорируем ошибки из расширений браузера
        /Script error/i,
        /ResizeObserver loop/i,
        // Игнорируем ошибки CORS (они нормальны для development)
        /Access to fetch/i,
      ],
    });

    console.log('[Rollbar] Initialized successfully');
    return rollbar;
  } catch (error) {
    console.error('[Rollbar] Failed to initialize:', error);
    return null;
  }
}

/**
 * Получить экземпляр Rollbar (или null если не инициализирован)
 */
export function getRollbar(): Rollbar | null {
  if (!rollbar) {
    return initRollbar();
  }
  return rollbar;
}

/**
 * Отправить ошибку в Rollbar
 */
export function reportError(error: Error | string, context?: Record<string, any>) {
  const rb = getRollbar();
  if (!rb) {
    // В development просто логируем
    console.error('[Rollbar] Error:', error, context);
    return;
  }

  if (typeof error === 'string') {
    rb.error(error, context);
  } else {
    rb.error(error, context);
  }
}

/**
 * Отправить предупреждение в Rollbar
 */
export function reportWarning(message: string, context?: Record<string, any>) {
  const rb = getRollbar();
  if (!rb) {
    console.warn('[Rollbar] Warning:', message, context);
    return;
  }

  rb.warning(message, context);
}

/**
 * Отправить информационное сообщение в Rollbar
 */
export function reportInfo(message: string, context?: Record<string, any>) {
  const rb = getRollbar();
  if (!rb) {
    console.log('[Rollbar] Info:', message, context);
    return;
  }

  rb.info(message, context);
}

/**
 * Установить информацию о пользователе для всех последующих ошибок
 */
export function setRollbarPerson(userId: string, email?: string, username?: string) {
  const rb = getRollbar();
  if (!rb) {
    return;
  }

  rb.configure({
    payload: {
      person: {
        id: userId,
        email,
        username,
      },
    },
  });
}

/**
 * Очистить информацию о пользователе (при logout)
 */
export function clearRollbarPerson() {
  const rb = getRollbar();
  if (!rb) {
    return;
  }

  rb.configure({
    payload: {
      person: null,
    },
  });
}












































