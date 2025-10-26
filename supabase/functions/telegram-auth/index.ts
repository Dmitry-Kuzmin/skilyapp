import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user, platform = 'telegram' } = await req.json();

    console.log('[Telegram Auth] Received request:', { 
      userId: user?.id, 
      firstName: user?.first_name,
      platform 
    });

    if (!user || !user.id) {
      console.error('[Telegram Auth] Missing user data');
      return new Response(
        JSON.stringify({ error: 'User data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Telegram Auth] Upserting profile for telegram_id:', user.id);

    // Upsert user profile with automatic settings initialization
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        telegram_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
        photo_url: user.photo_url || null,
        language_code: user.language_code || null,
        is_premium: user.is_premium || false,
        platform: platform,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          theme: 'light',
          language: user.language_code || 'en',
          notifications: true
        }
      }, {
        onConflict: 'telegram_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[Telegram Auth] Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Telegram Auth] Profile saved successfully:', profile.id);

    // Generate a simple JWT-like token (for demo purposes)
    // In production, use proper JWT signing
    const token = btoa(JSON.stringify({
      telegram_id: user.id,
      username: user.username,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    }));

    console.log('[Telegram Auth] Sending success response');

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in telegram-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
