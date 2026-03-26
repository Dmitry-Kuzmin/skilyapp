import { AppKit, Network, TonConnectConnector } from '@ton/appkit';
import { TonConnectUI } from '@tonconnect/ui';

// Initialize TonConnectUI directly, allowing it to use its native default storage (localStorage)
// which is robust and standard across all regular TON applications.
const tonConnectUI = new TonConnectUI({
    manifestUrl: 'https://skilyapp.com/tonconnect-manifest.json',
});

// Create AppKit connector using our standard TonConnectUI
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
// Components must await this before deciding whether a wallet is connected.
export const tonConnectionRestored: Promise<boolean> =
    (tonConnectUI.connectionRestored as Promise<boolean> | undefined)
    ?? Promise.resolve(false);

// Synchronous flag — true once restoration has completed.
// Lets useTonReady initialize isReady=true immediately for late-mounted components
// (e.g. TonPaymentModal opened after the wallet was already restored on startup).
export let tonConnectionIsRestored = false;
tonConnectionRestored.finally(() => { tonConnectionIsRestored = true; });

console.log('[TON] connectionRestored type:', typeof tonConnectUI.connectionRestored);
console.log('[TON] wallet right after init:', tonConnectUI.wallet ? 'connected' : 'null');
console.log('[TON] UI connected:', tonConnectUI.connected);

tonConnectionRestored
    .then((restored) => {
        console.log(restored
            ? '[TON] ✅ Wallet connection restored from storage'
            : '[TON] ❌ No previous wallet session found');
        console.log('[TON] wallet after restore:', tonConnectUI.wallet ? JSON.stringify({
            address: tonConnectUI.wallet.account?.address?.slice(0, 20) + '...',
            chain: tonConnectUI.wallet.account?.chain,
        }) : 'null');
        console.log('[TON] UI connected after restore:', tonConnectUI.connected);
    })
    .catch((err) => {
        console.error('[TON] Connection restore FAILED:', err);
    });
