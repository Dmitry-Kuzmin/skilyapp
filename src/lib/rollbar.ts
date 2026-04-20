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
      ignoredMessages: [
        // Web Vitals метрики — не ошибки, не должны попадать в Rollbar
        /Web Vitals .* is poor/i,
        /Web Vitals .* needs.improvement/i,
        // Ошибки расширений браузера
        /Script error/i,
        /ResizeObserver loop/i,
        // Сетевые блокировки (AdBlock, CORS)
        /Access to fetch/i,
        /XMLHttpRequest cannot load/i,
        /Failed to fetch/i,
        /NetworkError/i,
        /Aborted/i,
        /access control checks/i,
        // Пользователь отклонил TON транзакцию — ожидаемое поведение
        /UserRejectsError/i,
        /TON_CONNECT_SDK_ERROR/i,
        /User declined the transaction/i,
        // Telegram SDK internal
        /TelegramGameProxy/i,
        // Рекурсия из browser extension (canPlayType patch)
        /Maximum call stack size exceeded/i,
        // Ошибка парсинга HTML как JS (бот в local preview / CDN 404)
        /Unexpected token '<'/i,
      ],
      // Дополнительная фильтрация по источнику
      checkIgnore: (_isUncaught: boolean, _args: any[], payload: any) => {
        const frames: Array<{ filename?: string }> = payload?.body?.trace?.frames || [];
        // Игнорируем ошибки из browser extensions
        if (frames.some(f => f.filename && (
          f.filename.includes('extension://') ||
          f.filename.includes('moz-extension://') ||
          f.filename.includes('safari-extension://') ||
          f.filename.includes('preload/document')
        ))) {
          return true;
        }
        // Игнорируем ошибки из localhost (боты, dev preview)
        if (frames.some(f => f.filename && f.filename.includes('localhost'))) {
          return true;
        }
        return false;
      },
      // ВАЖНО: Не выводим логи в консоль если инициализация не удалась (тихий режим)
      verbose: false,
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













































