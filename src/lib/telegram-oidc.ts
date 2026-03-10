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
    const verifier = base64UrlEncode(array);
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = base64UrlEncode(hashBuffer);
    return { verifier, challenge };
}

function generateState(): string {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export function buildTelegramOAuthUrl(challenge: string, state: string, redirectUri: string): string {
    const clientId = import.meta.env.VITE_TELEGRAM_BOT_ID;
    if (!clientId) throw new Error('VITE_TELEGRAM_BOT_ID not set');

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });

    return `https://oauth.telegram.org/auth?${params.toString()}`;
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
