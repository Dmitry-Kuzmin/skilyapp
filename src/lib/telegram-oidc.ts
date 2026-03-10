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
 * Предварительно загружает SDK, чтобы при клике пользователя не было задержки (и блокировки попапа)
 */
export function preloadTelegramSDK(): Promise<void> {
    return loadTelegramLoginSDK();
}

/**
 * Открывает официальный попап Telegram Login SDK и возвращает id_token.
 * Не требует redirect_uri — всё обрабатывается внутри SDK.
 */
export async function openTelegramLogin(clientId: string | number): Promise<string> {
    console.log('[Telegram OIDC] Starting auth flow with clientId:', clientId);
    
    await loadTelegramLoginSDK();

    const sdk = getTelegramLogin();
    if (!sdk) {
        console.error('[Telegram OIDC] SDK not found in window.Telegram.Login');
        throw new Error('Telegram Login SDK не инициализирован');
    }

    // Очищаем от кавычек на случай если env-переменная пришла с ними
    const rawId = clientId.toString().replace(/['"]/g, '').trim();
    const numericId = parseInt(rawId, 10);

    if (isNaN(numericId) || numericId === 0) {
        console.error('[Telegram OIDC] Invalid numeric clientId:', rawId, 'Original:', clientId);
        throw new Error(`Невалидный VITE_TELEGRAM_BOT_ID: "${rawId}"`);
    }

    return new Promise((resolve, reject) => {
        try {
            // ВАЖНО: Telegram.Login.auth может требовать bot_id или client_id в зависимости от версии
            // Мы передаем оба в строковом формате для максимальной совместимости
            const options = {
                client_id: rawId,
                bot_id: rawId,
                request_access: ['write']
            };
            
            console.log('[Telegram OIDC] Calling sdk.auth with options:', JSON.stringify(options));

            sdk.auth(
                options as any,
                (data: { id_token?: string; user?: object; error?: string } | null) => {
                    console.log('[Telegram OIDC] SDK response:', data);
                    
                    if (!data) {
                        reject(new Error('Авторизация отменена (no data)'));
                        return;
                    }
                    
                    if (data.error) {
                        console.error('[Telegram OIDC] SDK error:', data.error);
                        reject(new Error(data.error));
                        return;
                    }
                    
                    if (!data.id_token) {
                        console.error('[Telegram OIDC] Missing id_token in response');
                        reject(new Error('id_token не получен от Telegram'));
                        return;
                    }
                    
                    resolve(data.id_token);
                },
            );
        } catch (err: any) {
            console.error('[Telegram OIDC] Synchronous error calling sdk.auth:', err);
            reject(new Error(`Ошибка запуска SDK: ${err.message}`));
        }
    });
}
