/**
 * Structured logger — zero-dep обёртка над console с уровнями и контекстом.
 * Готов к интеграции с Sentry: см. `attachSink()`.
 *
 * Использование:
 *   import { logger } from '@/lib/logger';
 *   logger.info('test_completed', { userId, score, mode });
 *   logger.warn('rate_limit_hit', { endpoint, count });
 *   logger.error('payment_failed', err, { orderId });
 *
 * В production:
 *   - debug/info глушатся (если LOG_LEVEL=warn)
 *   - warn/error всегда летят в sinks (например Sentry)
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
 * Подключить дополнительный sink (например Sentry).
 * Sentry-интеграция (когда DSN добавлен в env):
 *
 *   import * as Sentry from '@sentry/react';
 *   attachSink((level, event, ctx) => {
 *     if (level === 'error' && ctx.error instanceof Error) {
 *       Sentry.captureException(ctx.error, { tags: { event }, extra: ctx });
 *     } else if (level === 'warn') {
 *       Sentry.captureMessage(event, { level: 'warning', extra: ctx });
 *     } else {
 *       Sentry.addBreadcrumb({ category: event, level, data: ctx });
 *     }
 *   });
 */
export function attachSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
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
