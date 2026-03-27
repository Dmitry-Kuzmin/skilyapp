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

// Restoration state tracking
let tonConnectionIsRestored = false;
const tonConnectionRestored = tonConnectUI.connectionRestored
    ? tonConnectUI.connectionRestored
        .then((restored: boolean) => {
            tonConnectionIsRestored = true;
            console.log(restored
                ? '[TON] ✅ Wallet connection restored successfully'
                : '[TON] No previous wallet session found');
            return restored;
        })
        .catch((err) => {
            tonConnectionIsRestored = true;
            console.error('[TON] Restore connection failed:', err);
            return false;
        })
    : Promise.resolve(false);

export { tonConnectionRestored, tonConnectionIsRestored };

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
