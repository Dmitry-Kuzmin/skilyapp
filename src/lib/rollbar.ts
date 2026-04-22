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
          },
        },
        person: {
          id: undefined, // Будет установлено позже через setPerson
        },
      },
      // ВАЖНО: НЕ используем ignoredMessages с RegExp — Rollbar сериализует их как {} и фильтрация не работает.
      // Вместо этого вся фильтрация реализована в checkIgnore через строки.
      checkIgnore: (_isUncaught: boolean, args: any[], payload: any) => {
        // ── Извлекаем сообщение ────────────────────────────────────────────────
        const msg: string = (
          payload?.body?.trace?.exception?.message ||
          payload?.body?.message?.body ||
          String(args[0]?.message || args[0] || '')
        ).toLowerCase();

        // ── Игнорируем по содержимому сообщения ───────────────────────────────

        // Web Vitals метрики — не ошибки
        if (msg.includes('web vitals')) return true;

        // Ошибки расширений и injected scripts браузера
        if (msg.includes('script error')) return true;
        if (msg.includes('resizeobserver loop')) return true;

        // Сетевые блокировки (AdBlock, CORS, offline)
        if (msg.includes('access to fetch')) return true;
        if (msg.includes('xmlhttprequest cannot load')) return true;
        if (msg.includes('failed to fetch')) return true;
        if (msg.includes('networkerror')) return true;
        if (msg.includes('access control checks')) return true;
        if (msg.includes('the operation was aborted')) return true;

        // TON / Telegram — ожидаемое поведение пользователя
        if (msg.includes('userrejectserror')) return true;
        if (msg.includes('ton_connect_sdk_error')) return true;
        if (msg.includes('user declined the transaction')) return true;
        if (msg.includes('telegramgameproxy')) return true;
        if (msg.includes('telegram.webapp') && msg.includes('is not supported')) return true;

        // Рекурсия из browser extension (canPlayType patch)
        if (msg.includes('maximum call stack size exceeded')) return true;

        // Ошибка парсинга HTML как JS (CDN 404, бот)
        if (msg.includes("unexpected token '<'")) return true;

        // Сервер вернул HTML вместо JS (CDN 404/503, устаревший кэш)
        if (msg.includes('is not a valid javascript mime type')) return true;
        if (msg.includes('text/html') && msg.includes('not') && msg.includes('valid')) return true;

        // Ошибки загрузки чанков (устаревший кэш после деплоя)
        if (msg.includes('failed to fetch dynamically imported module')) return true;
        if (msg.includes('importing a module script failed')) return true;
        if (msg.includes('unable to preload css')) return true;
        if (msg.includes('error loading dynamically imported module')) return true;

        // removeChild в React+Framer Motion — известная race condition при быстрой навигации
        if (msg.includes('removechild') && msg.includes('node')) return true;
        if (msg.includes('failed to execute') && msg.includes('removechild')) return true;

        // ── Игнорируем по источнику (stack frames) ────────────────────────────
        const frames: Array<{ filename?: string }> = payload?.body?.trace?.frames || [];

        // Browser extensions
        if (frames.some(f => f.filename && (
          f.filename.includes('extension://') ||
          f.filename.includes('moz-extension://') ||
          f.filename.includes('safari-extension://') ||
          f.filename.includes('preload/document')
        ))) {
          return true;
        }

        // Localhost — боты, dev preview
        if (frames.some(f => f.filename && f.filename.includes('localhost'))) {
          return true;
        }

        return false;
      },
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













































