import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { syncTelegramProfilePhoto } from '../_shared/telegram-utils.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTelegramHash(data: any, botToken: string): Promise<boolean> {
    const { hash, ...rest } = data;
    if (!hash || !botToken) return false;

    const keys = Object.keys(rest).sort();
    const dataCheckString = keys
        .filter(key => rest[key] !== undefined && rest[key] !== null)
        .map(key => `${key}=${rest[key]}`)
        .join('\n');

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
    const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataCheckString));
    const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    return hexSignature === hash;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { user: telegramUser } = await req.json();
        if (!telegramUser?.id || !telegramUser?.hash) throw new Error('Invalid data');

        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('VITE_TELEGRAM_BOT_TOKEN');
        if (!botToken) throw new Error('BOT_TOKEN missing');

        if (!(await verifyTelegramHash(telegramUser, botToken))) throw new Error('Hash mismatch');

        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // Sync photo to Supabase Storage - ALWAYS, to avoid broken TG links
        console.log("Syncing photo to storage for ID:", telegramUser.id);
        const photoUrl = await syncTelegramProfilePhoto(supabaseAdmin, telegramUser.id as number, botToken);

        // 1. Unification: Проверяем, не привязан ли этот Telegram уже к какому-то реальному аккаунту
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('user_id')
            .eq('telegram_id', telegramUser.id)
            .maybeSingle();

        let email = `tg_${telegramUser.id}@telegram.auth`;

        if (existingProfile?.user_id) {
            const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(existingProfile.user_id);
            if (authUser?.email) {
                email = authUser.email;
                console.log(`[Unification] Found linked email: ${email}`);
            }
        }

        await supabaseAdmin.from('profiles').upsert({
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            photo_url: photoUrl,
            platform: 'telegram',
            updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
                telegram_id: telegramUser.id,
                full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
                avatar_url: photoUrl,
                is_telegram_user: true
            }
        });

        let userId = newUser?.user?.id;
        if (createError && (createError.message.includes("recorded") || createError.status === 422)) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('telegram_id', telegramUser.id).single();
            userId = profile?.id;

            // Sync metadata
            if (userId) {
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        avatar_url: photoUrl,
                        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim()
                    }
                });
            }
        }

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: { redirectTo: `${req.headers.get('origin') || 'https://skilyapp.com'}/dashboard` }
        });

        if (linkError) throw linkError;

        return new Response(JSON.stringify({ success: true, redirectUrl: linkData.properties?.action_link }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
});
