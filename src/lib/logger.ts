/**
 * Structured logger — zero-dep обёртка над console с уровнями и контекстом.
 * В production warn/error автоматически летят в Rollbar (если инициализирован).
 *
 * Использование:
 *   import { logger } from '@/lib/logger';
 *   logger.info('test_completed', { userId, score, mode });
 *   logger.warn('rate_limit_hit', { endpoint, count });
 *   logger.error('payment_failed', err, { orderId });
 *
 * В production:
 *   - debug/info глушатся в консоли но идут в sinks как breadcrumbs
 *   - warn/error всегда летят в Rollbar через reportError
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel: LogLevel = (
  typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'debug' : 'warn'
) as LogLevel;

type LogContext = Record<string, unknown>;
type LogSink = (level: LogLevel, event: string, context: LogContext) => void;

const sinks: LogSink[] = [];

/**
 * Подключить дополнительный sink. Rollbar подключается автоматически
 * (см. attachRollbarSink ниже) — этот метод для дополнительных интеграций.
 */
export function attachSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

/**
 * Привязать logger к Rollbar. Вызывается из main.tsx после initRollbar().
 * Lazy-import чтобы не тащить rollbar в bundle, если он ещё не подгружен.
 */
export async function attachRollbarSink(): Promise<void> {
  try {
    const { reportError } = await import('./rollbar');
    attachSink((level, event, ctx) => {
      if (level === 'error') {
        // Если в ctx есть оригинальный Error — передаём его, иначе строку события
        const error = ctx.error instanceof Error
          ? ctx.error
          : new Error(`${event}: ${ctx.error_message ?? 'unknown'}`);
        reportError(error, { event, ...ctx });
      } else if (level === 'warn') {
        // Warning'и тоже отправляем, но как сообщения
        reportError(`[WARN] ${event}`, { event, level, ...ctx });
      }
      // debug/info — только в консоль, в Rollbar не шлём (избегаем 5K/мес лимит)
    });
  } catch {
    // Rollbar не доступен — это OK, logger продолжает работать без него
  }
}

function emit(level: LogLevel, event: string, context: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
    // Всё равно отдаём в sinks (Sentry breadcrumbs хочет даже отглушённые)
    for (const sink of sinks) {
      try { sink(level, event, context); } catch { /* sink errors must not break app */ }
    }
    return;
  }

  // eslint-disable-next-line no-console
  const fn = console[level] ?? console.log;
  fn(`[${event}]`, context);

  for (const sink of sinks) {
    try { sink(level, event, context); } catch { /* */ }
  }
}

export const logger = {
  debug(event: string, context: LogContext = {}): void {
    emit('debug', event, context);
  },
  info(event: string, context: LogContext = {}): void {
    emit('info', event, context);
  },
  warn(event: string, context: LogContext = {}): void {
    emit('warn', event, context);
  },
  error(event: string, error?: unknown, context: LogContext = {}): void {
    const errorInfo = error instanceof Error
      ? { error_name: error.name, error_message: error.message, error_stack: error.stack }
      : { error };
    emit('error', event, { ...errorInfo, ...context });
  },
};
