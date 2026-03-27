import { AppKit, Network, TonConnectConnector } from '@ton/appkit';
import { TonConnect } from '@tonconnect/sdk';
import { TonConnectUI } from '@tonconnect/ui';
import { TonCloudStorage } from './ton-cloud-storage';

// Custom storage: Telegram CloudStorage (persistent across Mini App sessions)
// + localStorage as fast local cache.
const cloudStorage = new TonCloudStorage();

// Low-level TonConnect with custom persistent storage
const tonConnectSDK = new TonConnect({
    manifestUrl: 'https://skilyapp.com/tonconnect-manifest.json',
    storage: cloudStorage,
});

// TonConnectUI wraps the SDK.
// IMPORTANT: do NOT pass restoreConnection: true here —
// AppKit's TonConnectConnector.initialize() already calls
// connector.restoreConnection() internally.
// Double-calling it caused a race condition that dropped restored sessions.
const tonConnectUI = new TonConnectUI({
    connector: tonConnectSDK,
});

export { tonConnectUI };

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

try {
    if (tonConnectUI.connectionRestored) {
        tonConnectUI.connectionRestored
            .then((restored: boolean) => {
                console.log(restored
                    ? '[TON] ✅ Wallet connection restored'
                    : '[TON] No previous wallet session found');
            })
            .catch(() => {});
    }
} catch {}
