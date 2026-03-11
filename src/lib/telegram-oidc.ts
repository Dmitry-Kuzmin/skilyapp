// Утилиты для входа через Telegram Login SDK
// Документация: https://oauth.telegram.org

const SDK_URL = 'https://oauth.telegram.org/js/telegram-login.js';

let sdkLoadPromise: Promise<void> | null = null;

type TelegramAuthData = {
    id_token?: string;
    user?: object;
    error?: string;
};

type InitOptions = {
    client_id: number;
    nonce?: string;
    request_access?: ('phone' | 'write')[];
    lang?: string;
};

type TelegramLoginSDK = {
    init: (options: InitOptions, callback: (data: TelegramAuthData | null) => void) => void;
    open: (callback?: (data: TelegramAuthData | null) => void) => void;
    auth: (options: InitOptions, callback: (data: TelegramAuthData | null) => void) => void;
};

function getTelegramLogin(): TelegramLoginSDK | undefined {
    return (window as any).Telegram?.Login as TelegramLoginSDK | undefined;
}

export function loadTelegramLoginSDK(): Promise<void> {
    if (sdkLoadPromise) return sdkLoadPromise;

    if (getTelegramLogin()) {
        sdkLoadPromise = Promise.resolve();
        return sdkLoadPromise;
    }

    sdkLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.onload = () => setTimeout(resolve, 200);
        script.onerror = () => {
            sdkLoadPromise = null;
            reject(new Error('Не удалось загрузить Telegram Login SDK'));
        };
        document.head.appendChild(script);
    });

    return sdkLoadPromise;
}

function parseClientId(clientId: string | number): number {
    const rawId = clientId.toString().replace(/['"\s]/g, '');

    if (!rawId || rawId === 'undefined' || rawId === 'null') {
        throw new Error(
            'VITE_TELEGRAM_BOT_ID не задан. ' +
            'Добавьте переменную в Vercel Dashboard → Settings → Environment Variables.',
        );
    }

    const numericId = parseInt(rawId, 10);

    if (isNaN(numericId) || numericId <= 0) {
        throw new Error(`Невалидный VITE_TELEGRAM_BOT_ID: "${rawId}" (должно быть числовым ID бота)`);
    }

    return numericId;
}

/**
 * Открывает официальный попап Telegram Login SDK и возвращает id_token.
 * Использует init() + open() согласно новой документации Telegram OAuth.
 */
export async function openTelegramLogin(clientId: string | number): Promise<string> {
    const numericId = parseClientId(clientId);

    await loadTelegramLoginSDK();

    const sdk = getTelegramLogin();
    if (!sdk) throw new Error('Telegram Login SDK не доступен после загрузки скрипта');

    console.log('[Telegram OIDC] SDK loaded, client_id:', numericId);

    return new Promise((resolve, reject) => {
        const handleResult = (data: TelegramAuthData | null) => {
            if (!data) {
                reject(new Error('Авторизация отменена пользователем'));
                return;
            }
            if (data.error) {
                reject(new Error(data.error));
                return;
            }
            if (!data.id_token) {
                reject(new Error('id_token не получен от Telegram'));
                return;
            }
            resolve(data.id_token);
        };

        if (typeof sdk.init === 'function' && typeof sdk.open === 'function') {
            console.log('[Telegram OIDC] Using init() + open()');
            sdk.init({ client_id: numericId }, handleResult);
            sdk.open();
        } else if (typeof sdk.auth === 'function') {
            console.log('[Telegram OIDC] Using auth() directly');
            sdk.auth({ client_id: numericId }, handleResult);
        } else {
            reject(new Error('Telegram Login SDK: нет доступных методов (init/open/auth)'));
        }
    });
}
