import { AppKit, Network, TonConnectConnector } from '@ton/appkit';
import { TonConnectUI } from '@tonconnect/ui';

// Standard TonConnectUI initialization — uses native localStorage.
// No custom storage needed: TonConnect SDK stores session keypairs in localStorage
// out of the box, and restoreConnection silently reconnects the bridge on load.
const tonConnectUI = new TonConnectUI({
    manifestUrl: 'https://skilyapp.com/tonconnect-manifest.json',
});

// Create AppKit connector using our TonConnectUI
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

// Exported promise — resolves to true/false once restoration completes.
// Wraps SDK promise with a 5s timeout so UI never hangs on slow bridge.
const sdkRestored = (tonConnectUI.connectionRestored as Promise<boolean> | undefined)
    ?? Promise.resolve(false);

export const tonConnectionRestored: Promise<boolean> = Promise.race([
    sdkRestored,
    new Promise<boolean>((resolve) => setTimeout(() => {
        console.warn('[TON] Restoration timed out after 5s — treating as no session');
        resolve(false);
    }, 5000)),
]);

// Synchronous flag — true once restoration has completed.
export let tonConnectionIsRestored = false;
tonConnectionRestored.finally(() => { tonConnectionIsRestored = true; });

tonConnectionRestored
    .then((restored) => {
        console.log(restored
            ? '[TON] ✅ Session restored'
            : '[TON] No previous session');
    })
    .catch((err) => {
        console.error('[TON] Restore failed:', err);
    });
