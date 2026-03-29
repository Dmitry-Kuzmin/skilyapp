import type { IStorage } from '@tonconnect/sdk';

/**
 * CloudStorage adapter for TonConnect that uses Telegram CloudStorage API
 * as primary persistence, with localStorage as fast cache.
 *
 * Why: Telegram Mini Apps can clear localStorage between sessions,
 * but CloudStorage persists across sessions per bot per user.
 *
 * Falls back to localStorage-only if CloudStorage is unavailable.
 */

const TC_PREFIX = 'tc_';

/**
 * Check if Telegram CloudStorage is available and ready.
 * In Mini App, CloudStorage might not be initialized immediately.
 */
const isTelegramCloudAvailable = (): boolean => {
    try {
        const cs = (window as any).Telegram?.WebApp?.CloudStorage;
        // CloudStorage is available if it has the required methods
        return !!(cs && typeof cs.getItem === 'function' && typeof cs.setItem === 'function');
    } catch {
        return false;
    }
};

const getCloudStorage = () => (window as any).Telegram?.WebApp?.CloudStorage;

/**
 * Promisified wrapper around Telegram CloudStorage API
 * CRITICAL: Add timeouts because CloudStorage callbacks might never fire in Mini App
 */
const CLOUD_TIMEOUT = 3000; // 3 second timeout for each operation

const cloudGet = (key: string): Promise<string | null> => {
    return Promise.race([
        new Promise<string | null>((resolve) => {
            try {
                const cs = getCloudStorage();
                if (!cs) {
                    console.log('[TON Storage] CloudStorage not available for get');
                    resolve(null);
                    return;
                }
                cs.getItem(TC_PREFIX + key, (err: any, value: string) => {
                    if (err) {
                        console.warn('[TON Storage] CloudGet error:', err);
                        resolve(null);
                        return;
                    }
                    resolve(value || null);
                });
            } catch (e) {
                console.error('[TON Storage] CloudGet exception:', e);
                resolve(null);
            }
        }),
        // Timeout fallback
        new Promise<string | null>((resolve) => {
            setTimeout(() => {
                console.warn(`[TON Storage] CloudGet timeout after ${CLOUD_TIMEOUT}ms`);
                resolve(null);
            }, CLOUD_TIMEOUT);
        }),
    ]);
};

const cloudSet = (key: string, value: string): Promise<void> => {
    return Promise.race([
        new Promise<void>((resolve) => {
            try {
                const cs = getCloudStorage();
                if (!cs) {
                    console.log('[TON Storage] CloudStorage not available for set');
                    resolve();
                    return;
                }
                cs.setItem(TC_PREFIX + key, value, (err: any) => {
                    if (err) {
                        console.warn('[TON Storage] CloudSet error:', err);
                    }
                    resolve();
                });
            } catch (e) {
                console.error('[TON Storage] CloudSet exception:', e);
                resolve();
            }
        }),
        // Timeout fallback
        new Promise<void>((resolve) => {
            setTimeout(() => {
                console.warn(`[TON Storage] CloudSet timeout after ${CLOUD_TIMEOUT}ms`);
                resolve();
            }, CLOUD_TIMEOUT);
        }),
    ]);
};

const cloudRemove = (key: string): Promise<void> => {
    return Promise.race([
        new Promise<void>((resolve) => {
            try {
                const cs = getCloudStorage();
                if (!cs) {
                    console.log('[TON Storage] CloudStorage not available for remove');
                    resolve();
                    return;
                }
                cs.removeItem(TC_PREFIX + key, (err: any) => {
                    if (err) {
                        console.warn('[TON Storage] CloudRemove error:', err);
                    }
                    resolve();
                });
            } catch (e) {
                console.error('[TON Storage] CloudRemove exception:', e);
                resolve();
            }
        }),
        // Timeout fallback
        new Promise<void>((resolve) => {
            setTimeout(() => {
                console.warn(`[TON Storage] CloudRemove timeout after ${CLOUD_TIMEOUT}ms`);
                resolve();
            }, CLOUD_TIMEOUT);
        }),
    ]);
};

export class TonCloudStorage implements IStorage {
    constructor() {
        // Не проверяем доступность CloudStorage здесь — SDK может быть ещё не готов.
        // Проверка происходит лениво при каждом вызове.
        console.log('[TON Storage] Initialized (lazy cloud detection)');
    }

    private get useCloud(): boolean {
        return isTelegramCloudAvailable();
    }

    async setItem(key: string, value: string): Promise<void> {
        // Always write to localStorage (fast cache)
        try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }

        // Also write to CloudStorage (persistent)
        if (this.useCloud) {
            await cloudSet(key, value);
        }
    }

    async getItem(key: string): Promise<string | null> {
        // Try localStorage first (fast)
        try {
            const local = localStorage.getItem(key);
            if (local !== null) {
                console.log('[TON Storage] Got from localStorage:', key.slice(0, 50));
                return local;
            }
        } catch (e) {
            console.warn('[TON Storage] localStorage blocked:', e);
        }

        // Fallback to CloudStorage (persistent)
        if (this.useCloud) {
            console.log('[TON Storage] Trying CloudStorage for:', key.slice(0, 50));
            const cloud = await cloudGet(key);
            if (cloud !== null) {
                // Restore to localStorage for next read
                try { localStorage.setItem(key, cloud); } catch {}
                console.log('[TON Storage] ✅ Restored from CloudStorage:', key.slice(0, 50));
                return cloud;
            }
        } else {
            console.warn('[TON Storage] CloudStorage unavailable, no fallback for:', key.slice(0, 50));
        }

        console.log('[TON Storage] ❌ Nothing found:', key.slice(0, 50));
        return null;
    }

    async removeItem(key: string): Promise<void> {
        try { localStorage.removeItem(key); } catch {}

        if (this.useCloud) {
            await cloudRemove(key);
        }
    }
}
