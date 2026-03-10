// Утилиты для Telegram OIDC Authorization Code Flow + PKCE + Popup
const PKCE_STATE_KEY = 'tg_oidc_pkce';
const POPUP_CHANNEL = 'telegram-oidc-callback';

interface PKCEState {
    verifier: string;
    state: string;
}

export interface OIDCCallbackPayload {
    code: string;
    state: string;
    verifier: string;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const array = crypto.getRandomValues(new Uint8Array(64));
    const verifier = base64UrlEncode(array.buffer);
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = base64UrlEncode(hashBuffer);
    return { verifier, challenge };
}

function generateState(): string {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export function buildTelegramOAuthUrl(challenge: string, state: string, redirectUri: string): string {
    const rawClientId = import.meta.env.VITE_TELEGRAM_BOT_ID;
    if (!rawClientId) throw new Error('VITE_TELEGRAM_BOT_ID not set');
    if (!redirectUri) throw new Error('redirectUri is required');

    const clientId = rawClientId.toString().replace(/['"]/g, '').trim();

    // Строим URL строго по документации Telegram OIDC Manual Flow
    // redirect_uri не кодируем через searchParams — Telegram может быть
    // чувствителен к двойному кодированию
    const parts = [
        `client_id=${encodeURIComponent(clientId)}`,
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
        `response_type=code`,
        `scope=openid%20profile`,
        `state=${encodeURIComponent(state)}`,
        `code_challenge=${encodeURIComponent(challenge)}`,
        `code_challenge_method=S256`,
    ];

    const finalUrl = `https://oauth.telegram.org/auth?${parts.join('&')}`;
    console.log('[Telegram OIDC] Auth URL:', finalUrl);
    console.log('[Telegram OIDC] Decoded redirect_uri:', redirectUri);
    console.log('[Telegram OIDC] Client ID:', clientId);

    return finalUrl;
}

/**
 * Открываем авторизацию в POPUP окне.
 * После успеха popup делает postMessage и закрывается.
 * Возвращает Promise с данными callback (code + state + verifier).
 */
export async function openTelegramOIDCPopup(redirectUri: string): Promise<OIDCCallbackPayload> {
    const { verifier, challenge } = await generatePKCE();
    const state = generateState();

    savePKCEState({ verifier, state });

    const url = buildTelegramOAuthUrl(challenge, state, redirectUri);

    const popup = window.open(
        url,
        POPUP_CHANNEL,
        'width=480,height=640,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no',
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        throw new Error('Popup заблокирован браузером. Разрешите всплывающие окна для этого сайта.');
    }

    return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== 'telegram-oidc-success') return;

            window.removeEventListener('message', handleMessage);
            clearInterval(pollTimer);

            const { code, state: callbackState } = event.data as { type: string; code: string; state: string };
            const pkce = loadPKCEState();
            clearPKCEState();

            if (!pkce || pkce.state !== callbackState) {
                reject(new Error('State mismatch — возможная CSRF атака'));
                return;
            }

            resolve({ code, state: callbackState, verifier: pkce.verifier });
        };

        window.addEventListener('message', handleMessage);

        // Следим за тем, что popup не закрыл пользователь вручную
        const pollTimer = setInterval(() => {
            if (popup.closed) {
                clearInterval(pollTimer);
                window.removeEventListener('message', handleMessage);
                clearPKCEState();
                reject(new Error('Окно авторизации было закрыто'));
            }
        }, 500);

        // Таймаут 5 минут
        setTimeout(() => {
            clearInterval(pollTimer);
            window.removeEventListener('message', handleMessage);
            if (!popup.closed) popup.close();
            clearPKCEState();
            reject(new Error('Время авторизации истекло'));
        }, 5 * 60 * 1000);
    });
}

export function savePKCEState(pkce: PKCEState): void {
    sessionStorage.setItem(PKCE_STATE_KEY, JSON.stringify(pkce));
}

export function loadPKCEState(): PKCEState | null {
    const raw = sessionStorage.getItem(PKCE_STATE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as PKCEState;
    } catch {
        return null;
    }
}

export function clearPKCEState(): void {
    sessionStorage.removeItem(PKCE_STATE_KEY);
}
