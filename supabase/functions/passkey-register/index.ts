import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WebAuthn Utilities (минимальная реализация без тяжёлых зависимостей)
function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64url(buffer: Uint8Array): string {
  const binary = String.fromCharCode(...buffer);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Генерация криптографически стойкого challenge
function generateChallenge(): string {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return bufferToBase64url(challenge);
}

serve(async (req) => {
  console.log('[Passkey Register] Request received:', {
    method: req.method,
    url: req.url,
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем текущего пользователя
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Passkey Register] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Passkey Register] User authenticated:', user.id);

    const body = await req.json();
    const { action } = body;

    // ============================================
    // ACTION: begin (Генерация challenge)
    // ============================================
    if (action === 'begin') {
      const challenge = generateChallenge();
      
      // Сохраняем challenge в auth.flow_state (временное хранилище Supabase)
      // TTL: 2 минуты (достаточно для регистрации)
      const { error: flowError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          app_metadata: {
            passkey_challenge: challenge,
            passkey_challenge_expires: Date.now() + 120000, // 2 минуты
          }
        }
      );

      if (flowError) {
        console.error('[Passkey Register] Flow state error:', flowError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate challenge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Register] Challenge generated for user:', user.id);

      // Возвращаем опции для navigator.credentials.create()
      return new Response(
        JSON.stringify({
          challenge,
          rp: {
            name: 'Skily',
            id: Deno.env.get('PASSKEY_RP_ID') || 'skilyapp.com', // Настраивается через env
          },
          user: {
            id: bufferToBase64url(new TextEncoder().encode(user.id)),
            name: user.email || `user_${user.id.slice(0, 8)}`,
            displayName: user.email || `User ${user.id.slice(0, 8)}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256 (рекомендуется)
            { alg: -257, type: 'public-key' }, // RS256 (fallback)
          ],
          timeout: 60000, // 60 секунд
          attestation: 'none', // Не требуем attestation (производительность)
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Face ID, Touch ID, Windows Hello
            requireResidentKey: true, // Для passwordless (без username)
            residentKey: 'required',
            userVerification: 'required', // Биометрия обязательна
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: verify (Верификация регистрации)
    // ============================================
    if (action === 'verify') {
      const { credential, deviceName } = body;

      if (!credential || !credential.id || !credential.response) {
        return new Response(
          JSON.stringify({ error: 'Invalid credential data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Получаем сохранённый challenge
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user.id);
      
      if (userError || !userData?.user?.app_metadata?.passkey_challenge) {
        console.error('[Passkey Register] Challenge not found');
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const savedChallenge = userData.user.app_metadata.passkey_challenge;
      const challengeExpires = userData.user.app_metadata.passkey_challenge_expires;

      // Проверяем TTL
      if (Date.now() > challengeExpires) {
        console.error('[Passkey Register] Challenge expired');
        return new Response(
          JSON.stringify({ error: 'Challenge expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Верифицируем challenge
      const clientDataJSON = base64urlToBuffer(credential.response.clientDataJSON);
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

      if (clientData.challenge !== savedChallenge) {
        console.error('[Passkey Register] Challenge mismatch');
        return new Response(
          JSON.stringify({ error: 'Challenge verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Извлекаем публичный ключ из attestationObject
      const attestationObject = base64urlToBuffer(credential.response.attestationObject);
      
      // Простая CBOR декодировка для authData (первые 37+ байт)
      // authData содержит: rpIdHash (32) + flags (1) + counter (4) + credentialId + publicKey
      const authData = attestationObject.slice(0, 200); // Достаточно для извлечения данных

      // Сохраняем credential в БД
      const { error: insertError } = await supabase
        .from('passkey_credentials')
        .insert({
          user_id: user.id,
          credential_id: credential.id,
          public_key: credential.response.attestationObject, // Сохраняем весь attestationObject
          counter: 0, // Начальный counter
          device_name: deviceName || null,
          transports: credential.response.transports || ['internal'],
        });

      if (insertError) {
        console.error('[Passkey Register] Insert error:', insertError);
        
        // Проверяем дубликат
        if (insertError.code === '23505') { // unique_violation
          return new Response(
            JSON.stringify({ error: 'This passkey is already registered' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Failed to save passkey' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Очищаем challenge из metadata
      await supabase.auth.admin.updateUserById(
        user.id,
        {
          app_metadata: {
            passkey_challenge: null,
            passkey_challenge_expires: null,
          }
        }
      );

      console.log('[Passkey Register] Passkey registered successfully:', credential.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          credentialId: credential.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Неизвестный action
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Passkey Register] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

