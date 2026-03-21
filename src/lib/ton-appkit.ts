import { AppKit, Network, TonConnectConnector } from '@ton/appkit';

// Инициализация AppKit согласно официальной документации:
// https://docs.ton.org/ecosystem/appkit/init
export const appKit = new AppKit({
    networks: {
        [Network.mainnet().chainId]: {
            apiClient: {
                // Официальный API клиент TonCenter (per docs.ton.org)
                url: 'https://toncenter.com',
                // Опциональный ключ для увеличения RPS лимитов
                // Получить: https://t.me/toncenter
                ...(import.meta.env.VITE_TONCENTER_API_KEY
                    ? { key: import.meta.env.VITE_TONCENTER_API_KEY }
                    : {}),
            },
        },
    },
    connectors: [
        new TonConnectConnector({
            tonConnectOptions: {
                manifestUrl: 'https://sdadim.com/tonconnect-manifest.json',
            },
        }),
    ],
});
