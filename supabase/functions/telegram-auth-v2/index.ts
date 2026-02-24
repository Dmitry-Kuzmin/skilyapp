// telegram-auth-v2: Обмен Telegram initData на полноценную Supabase сессию
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { syncTelegramProfilePhoto } from '../_shared/telegram-utils.ts';

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bufToHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateTelegramData(initData: string): Promise<Record<string, unknown>> {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) throw new Error("Missing hash");
    urlParams.delete("hash");
    const dataCheckString = Array.from(urlParams.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => `${key}=${val}`).join("\n");
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(BOT_TOKEN));
    const signingKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const calculatedHash = await crypto.subtle.sign("HMAC", signingKey, encoder.encode(dataCheckString));
    if (bufToHex(calculatedHash) !== hash) throw new Error("Hash mismatch");
    return JSON.parse(urlParams.get("user") || "{}");
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { initData } = await req.json();
        console.log(`[telegram-auth-v2] Received initData exchange request...`);

        const telegramUser = await validateTelegramData(initData);
        console.log(`[telegram-auth-v2] Validated TG user: ${telegramUser.id}`);

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let photoUrl = null;
        try {
            photoUrl = await syncTelegramProfilePhoto(supabaseAdmin, telegramUser.id as number, BOT_TOKEN, (telegramUser as any).photo_url as string);
        } catch (e) {
            console.error(`[telegram-auth-v2] Photo sync error:`, e);
        }

        const { data: existingProf } = await supabaseAdmin.from('profiles').select('user_id, photo_url').eq('telegram_id', telegramUser.id).maybeSingle();
        let email = `tg_${telegramUser.id}@telegram.auth`;

        if (existingProf?.user_id) {
            try {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(existingProf.user_id);
                if (authUser?.email) email = authUser.email;
            } catch (e) {
                console.warn(`[telegram-auth-v2] Failed to get auth user for ${existingProf.user_id}`);
            }
        }

        const password = `tg_secure_${telegramUser.id}_${BOT_TOKEN.substring(0, 10)}`;

        console.log(`[telegram-auth-v2] Auth attempt for ${email}`);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                telegram_id: telegramUser.id,
                full_name: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                avatar_url: photoUrl || (telegramUser as any).photo_url,
                is_telegram_user: true
            }
        });

        let user = authData?.user;
        if (authError && (authError.message.includes("recorded") || authError.status === 422)) {
            console.log(`[telegram-auth-v2] User already exists, ensuring password match`);
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            user = users.find(u => u.email === email);

            if (user) {
                await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
            }
        } else if (authError) {
            console.error(`[telegram-auth-v2] Create user error:`, authError);
            throw authError;
        }

        const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (signInError) {
            console.error(`[telegram-auth-v2] SignIn error:`, signInError);
            throw signInError;
        }

        // 5. Синхронизируем профиль
        console.log(`[telegram-auth-v2] Syncing profile for user ${sessionData.user.id}`);

        const finalPhotoUrl = photoUrl || (telegramUser as any).photo_url;

        const profilePayload: any = {
            user_id: sessionData.user.id,
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: (telegramUser as any).last_name || null,
            username: (telegramUser as any).username || null,
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_premium: (telegramUser as any).is_premium || false
        };

        if (finalPhotoUrl) {
            profilePayload.photo_url = finalPhotoUrl;
        }

        // Search profile by telegram_id FIRST
        const { data: profByTg, error: findProfError } = await supabaseAdmin
            .from('profiles')
            .select('id, user_id')
            .eq('telegram_id', telegramUser.id)
            .maybeSingle();

        if (findProfError) {
            console.error(`[telegram-auth-v2] Find profile error:`, findProfError);
            throw findProfError;
        }

        let finalProfileId: string;

        if (profByTg) {
            console.log(`[telegram-auth-v2] Updating existing profile: ${profByTg.id}`);
            const { data: updatedProf, error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(profilePayload)
                .eq('id', profByTg.id)
                .select('id')
                .single();

            if (updateError) throw updateError;
            finalProfileId = updatedProf.id;
        } else {
            console.log(`[telegram-auth-v2] Profile not found, creating...`);
            profilePayload.settings = { theme: "light", language: "ru", notifications: true };
            profilePayload.platform = 'telegram';

            const { data: insertedProf, error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert(profilePayload)
                .select('id')
                .single();

            if (insertError) throw insertError;
            finalProfileId = insertedProf.id;
        }

        console.log(`[telegram-auth-v2] Success: ${finalProfileId}`);

        return new Response(JSON.stringify({
            session: sessionData.session,
            user: sessionData.user,
            profile_id: finalProfileId
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        console.error(`[telegram-auth-v2] CRITICAL ERROR:`, err);
        return new Response(JSON.stringify({
            error: err.message,
            stack: err.stack,
            type: 'telegram-auth-v2-error'
        }), { status: 500, headers: corsHeaders });
    }
});
