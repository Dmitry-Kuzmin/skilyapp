// Утилиты для Telegram OIDC Authorization Code Flow + PKCE
const PKCE_STATE_KEY = 'tg_oidc_pkce';

interface PKCEState {
    verifier: string;
    state: string;
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

    const url = new URL('https://oauth.telegram.org/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    // КРИТИЧНО: Telegram OIDC может быть капризным к '+' вместо '%20' в scope
    const finalUrl = url.toString().replace(/\+/g, '%20');

    console.log('[Telegram OIDC] Generated Auth URL:', finalUrl);

    return finalUrl;
}

export async function initiateTelegramOIDC(redirectUri: string): Promise<void> {
    const { verifier, challenge } = await generatePKCE();
    const state = generateState();

    savePKCEState({ verifier, state });

    const url = buildTelegramOAuthUrl(challenge, state, redirectUri);
    window.location.href = url;
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
