import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyRegistrationResponse,
  type VerifyRegistrationResponseOpts,
} from "https://esm.sh/@simplewebauthn/server@10.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Конфигурация Relying Party
const RP_NAME = 'Skily';
const RP_ID = Deno.env.get('PASSKEY_RP_ID') || 'skilyapp.com';
const EXPECTED_ORIGIN = Deno.env.get('FRONTEND_URL') || 'https://skilyapp.com';

// Генерация криптографически стойкого challenge
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// Конвертация Uint8Array в Base64URL
function uint8ArrayToBase64url(buffer: Uint8Array): string {
  const binary = String.fromCharCode(...buffer);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Конвертация Base64URL в Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
      // Генерируем challenge
      const challengeBytes = generateChallenge();
      const challenge = uint8ArrayToBase64url(challengeBytes);
      const sessionId = crypto.randomUUID();

      // Сохраняем challenge в БД (вместо app_metadata)
      const { error: createError } = await supabase.rpc('create_webauthn_challenge', {
        p_session_id: sessionId,
        p_challenge: challenge,
        p_challenge_type: 'register',
        p_user_id: user.id,
      });

      if (createError) {
        console.error('[Passkey Register] Failed to create challenge:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate challenge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Register] Challenge created:', sessionId);

      // Возвращаем опции для navigator.credentials.create()
      return new Response(
        JSON.stringify({
          sessionId, // Новое: session ID для связи begin ↔ verify
          challenge,
          rp: {
            name: RP_NAME,
            id: RP_ID,
          },
          user: {
            id: uint8ArrayToBase64url(new TextEncoder().encode(user.id)),
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
      const { sessionId, credential, deviceName } = body;

      if (!sessionId || !credential || !credential.id || !credential.response) {
        return new Response(
          JSON.stringify({ error: 'Invalid credential data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Получаем и удаляем challenge из БД (одноразовый)
      const { data: challengeData, error: challengeError } = await supabase
        .rpc('consume_webauthn_challenge', { p_session_id: sessionId })
        .single();

      if (challengeError || !challengeData) {
        console.error('[Passkey Register] Challenge not found or expired:', sessionId);
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверяем тип challenge
      if (challengeData.challenge_type !== 'register') {
        console.error('[Passkey Register] Invalid challenge type:', challengeData.challenge_type);
        return new Response(
          JSON.stringify({ error: 'Invalid challenge type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверяем что challenge для этого пользователя
      if (challengeData.user_id !== user.id) {
        console.error('[Passkey Register] Challenge user mismatch');
        return new Response(
          JSON.stringify({ error: 'Invalid challenge' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Register] Challenge consumed, starting verification');

      // ПОЛНАЯ ВЕРИФИКАЦИЯ через @simplewebauthn/server
      try {
        const verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: challengeData.challenge,
          expectedOrigin: EXPECTED_ORIGIN,
          expectedRPID: RP_ID,
          requireUserVerification: true, // Обязательная биометрия
        } as VerifyRegistrationResponseOpts);

        if (!verification.verified || !verification.registrationInfo) {
          console.error('[Passkey Register] Verification failed');
          return new Response(
            JSON.stringify({ error: 'Verification failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

        console.log('[Passkey Register] Verification successful, saving to DB');
        console.log('[Passkey Register] Credential ID from client:', credential.id);

        // Сохраняем credential в БД
        // ВАЖНО: Используем credential.id (строка от клиента), а НЕ конвертируем credentialID
        // Клиент и сервер должны использовать одинаковый формат!
        const { error: insertError } = await supabase
          .from('passkey_credentials')
          .insert({
            user_id: user.id,
            credential_id: credential.id, // ← ИСПРАВЛЕНО: используем строку от клиента
            public_key: credentialPublicKey, // Уже в правильном формате (COSE)
            counter: counter,
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

        console.log('[Passkey Register] Passkey registered successfully:', credential.id);

        return new Response(
          JSON.stringify({
            success: true,
            credentialId: credential.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (verificationError: any) {
        console.error('[Passkey Register] Verification error:', verificationError);
        return new Response(
          JSON.stringify({
            error: 'Verification failed',
            details: verificationError.message,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Неизвестный action
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Passkey Register] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
