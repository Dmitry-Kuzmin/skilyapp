import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Telegram Auth] Request received:', {
    method: req.method,
    url: req.url,
    headers: {
      origin: req.headers.get('origin'),
      contentType: req.headers.get('content-type')
    }
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    console.log('[Telegram Auth] Authentication request received');

    const { user, platform = 'telegram' } = requestBody;

    if (!user || !user.id) {
      console.error('[Telegram Auth] Missing user data');
      return new Response(
        JSON.stringify({ error: 'User data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================================
    // CRITICAL: TELEGRAM HYBRID AUTHENTICATION SYSTEM
    // ============================================================================
    // This function uses a HYBRID approach:
    // 1. For TELEGRAM users: Uses telegram_id stored in profiles table
    // 2. For WEB users: Uses standard Supabase Auth
    // 
    // DO NOT MODIFY THIS APPROACH WITHOUT CAREFUL TESTING IN TELEGRAM ENVIRONMENT
    // The telegram_id approach is NECESSARY because Telegram WebApp has issues
    // with standard JWT tokens and session persistence
    // ============================================================================
    
    console.log('[Telegram Auth] Using hybrid Telegram authentication (telegram_id based)');

    // Get or create profile directly using telegram_id
    // This bypasses Supabase Auth JWT issues in Telegram environment
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, user_id, telegram_id')
      .eq('telegram_id', user.id)
      .single();

    let profile;

    if (existingProfile) {
      // Update existing profile with latest Telegram data
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          language_code: user.language_code,
          is_premium: user.is_premium,
          platform,
          last_login: new Date().toISOString()
        })
        .eq('telegram_id', user.id)
        .select('id')
        .single();

      profile = updatedProfile;
      console.log('[Telegram Auth] Existing Telegram profile updated');
    } else {
      // Create new profile with telegram_id
      // Note: user_id can be null for Telegram-only users
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          language_code: user.language_code,
          is_premium: user.is_premium,
          platform,
          user_id: null // Telegram users don't need Supabase auth user_id
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[Telegram Auth] Profile creation failed:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profile = newProfile;
      console.log('[Telegram Auth] New Telegram profile created');
    }

    console.log('[Telegram Auth] Authentication successful');

    // Return profile info without JWT tokens
    // Telegram users authenticate via telegram_id in RLS policies
    return new Response(
      JSON.stringify({ 
        success: true,
        profile,
        telegram_id: user.id,
        platform: 'telegram'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Telegram Auth] Unexpected error:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
