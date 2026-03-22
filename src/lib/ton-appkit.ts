import { AppKit, Network, TonConnectConnector } from '@ton/appkit';

// Инициализация AppKit согласно официальной документации:
// https://docs.ton.org/ecosystem/appkit/init
const tonConnector = new TonConnectConnector({
    tonConnectOptions: {
        manifestUrl: 'https://skilyapp.com/tonconnect-manifest.json',
        // Persist connection across sessions
        restoreConnection: true,
    },
});

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

// Restore TON wallet connection from localStorage on app start.
// TonConnectUI automatically restores connection — `connectionRestored`
// is a Promise that resolves when the process completes.
// We just need to ensure it's awaited / logged for debugging.
try {
    const tcUI = tonConnector.tonConnectUI;
    if (tcUI && tcUI.connectionRestored) {
        tcUI.connectionRestored.then((restored: boolean) => {
            if (restored) {
                console.log('[TON] Wallet connection restored from previous session');
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
