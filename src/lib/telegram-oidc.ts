// Утилиты для входа через Telegram Login SDK
// Документация: https://core.telegram.org/widgets/login

const SDK_URL = 'https://oauth.telegram.org/js/telegram-login.js?73';
let sdkLoadPromise: Promise<void> | null = null;

type TelegramLoginSDK = {
    auth: (
        options: { client_id: number; nonce?: string; request_access?: string[]; lang?: string },
        callback: (data: { id_token?: string; user?: object; error?: string } | null) => void,
    ) => void;
};

function getTelegramLogin(): TelegramLoginSDK | undefined {
    return (window as any).Telegram?.Login as TelegramLoginSDK | undefined;
}


function loadTelegramLoginSDK(): Promise<void> {
    if (sdkLoadPromise) return sdkLoadPromise;

    if (getTelegramLogin()) {
        sdkLoadPromise = Promise.resolve();
        return sdkLoadPromise;
    }

    sdkLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.onload = () => {
            // Небольшая задержка для инициализации SDK
            setTimeout(resolve, 150);
        };
        script.onerror = () => {
            sdkLoadPromise = null;
            reject(new Error('Не удалось загрузить Telegram Login SDK'));
        };
        document.head.appendChild(script);
    });

    return sdkLoadPromise;
}

/**
 * Открывает официальный попап Telegram Login SDK и возвращает id_token.
 * Не требует redirect_uri — всё обрабатывается внутри SDK.
 */
export async function openTelegramLogin(clientId: string | number): Promise<string> {
    await loadTelegramLoginSDK();

    const sdk = getTelegramLogin();
    if (!sdk) throw new Error('Telegram Login SDK не инициализирован');

    return new Promise((resolve, reject) => {
        sdk.auth(
            { client_id: Number(clientId) },
            (data: { id_token?: string; user?: object; error?: string } | null) => {
                if (!data || data.error) {
                    reject(new Error(data?.error ?? 'Авторизация отменена'));
                    return;
                }
                if (!data.id_token) {
                    reject(new Error('id_token не получен от Telegram'));
                    return;
                }
                resolve(data.id_token);
            },
        );
    });
}
