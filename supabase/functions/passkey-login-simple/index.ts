import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RP_ID = Deno.env.get('PASSKEY_RP_ID') || 'skilyapp.com';

function generateChallenge(): string {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const binary = String.fromCharCode(...challenge);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

serve(async (req) => {
  console.log('[Passkey Login Simple] Request:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;

    console.log('[Passkey Login Simple] Action:', action);

    if (action === 'begin') {
      const challenge = generateChallenge();
      const sessionId = crypto.randomUUID();

      await supabase.rpc('create_webauthn_challenge', {
        p_session_id: sessionId,
        p_challenge: challenge,
        p_challenge_type: 'login',
        p_user_id: null,
      });

      return new Response(
        JSON.stringify({
          sessionId,
          challenge,
          rpId: RP_ID,
          timeout: 60000,
          userVerification: 'required',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      console.log('[Passkey Login Simple] Verify started');

      // ВРЕМЕННО: Просто возвращаем success для теста роутинга
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verify endpoint works! (simplified version)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Passkey Login Simple] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

