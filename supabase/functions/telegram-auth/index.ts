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

    console.log('[Telegram Auth] Creating Supabase auth user');

    // Create or get Supabase auth user using admin API
    const email = `telegram_${user.id}@telegram.internal`;
    
    // Try to get existing user first
    let authUser;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => 
      u.user_metadata?.telegram_id === user.id
    );

    if (existingUser) {
      authUser = existingUser;
      console.log('[Telegram Auth] Existing user found');
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          language_code: user.language_code,
          is_premium: user.is_premium,
          platform
        }
      });

      if (createError) {
        console.error('[Telegram Auth] User creation failed');
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authUser = newUser.user;
      console.log('[Telegram Auth] New user created');
    }

    // Generate access token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.email!,
      options: {
        data: {
          telegram_id: user.id,
          platform
        }
      }
    });

    if (sessionError || !sessionData) {
      console.error('[Telegram Auth] Session generation failed');
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the profile that was created by the trigger
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    console.log('[Telegram Auth] Authentication successful');

    // Extract tokens from the session link
    const urlParams = new URL(sessionData.properties.action_link).searchParams;
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    return new Response(
      JSON.stringify({ 
        success: true,
        profile,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: authUser
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
