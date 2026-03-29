import { AppKit, Network, TonConnectConnector } from '@ton/appkit';
import { TonConnect } from '@tonconnect/sdk';
import { TonConnectUI } from '@tonconnect/ui';
import { TonCloudStorage } from './ton-cloud-storage';

// Custom storage: Telegram CloudStorage (persistent across Mini App sessions)
const cloudStorage = new TonCloudStorage();

// Get the origin dynamically to avoid manifest mismatch errors on different domains
const origin = typeof window !== 'undefined' ? window.location.origin : 'https://skilyapp.com';

// Low-level TonConnect with custom persistent storage
const tonConnectSDK = new TonConnect({
    manifestUrl: `${origin}/tonconnect-manifest.json`,
    storage: cloudStorage,
});

// TonConnectUI wraps the SDK.
const tonConnectUI = new TonConnectUI({
    connector: tonConnectSDK,
    restoreConnection: true,
    // Mobile optimization for Telegram:
    actionsConfiguration: {
        returnStrategy: 'back', 
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
