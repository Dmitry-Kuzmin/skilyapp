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
const isTelegramCloudAvailable = (): boolean => {
    try {
        return !!(window as any).Telegram?.WebApp?.CloudStorage;
    } catch {
        return false;
    }
};

const getCloudStorage = () => (window as any).Telegram?.WebApp?.CloudStorage;

/**
 * Promisified wrapper around Telegram CloudStorage API
 */
const cloudGet = (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
        try {
            const cs = getCloudStorage();
            if (!cs) { resolve(null); return; }
            cs.getItem(TC_PREFIX + key, (err: any, value: string) => {
                if (err) { resolve(null); return; }
                resolve(value || null);
            });
        } catch {
            resolve(null);
        }
    });
};

const cloudSet = (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
        try {
            const cs = getCloudStorage();
            if (!cs) { resolve(); return; }
            cs.setItem(TC_PREFIX + key, value, () => resolve());
        } catch {
            resolve();
        }
    });
};

const cloudRemove = (key: string): Promise<void> => {
    return new Promise((resolve) => {
        try {
            const cs = getCloudStorage();
            if (!cs) { resolve(); return; }
            cs.removeItem(TC_PREFIX + key, () => resolve());
        } catch {
            resolve();
        }
    });
};

export class TonCloudStorage implements IStorage {
    private useCloud: boolean;

    constructor() {
        this.useCloud = isTelegramCloudAvailable();
        if (this.useCloud) {
            console.log('[TON Storage] Using Telegram CloudStorage (persistent across sessions)');
        } else {
            console.log('[TON Storage] Telegram CloudStorage not available, using localStorage only');
        }
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
            if (local !== null) return local;
        } catch { /* blocked */ }

        // Fallback to CloudStorage (persistent)
        if (this.useCloud) {
            const cloud = await cloudGet(key);
            if (cloud !== null) {
                // Restore to localStorage for next read
                try { localStorage.setItem(key, cloud); } catch {}
                console.log('[TON Storage] Restored from CloudStorage:', key.slice(0, 30));
                return cloud;
            }
        }

        return null;
    }

    async removeItem(key: string): Promise<void> {
        try { localStorage.removeItem(key); } catch {}

        if (this.useCloud) {
            await cloudRemove(key);
        }
    }
}
