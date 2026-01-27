
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTelegramHash(data: any, botToken: string): Promise<boolean> {
    const { hash, ...rest } = data;
    if (!hash || !botToken) return false;

    // 1. Create data-check-string
    // Sort keys alphabetically
    const keys = Object.keys(rest).sort();
    const dataCheckString = keys
        .filter(key => rest[key] !== undefined && rest[key] !== null)
        .map(key => `${key}=${rest[key]}`)
        .join('\n');

    // 2. Create secret key: SHA256 of the bot token
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(botToken)
    );

    // 3. Calculate HMAC-SHA256
    const key = await crypto.subtle.importKey(
        'raw',
        secretKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(dataCheckString)
    );

    // 4. Convert to hex
    const hexSignature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return hexSignature === hash;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { user: telegramUser } = await req.json();
        console.log("Telegram Auth Data:", JSON.stringify(telegramUser)); // DEBUG LOG

        if (!telegramUser || !telegramUser.id || !telegramUser.hash) {
            throw new Error('Invalid Telegram user data');
        }

        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('VITE_TELEGRAM_BOT_TOKEN'); // Fallback check

        // In production, we MUST have the token.
        // For now, if no token, we might fail securely.
        if (!botToken) {
            console.error("TELEGRAM_BOT_TOKEN is missing in Edge Function secrets");
            throw new Error('Server configuration error');
        }

        // Verify Hash
        const isValid = await verifyTelegramHash(telegramUser, botToken);

        if (!isValid) {
            // Allow bypassing in development for testing if needed, BUT generally strict
            // For now, fail.
            console.error("Invalid hash", telegramUser);
            throw new Error('Invalid authentication data (hash mismatch)');
        }

        // Check auth_date (prevent replay attacks, e.g. < 24 hours)
        const now = Math.floor(Date.now() / 1000);
        if (now - telegramUser.auth_date > 86400) {
            throw new Error('Authentication data is outdated');
        }

        // Ready to issue session
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Check if user exists by telegram_id (stored in user_metadata or profiles)
        // Actually, we can just use a deterministic email: tg_<id>@skilyapp.com
        const email = `tg_${telegramUser.id}@skilyapp.com`;

        // Upsert the user into Profiles table FIRST (to ensure data is fresh)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                telegram_id: telegramUser.id,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
                username: telegramUser.username,
                photo_url: telegramUser.photo_url,
                platform: 'telegram',
                updated_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });

        if (profileError) {
            console.error("Profile upsert error", profileError);
        }

        // 2. Manage Auth User
        // Try to get user by email
        const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
        // listUsers is not efficient for finding one, but creating handles duplicate email.

        // Better: Attempt to sign up. If exists, it might return error, then we sign in?
        // Actually, admin.createUser throws if email exists.

        let userId: string;

        // We need to bypass email confirmation
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                telegram_id: telegramUser.id,
                first_name: telegramUser.first_name,
                username: telegramUser.username
            }
        });

        if (createError) {
            // Presumably user exists. Let's find their ID.
            if (createError.message.includes("already registered") || createError.status === 422) {
                // Find the user ID - inefficient but reliable if we can't search by email directly in admin SDK (we can't efficiently without list)
                // But actually, we can just "Magic Link" sign in? No, we want a session immediately.

                // Workaround: We probably shouldn't list ALL users.
                // But we can use `supabaseAdmin.from('auth.users').select('id').eq('email', email)`? No, direct access to auth schema is restricted.

                // Since we have the SERVICE ROLE, we can just generate a link or....
                // Wait, `getUserById` requires ID.

                // Let's use listUsers with filter? Currently supports generic text search?
                // Actually, `createUser` fails, but we don't get the ID back.

                // STRATEGY: We will just MINT a token for this user using `signUserIn` if possible?
                // Admin API doesn't have "signInByEmail" without password.

                // OK, let's use a known schema. We will use a dummy password for these users OR better:
                // We can use `generateLink` type `magiclink` and then exchange it? Too slow.

                // BEST WAY: Use `supabase.auth.admin.getUserByEmail(email)` (Available in newer SDKs? Let's check docs mentally)
                // It's not always available.

                // Fallback: We fetch our `profiles` table to find the user_id (since we linked telegram_id <-> user_id via triggers usually... wait, usually auth.users creates profiles).
                // But here we might have created profile first or we rely on triggers.
                // If we rely on triggers, `profiles` table has `id` which IS the auth.user.id.

                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('telegram_id', telegramUser.id)
                    .single();

                if (!profile) throw new Error("User exists but profile lost?");
                userId = profile.id;
            } else {
                throw createError;
            }
        } else {
            userId = newUser.user.id;
        }

        // 3. Issue Token
        // We cannot just "create" a session easily without password.
        // However, since we are admin, we can reset the password to a temp one and sign in? No, side effects.

        // Correction: We can use `supabaseAdmin.auth.createSession({ sub: userId })`? No.
        // We CAN use `supabase.auth.signInWithOtp` -> verify? No.

        // There isn't a direct "mint token" in standard API public docs for JS client, 
        // BUT we can sign a standard JWT if we have the JWT Secret.
        // `SUPABASE_AUTH_EXTERNAL_PROVIDER_SECRET`? No.
        // Env `SUPABASE_JWT_SECRET` is usually available in Edge Functions? No, only SERVICE_ROLE_KEY.

        // Actually, `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` returns `action_link`.
        // We can't auto-consume it here easily.

        // Let's use the PASSWORD approach.
        // We set a random password for this internal user and sign them in.
        // Or we trust usage of custom claims.

        // WAIT! `supabase-js` v2 has `signInWithIdToken`? No.

        // Let's go with the `profiles` table custom token? No, we want `sb-access-token`.

        // OK, let's use the "Grant Code" if possible or... 
        // Actually, many people do: `supabase.auth.admin.generateLink` and return the `action_link` to the frontend, 
        // and frontend immediately navigates to it (invisible iframe or fetch?).
        // No, `action_link` is a redirect URL.

        // LET'S RETURN THE `action_link` (Magic Link). The frontend can then `window.location.href = action_link` 
        // which will perform the authentication and redirect to dashboard!
        // This is secure and standard.

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${req.headers.get('origin') ?? 'https://skilyapp.com'}/dashboard`
            }
        });

        if (linkError) throw linkError;

        return new Response(
            JSON.stringify({
                success: true,
                redirectUrl: linkData.properties?.action_link
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
