import { AppKit, Network, TonConnectConnector } from '@ton/appkit';
import { TonConnect } from '@tonconnect/sdk';
import { TonConnectUI } from '@tonconnect/ui';
import { TonCloudStorage } from './ton-cloud-storage';
import { TonSupabaseStorage } from './ton-supabase-storage';

// Ensure Telegram.WebApp is ready before initializing
const initializeTelegramApp = (): void => {
    try {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webApp = (window as any).Telegram.WebApp;
            if (typeof webApp.ready === 'function') {
                webApp.ready();
                console.log('[TON] Telegram.WebApp.ready() called');
            }
        }
    } catch (e) {
        console.warn('[TON] Failed to initialize Telegram.WebApp:', e);
    }
};

// Initialize Telegram app immediately
initializeTelegramApp();

// Detect if in Mini App
const isInMiniApp = (): boolean => {
    try {
        return !!(window as any).Telegram?.WebApp?.platform;
    } catch {
        return false;
    }
};

// Choose storage backend based on environment
// Mini App: Use Supabase storage (persists across sessions)
// Web: Use Telegram CloudStorage (falls back to localStorage)
const getStorageBackend = () => {
    if (isInMiniApp()) {
        console.log('[TON] Using Supabase storage for Mini App');
        return new TonSupabaseStorage();
    } else {
        console.log('[TON] Using Telegram CloudStorage for web');
        return new TonCloudStorage();
    }
};

const tonStorage = getStorageBackend();

// КРИТИЧНО для Web версии: очищаем bridge соединение из localStorage
// При каждой новой сессии (перезагрузке) bridge на серверах TON Connect уже закрыт
// Восстановленное соединение будет мертвым, вызывая "Transaction was not sent"
// Решение: начинать каждую новую сессию со СВЕЖЕГО соединения
if (!isInMiniApp()) {
    try {
        // Ключи bridge соединения которые должны быть свежими для каждой сессии
        const bridgeKeys = [
            'ton-connect-storage_bridge-connection',
            'ton-connect-storage_http-bridge-gateway::https://w', // может быть разным
            'tc_bridge-connection',
            'tc_http-bridge-gateway'
        ];

        let cleanedAny = false;
        for (const key of bridgeKeys) {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleanedAny = true;
            }
        }

        if (cleanedAny) {
            console.log('[TON] ✅ Cleaned stale bridge data from Web localStorage - starting with fresh connection');
        }
    } catch (e) {
        console.warn('[TON] Could not clean bridge storage:', e);
    }
}

// Get the origin dynamically to avoid manifest mismatch errors on different domains
const origin = typeof window !== 'undefined' ? window.location.origin : 'https://skilyapp.com';

// Low-level TonConnect with custom persistent storage
const tonConnectSDK = new TonConnect({
    manifestUrl: `${origin}/tonconnect-manifest.json`,
    storage: tonStorage,
});

// TonConnectUI wraps the SDK.
const tonConnectUI = new TonConnectUI({
    connector: tonConnectSDK,
    restoreConnection: true,
    enableAndroid: true,
    // Mobile optimization for Telegram:
    // Use 'none' in Mini App to avoid navigation issues, 'back' in regular mobile
    actionsConfiguration: {
        returnStrategy: isInMiniApp() ? 'none' : 'back',
        skipRedirectToWallet: 'always',
    }
});

export { tonConnectUI };

// Restoration state tracking with timeout for Telegram Mini App
let tonConnectionIsRestored = false;

/**
 * Creates a promise that races connectionRestored against a timeout.
 * In Telegram Mini App, CloudStorage may not be available immediately,
 * causing connectionRestored to hang. This ensures we don't wait forever.
 */
function createRestorationPromise(): Promise<boolean> {
    const isMinApp = (): boolean => {
        try {
            return !!(window as any).Telegram?.WebApp?.platform;
        } catch {
            return false;
        }
    };

    // Timeout is longer (8s) in Mini App due to CloudStorage async operations,
    // shorter (2s) in regular web where localStorage is instant
    const timeoutMs = isMinApp() ? 8000 : 2000;

    const restorationPromise = tonConnectUI.connectionRestored || Promise.resolve(false);

    const timeoutPromise = new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
            console.warn(`[TON] Restoration timeout after ${timeoutMs}ms (Mini App: ${isMinApp()})`);
            resolve(false);
        }, timeoutMs);

        restorationPromise
            .then((restored) => {
                clearTimeout(timer);
                return restored;
            })
            .catch((err) => {
                clearTimeout(timer);
                console.error('[TON] Restore connection error:', err);
                return false;
            });
    });

    return Promise.race([restorationPromise, timeoutPromise])
        .then((restored: boolean) => {
            tonConnectionIsRestored = true;
            if (restored) {
                console.log('[TON] ✅ Wallet connection restored successfully');
            } else {
                console.log('[TON] ℹ️ No previous wallet session found');
            }
            return restored;
        })
        .catch((err) => {
            tonConnectionIsRestored = true;
            console.error('[TON] Restore error (unhandled):', err);
            return false;
        });
}

const tonConnectionRestored = createRestorationPromise();

export { tonConnectionRestored, tonConnectionIsRestored };

// Dispatch tonconnect-modal event so ResponsiveModal knows to set modal={false}
// (prevents Vaul/Radix overlay from swallowing clicks on TonConnect popup)
if (tonConnectUI.onModalStateChange) {
    tonConnectUI.onModalStateChange((state: { status: string }) => {
        document.dispatchEvent(new CustomEvent('tonconnect-modal', {
            detail: { open: state.status !== 'closed' }
        }));
    });
}

// AppKit integration (keeps existing parts working)
const tonConnector = new TonConnectConnector({ tonConnectUI });
export const appKit = new AppKit({
    networks: {
        [Network.mainnet().chainId]: {
            apiClient: {
                url: 'https://toncenter.com',
                ...(import.meta.env.VITE_TONCENTER_API_KEY
                    ? { key: import.meta.env.VITE_TONCENTER_API_KEY }
                    : {}),
            },
        },
    },
    connectors: [tonConnector],
});
