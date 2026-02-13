// telegram-auth-v2: Обмен Telegram initData на полноценную Supabase сессию
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function syncTelegramProfilePhoto(supabaseAdmin: any, telegramId: number): Promise<string | null> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`);
        const data = await response.json();
        if (!data.ok || !data.result?.photos?.[0]?.[0]) return null;

        const photos = data.result.photos[0];
        const fileId = photos[photos.length - 1].file_id;

        const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileData = await fileResponse.json();
        if (!fileData.ok || !fileData.result?.file_path) return null;

        const telegramImageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;

        // Download image content
        const imageResponse = await fetch(telegramImageUrl);
        if (!imageResponse.ok) return null;
        const imageBlob = await imageResponse.blob();

        // Upload to Supabase Storage
        const fileName = `${telegramId}.jpg`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(fileName, imageBlob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return telegramImageUrl; // Fallback to TG URL if upload fails
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (e) {
        console.error('syncTelegramProfilePhoto error:', e);
        return null;
    }
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
        const telegramUser = await validateTelegramData(initData);

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let photoUrl = await syncTelegramProfilePhoto(supabaseAdmin, telegramUser.id);


        // Унификация
        const { data: existingProf } = await supabaseAdmin.from('profiles').select('user_id').eq('telegram_id', telegramUser.id).maybeSingle();
        let email = `tg_${telegramUser.id}@telegram.auth`;

        if (existingProf?.user_id) {
            const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(existingProf.user_id);
            if (authUser?.email) email = authUser.email;
        }

        const password = `tg_secure_${telegramUser.id}_${BOT_TOKEN.substring(0, 10)}`;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { telegram_id: telegramUser.id, full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(), avatar_url: photoUrl, is_telegram_user: true }
        });

        let user = authData?.user;
        if (authError && (authError.message.includes("recorded") || authError.status === 422)) {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            user = users.find(u => u.email === email);

            // Если мы нашли юзера (например Google), но у него нет нашего deterministic пароля - мы его ставим, чтобы signInWithPassword сработал
            // Это безопасно, так как это внутренний механизм
            if (user) {
                await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
            }
        }

        const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        // Sync profile and get it back to return the ID
        const { data: profileData, error: profileError } = await supabaseAdmin.from('profiles').upsert({
            user_id: sessionData.user.id,
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            photo_url: photoUrl,
            updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' }).select('id').single();

        return new Response(JSON.stringify({
            session: sessionData.session,
            user: sessionData.user,
            profile_id: profileData?.id
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });


    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 401, headers: corsHeaders });
    }
});
