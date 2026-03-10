// telegram-oidc-auth: Authorization Code Flow + PKCE
// Обменивает Telegram OIDC code на полноценную Supabase сессию.
// Совместим с telegram-auth-v2 — использует тот же email-формат tg_{id}@telegram.auth.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.15.4/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TG_CLIENT_ID = Deno.env.get('TELEGRAM_CLIENT_ID')!;
const TG_CLIENT_SECRET = Deno.env.get('TELEGRAM_CLIENT_SECRET')!;
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

const TELEGRAM_TOKEN_URL = 'https://oauth.telegram.org/token';
const TELEGRAM_JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const TELEGRAM_ISSUER = 'https://oauth.telegram.org';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramIdTokenClaims {
    sub: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
    name?: string;
    preferred_username?: string;
    picture?: string;
}

async function exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<{ idToken: string }> {
    const credentials = btoa(`${TG_CLIENT_ID}:${TG_CLIENT_SECRET}`);

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: TG_CLIENT_ID,
        code_verifier: codeVerifier,
    });

    const response = await fetch(TELEGRAM_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Telegram token exchange failed (${response.status}): ${errText}`);
    }

    const data = await response.json();

    if (!data.id_token) {
        throw new Error('No id_token in Telegram response');
    }

    return { idToken: data.id_token };
}

async function verifyAndDecodeIdToken(idToken: string): Promise<TelegramIdTokenClaims> {
    const JWKS = jose.createRemoteJWKSet(new URL(TELEGRAM_JWKS_URL));

    const { payload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: TELEGRAM_ISSUER,
        audience: TG_CLIENT_ID,
    });

    if (!payload.sub) {
        throw new Error('id_token missing sub claim');
    }

    return payload as TelegramIdTokenClaims;
}

async function getOrCreateSupabaseSession(
    supabaseAdmin: ReturnType<typeof createClient>,
    telegramId: string,
    claims: TelegramIdTokenClaims,
): Promise<{ session: { access_token: string; refresh_token: string }; profileId: string }> {
    const email = `tg_${telegramId}@telegram.auth`;
    // Пароль детерминирован по bot token — совместимо с telegram-auth-v2
    const password = `tg_secure_${telegramId}_${BOT_TOKEN.substring(0, 10)}`;

    const userMeta = {
        telegram_id: telegramId,
        full_name: claims.name ?? '',
        avatar_url: claims.picture ?? '',
        is_telegram_user: true,
    };

    let userId: string | undefined;

    // Попытка создать — если уже есть, получаем ошибку 422
    const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMeta,
    });

    if (createError) {
        if (createError.status === 422 || createError.message.includes('already been registered')) {
            // Пользователь существует — ищем по telegram_id в profiles
            const { data: prof } = await supabaseAdmin
                .from('profiles')
                .select('user_id')
                .eq('telegram_id', telegramId)
                .maybeSingle();

            if (prof?.user_id) {
                userId = prof.user_id;
                // Обновляем пароль (он мог измениться при ротации bot token)
                await supabaseAdmin.auth.admin.updateUserById(userId, { password, user_metadata: userMeta });
            } else {
                // Ищем по email как fallback
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1, page: 1 } as any);
                const found = users?.find(u => u.email === email);
                if (found) {
                    userId = found.id;
                    await supabaseAdmin.auth.admin.updateUserById(userId, { password, user_metadata: userMeta });
                } else {
                    throw new Error(`Cannot find existing user for telegram_id=${telegramId}`);
                }
            }
        } else {
            throw createError;
        }
    } else {
        userId = createdData?.user?.id;
    }

    if (!userId) {
        throw new Error('Failed to resolve userId');
    }

    // Получаем сессию через signInWithPassword
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    // Синхронизируем профиль
    const profilePayload: Record<string, unknown> = {
        user_id: userId,
        telegram_id: telegramId,
        first_name: claims.name?.split(' ')[0] ?? '',
        last_name: claims.name?.split(' ').slice(1).join(' ') || null,
        username: claims.preferred_username ?? null,
        photo_url: claims.picture ?? null,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        platform: 'web_oidc',
        is_premium: false,
    };

    const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id')
        .eq('telegram_id', telegramId)
        .maybeSingle();

    let profileId: string;

    if (prof) {
        const { data: updated, error: upErr } = await supabaseAdmin
            .from('profiles')
            .update(profilePayload)
            .eq('id', prof.id)
            .select('id')
            .single();
        if (upErr) throw upErr;
        profileId = updated.id;
    } else {
        profilePayload.settings = { theme: 'light', language: 'ru', notifications: true };
        const { data: inserted, error: insErr } = await supabaseAdmin
            .from('profiles')
            .insert(profilePayload)
            .select('id')
            .single();
        if (insErr) throw insErr;
        profileId = inserted.id;
    }

    return {
        session: {
            access_token: sessionData.session!.access_token,
            refresh_token: sessionData.session!.refresh_token,
        },
        profileId,
    };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { code, code_verifier, redirect_uri } = await req.json();

        if (!code || !code_verifier || !redirect_uri) {
            return new Response(
                JSON.stringify({ error: 'Параметры code, code_verifier, redirect_uri обязательны' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // 1. Обмен code → id_token
        const { idToken } = await exchangeCodeForTokens(code, code_verifier, redirect_uri);

        // 2. Верификация и декодирование id_token
        const claims = await verifyAndDecodeIdToken(idToken);
        const telegramId = claims.sub;

        console.log(`[telegram-oidc-auth] Verified TG user: ${telegramId} (${claims.preferred_username ?? 'no username'})`);

        // 3. Создаём/находим пользователя и получаем сессию
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { session, profileId } = await getOrCreateSupabaseSession(supabaseAdmin, telegramId, claims);

        console.log(`[telegram-oidc-auth] Success: profile ${profileId}`);

        return new Response(
            JSON.stringify({ session, profile_id: profileId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        const error = err as Error;
        console.error('[telegram-oidc-auth] ERROR:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
