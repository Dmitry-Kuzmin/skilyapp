// telegram-oidc-auth: вход через Telegram Login SDK (Web OIDC)
// Получает id_token от Telegram.Login.auth(), верифицирует его и возвращает
// сессию Supabase для существующего пользователя или создаёт нового.
// Логика слияния аккаунтов: использует тот же email-формат §tg_{id}@telegram.auth§
// что и telegram-auth-v2, гарантируя отсутствие дублей.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.15.4/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TG_CLIENT_ID = Deno.env.get('TELEGRAM_CLIENT_ID')!;
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

const TELEGRAM_JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const TELEGRAM_ISSUER = 'https://oauth.telegram.org';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramClaims {
    sub: string;
    id?: number;           // реальный Telegram user ID (совпадает с initData)
    name?: string;
    preferred_username?: string;
    picture?: string;
}

async function verifyIdToken(idToken: string): Promise<TelegramClaims> {
    const JWKS = jose.createRemoteJWKSet(new URL(TELEGRAM_JWKS_URL));
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: TELEGRAM_ISSUER,
        audience: TG_CLIENT_ID,
    });
    if (!payload.sub) throw new Error('id_token missing sub claim');
    return payload as TelegramClaims;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();

        if (!body.id_token) {
            return new Response(
                JSON.stringify({ error: 'id_token обязателен' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        console.log('[telegram-oidc-auth] SDK mode: verifying id_token...');
        const claims = await verifyIdToken(body.id_token);

        // claims.id — реальный Telegram user ID (совпадает с тем что Mini App берёт из initData)
        // claims.sub — внутренний OAuth идентификатор (другое число, вызывал дубли)
        if (!claims.id) throw new Error('id_token не содержит claim "id" (реальный Telegram user ID)');
        const telegramId = String(claims.id);

        console.log(`[telegram-oidc-auth] Verified TG user: id=${telegramId} sub=${claims.sub} (${claims.preferred_username ?? 'no username'})`);

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Ищем профиль по telegram_id — первичный ключ слияния аккаунтов
        const { data: existingProf } = await supabaseAdmin
            .from('profiles')
            .select('user_id, photo_url')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        // Определяем email: если аккаунт уже существует — берём его реальный email,
        // иначе создаём по стандартному формату (совпадает с telegram-auth-v2)
        let email = `tg_${telegramId}@telegram.auth`;

        if (existingProf?.user_id) {
            try {
                const { data: { user: authUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(existingProf.user_id);
                if (!getUserErr && authUser?.email) email = authUser.email;
            } catch (_) {
                console.warn(`[telegram-oidc-auth] Could not fetch auth user for ${existingProf.user_id}, using default email`);
            }
        }

        const password = `tg_secure_${telegramId}_${BOT_TOKEN.substring(0, 10)}`;

        console.log(`[telegram-oidc-auth] Auth attempt for ${email}`);

        // Создаём или находим auth пользователя
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                telegram_id: telegramId,
                full_name: claims.name ?? '',
                avatar_url: claims.picture ?? '',
                is_telegram_user: true,
            },
        });

        let user = authData?.user;

        if (authError && (authError.message.includes('already been registered') || authError.status === 422)) {
            console.log(`[telegram-oidc-auth] User already exists, finding by email...`);

            const { data: { users: found } } = await supabaseAdmin.auth.admin.listUsers({
                filter: `email.eq.${email}`,
                perPage: 1,
                page: 1,
            } as any);

            user = found?.[0] ?? undefined;

            if (!user && existingProf?.user_id) {
                const { data: { user: byId } } = await supabaseAdmin.auth.admin.getUserById(existingProf.user_id);
                user = byId ?? undefined;
            }

            if (user) {
                await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
            }
        } else if (authError) {
            throw authError;
        }

        if (!user) throw new Error('Не удалось найти или создать пользователя');

        // Создаём сессию
        const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        // Синхронизируем профиль
        const profilePayload: Record<string, unknown> = {
            user_id: sessionData.user.id,
            telegram_id: telegramId,
            first_name: claims.name?.split(' ')[0] ?? '',
            last_name: claims.name?.split(' ').slice(1).join(' ') || null,
            username: claims.preferred_username ?? null,
            photo_url: claims.picture ?? null,
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data: profByTg } = await supabaseAdmin
            .from('profiles')
            .select('id, user_id')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        let finalProfileId: string;

        if (profByTg) {
            const { data: updated, error: upErr } = await supabaseAdmin
                .from('profiles')
                .update(profilePayload)
                .eq('id', profByTg.id)
                .select('id')
                .single();
            if (upErr) throw upErr;
            finalProfileId = updated.id;
        } else {
            const { data: inserted, error: insErr } = await supabaseAdmin
                .from('profiles')
                .insert({ ...profilePayload, platform: 'web', settings: { theme: 'light', language: 'ru', notifications: true } })
                .select('id')
                .single();
            if (insErr) throw insErr;
            finalProfileId = inserted.id;
        }

        console.log(`[telegram-oidc-auth] Success: profile ${finalProfileId}`);

        return new Response(
            JSON.stringify({ session: sessionData.session, profile_id: finalProfileId }),
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
