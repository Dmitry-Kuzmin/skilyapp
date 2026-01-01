/**
 * SafeLog - утилита для вывода критической диагностики в продакшене.
 * Использует прямое обращение к window.console, чтобы обойти автоматическую 
 * очистку консоли (esbuild drop) при сборке.
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'group' | 'groupCollapsed' | 'groupEnd';

export const safeLog = (level: LogLevel, ...args: any[]) => {
    // В продакшене используем window.console напрямую
    // В разработке — обычный console (для удобства отладки и маппинга строк)
    if (typeof window !== 'undefined') {
        const target = (window.console as any)[level] || window.console.log;
        target(...args);
    }
};

/**
 * Специальный метод для стилизованной диагностики Skily
 */
export const skilyDiagnostic = (label: string, value: any) => {
    safeLog('log', `%c${label}: %c${value}`, 'color: #94a3b8;', 'color: #ffffff; font-weight: bold;');
};
