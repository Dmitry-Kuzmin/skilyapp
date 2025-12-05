/**
 * SSR-safe utilities for working with browser APIs
 * These functions are safe to use during SSG build (Node.js environment)
 */

/**
 * Check if code is running in browser (not in Node.js during SSG build)
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Get window object safely (returns null in Node.js)
 */
export const getWindow = (): Window | null => (isBrowser ? window : null);

/**
 * Get document object safely (returns null in Node.js)
 */
export const getDocument = (): Document | null => (isBrowser ? document : null);

/**
 * Get Telegram WebApp API safely (returns null in Node.js)
 */
export const getTelegramWebApp = () => 
  isBrowser ? (window as any).Telegram?.WebApp : null;

/**
 * Get localStorage safely (returns null in Node.js)
 */
export const getLocalStorage = (): Storage | null => 
  isBrowser ? localStorage : null;

/**
 * Get sessionStorage safely (returns null in Node.js)
 */
export const getSessionStorage = (): Storage | null => 
  isBrowser ? sessionStorage : null;

/**
 * Get navigator safely (returns null in Node.js)
 */
export const getNavigator = (): Navigator | null => 
  isBrowser ? navigator : null;

/**
 * Safe window.location access
 */
export const getLocation = (): Location | null => 
  isBrowser ? window.location : null;

/**
 * Safe window.history access
 */
export const getHistory = (): History | null => 
  isBrowser ? window.history : null;

