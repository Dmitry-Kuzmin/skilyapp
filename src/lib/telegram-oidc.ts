// Утилиты для входа через Telegram Login SDK
// Документация: https://core.telegram.org/bots/telegram-login
//
// Архитектура (3 раздельных шага для минимальной задержки):
// 1. Скрипт грузится в index.html сразу со страницей (async)
// 2. sdk.init() вызывается когда открывается модалка (preinitTelegramLogin)
// 3. sdk.open() вызывается при клике — мгновенно, popup открывается сразу

const SDK_URL = 'https://oauth.telegram.org/js/telegram-login.js';

let sdkLoadPromise: Promise<void> | null = null;
let resolveCallback: ((idToken: string) => void) | null = null;
let rejectCallback: ((err: Error) => void) | null = null;
let isInitialized = false;

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

function handleAuthResult(data: TelegramAuthData | null): void {
    if (!resolveCallback || !rejectCallback) return;

    if (!data) {
        rejectCallback(new Error('Авторизация отменена пользователем'));
    } else if (data.error) {
        rejectCallback(new Error(data.error));
    } else if (!data.id_token) {
        rejectCallback(new Error('id_token не получен от Telegram'));
    } else {
        resolveCallback(data.id_token);
    }

    resolveCallback = null;
    rejectCallback = null;
}

// Ожидание загрузки SDK (если ещё не загружен)
export function loadTelegramLoginSDK(): Promise<void> {
    if (sdkLoadPromise) return sdkLoadPromise;

    if (getTelegramLogin()) {
        sdkLoadPromise = Promise.resolve();
        return sdkLoadPromise;
    }

    // Проверяем: скрипт уже в DOM (добавлен из index.html)?
    const existingScript = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existingScript) {
        sdkLoadPromise = new Promise((resolve) => {
            const check = () => {
                if (getTelegramLogin()) {
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
        return sdkLoadPromise;
    }

    // Fallback: добавляем скрипт динамически если ещё нет
    sdkLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.onload = () => setTimeout(resolve, 100);
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
 * Шаг 2: Вызывать при открытии модального окна авторизации.
 * Регистрирует callback через sdk.init() — когда пользователь нажмёт кнопку,
 * sdk.open() сработает мгновенно без задержки.
 */
export async function preinitTelegramLogin(clientId: string | number): Promise<void> {
    const numericId = parseClientId(clientId);

    try {
        await loadTelegramLoginSDK();
        const sdk = getTelegramLogin();
        if (!sdk || isInitialized) return;

        sdk.init({ client_id: numericId }, handleAuthResult);
        isInitialized = true;
        console.log('[Telegram OIDC] Pre-initialized with client_id:', numericId);
    } catch (err) {
        console.warn('[Telegram OIDC] Pre-init failed:', err);
    }
}

/**
 * Шаг 3: Вызывать при клике на кнопку Telegram.
 * Если sdk.init() уже был вызван → popup открывается мгновенно через sdk.open().
 * Fallback: sdk.auth() если init не был вызван.
 */
export async function openTelegramLogin(clientId: string | number): Promise<string> {
    const numericId = parseClientId(clientId);

    await loadTelegramLoginSDK();

    const sdk = getTelegramLogin();
    if (!sdk) throw new Error('Telegram Login SDK не доступен после загрузки скрипта');

    return new Promise((resolve, reject) => {
        resolveCallback = resolve;
        rejectCallback = reject;

        if (isInitialized && typeof sdk.open === 'function') {
            // Быстрый путь: SDK уже инициализирован, popup открывается мгновенно
            console.log('[Telegram OIDC] Opening pre-initialized popup via open()');
            sdk.open(handleAuthResult);
        } else {
            // Медленный путь (fallback): init + open за один вызов
            console.log('[Telegram OIDC] Falling back to auth()');
            isInitialized = true;
            sdk.auth({ client_id: numericId }, handleAuthResult);
        }
    });
}
