import { AppKit, Network, TonConnectConnector } from '@ton/appkit';
import { TonConnect } from '@tonconnect/sdk';
import { TonConnectUI } from '@tonconnect/ui';
import { TonCloudStorage } from './ton-cloud-storage';

// ROOT FIX: TonConnect stores session in localStorage,
// but Telegram Mini Apps can clear localStorage between sessions.
// Solution: use Telegram CloudStorage (persistent per bot/user) as backend,
// with localStorage as fast cache layer.
const cloudStorage = new TonCloudStorage();

// Create low-level TonConnect SDK with custom storage
const tonConnectSDK = new TonConnect({
    manifestUrl: 'https://skilyapp.com/tonconnect-manifest.json',
    storage: cloudStorage,
});

// Create TonConnectUI with custom connector (inherits CloudStorage)
const tonConnectUI = new TonConnectUI({
    connector: tonConnectSDK,
    restoreConnection: true,
});

// Create AppKit connector using our pre-configured TonConnectUI
const tonConnector = new TonConnectConnector({
    tonConnectUI: tonConnectUI,
});

// Export tonConnectUI for direct modal/disconnect control
export { tonConnectUI };

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

// Log connection restore result for debugging
try {
    if (tonConnectUI.connectionRestored) {
        tonConnectUI.connectionRestored.then((restored: boolean) => {
            if (restored) {
                console.log('[TON] ✅ Wallet connection restored from CloudStorage');
            } else {
                console.log('[TON] No previous wallet session found');
            }
        }).catch(() => {
            console.log('[TON] Connection restore skipped (no session)');
        });
    }
} catch {
    // First time — no connection to restore
}
