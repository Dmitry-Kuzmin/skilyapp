/**
 * Captures native console methods BEFORE any global suppression in main.tsx.
 * Import this module as the very first import in main.tsx so the capture
 * happens before console.log/warn are overridden.
 *
 * Used by safeLog to print privileged messages (easter egg, diagnostics)
 * even in production where regular console.log is suppressed.
 */
export const nativeLog   = console.log.bind(console);
export const nativeWarn  = console.warn.bind(console);
export const nativeError = console.error.bind(console);
