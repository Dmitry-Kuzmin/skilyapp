/**
 * SafeLog - утилита для вывода критической диагностики в продакшене.
 * Использует nativeConsole — ссылки на оригинальные методы console,
 * захваченные ДО глобального подавления логов в main.tsx.
 * Благодаря этому easter egg и важная диагностика видны даже когда
 * console.log подавлен.
 */

import { nativeLog, nativeWarn, nativeError } from '@/utils/nativeConsole';

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'group' | 'groupCollapsed' | 'groupEnd';

const NATIVE_MAP: Partial<Record<LogLevel, (...a: any[]) => void>> = {
    log:   nativeLog,
    warn:  nativeWarn,
    error: nativeError,
};

export const safeLog = (level: LogLevel, ...args: any[]) => {
    const fn = NATIVE_MAP[level] ?? nativeLog;
    fn(...args);
};

/**
 * Специальный метод для стилизованной диагностики Skily
 */
export const skilyDiagnostic = (label: string, value: any) => {
    safeLog('log', `%c${label}: %c${value}`, 'color: #94a3b8;', 'color: #ffffff; font-weight: bold;');
};
