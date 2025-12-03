import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyAuthenticationResponse,
  type VerifyAuthenticationResponseOpts,
} from "https://esm.sh/@simplewebauthn/server@10.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Конфигурация Relying Party
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
  console.log('[Passkey Login] Request received:', {
    method: req.method,
    url: req.url,
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Service role client для admin операций
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Anon client для verifyOtp (публичные операции)
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { action } = body;

    // ============================================
    // ACTION: begin (Генерация challenge для входа)
    // ============================================
    if (action === 'begin') {
      // Генерируем challenge
      const challengeBytes = generateChallenge();
      const challenge = uint8ArrayToBase64url(challengeBytes);
      const sessionId = crypto.randomUUID();

      // Сохраняем challenge в БД (вместо in-memory Map)
      const { error: createError } = await supabaseAdmin.rpc('create_webauthn_challenge', {
        p_session_id: sessionId,
        p_challenge: challenge,
        p_challenge_type: 'login',
        p_user_id: null, // Для входа user_id неизвестен
      });

      if (createError) {
        console.error('[Passkey Login] Failed to create challenge:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate challenge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Login] Challenge created:', sessionId);

      // Возвращаем опции для navigator.credentials.get()
      return new Response(
        JSON.stringify({
          sessionId,
          challenge,
          rpId: RP_ID,
          timeout: 60000,
          userVerification: 'required', // Биометрия обязательна
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: verify (Верификация входа + создание сессии)
    // ============================================
    if (action === 'verify') {
      const { sessionId, credential } = body;

      if (!sessionId || !credential || !credential.id || !credential.response) {
        return new Response(
          JSON.stringify({ error: 'Invalid request data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Получаем и удаляем challenge из БД (одноразовый)
      const { data: challengeData, error: challengeError } = await supabaseAdmin
        .rpc('consume_webauthn_challenge', { p_session_id: sessionId })
        .single();

      if (challengeError || !challengeData) {
        console.error('[Passkey Login] Challenge not found or expired:', sessionId);
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверяем тип challenge
      if (challengeData.challenge_type !== 'login') {
        console.error('[Passkey Login] Invalid challenge type:', challengeData.challenge_type);
        return new Response(
          JSON.stringify({ error: 'Invalid challenge type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Login] Challenge consumed, fetching passkey data');

      // Получаем passkey из БД
      const { data: passkeyData, error: passkeyError } = await supabaseAdmin
        .rpc('get_passkey_for_verification', {
          p_credential_id: credential.id,
        })
        .single();

      if (passkeyError || !passkeyData) {
        console.error('[Passkey Login] Passkey not found:', credential.id);
        return new Response(
          JSON.stringify({ error: 'Passkey not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Login] Passkey found for user:', passkeyData.user_id);

      // Конвертируем public_key в Uint8Array для @simplewebauthn
      let credentialPublicKey: Uint8Array;
      
      try {
        if (typeof passkeyData.public_key === 'string') {
          // Пытаемся распарсить как JSON (массив чисел)
          const parsed = JSON.parse(passkeyData.public_key);
          if (Array.isArray(parsed)) {
            credentialPublicKey = new Uint8Array(parsed);
          } else {
            // Это Base64 строка
            credentialPublicKey = base64urlToUint8Array(passkeyData.public_key);
          }
        } else if (Array.isArray(passkeyData.public_key)) {
          // Массив чисел напрямую
          credentialPublicKey = new Uint8Array(passkeyData.public_key);
        } else {
          // Buffer объект или другой формат
          credentialPublicKey = new Uint8Array(passkeyData.public_key as any);
        }
        
        console.log('[Passkey Login] Public key converted, length:', credentialPublicKey.length);
      } catch (error) {
        console.error('[Passkey Login] Failed to parse public_key:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid public key format' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ПОЛНАЯ ВЕРИФИКАЦИЯ через @simplewebauthn/server
      try {
        const verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge: challengeData.challenge,
          expectedOrigin: EXPECTED_ORIGIN,
          expectedRPID: RP_ID,
          authenticator: {
            credentialID: base64urlToUint8Array(credential.id),
            credentialPublicKey: credentialPublicKey,
            counter: passkeyData.counter,
          },
          requireUserVerification: true, // Обязательная биометрия
        } as VerifyAuthenticationResponseOpts);

        if (!verification.verified || !verification.authenticationInfo) {
          console.error('[Passkey Login] Verification failed');
          return new Response(
            JSON.stringify({ error: 'Verification failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { newCounter } = verification.authenticationInfo;

        console.log('[Passkey Login] Verification successful, updating counter');

        // Обновляем counter и last_used_at
        const { error: updateError } = await supabaseAdmin.rpc('update_passkey_last_used', {
          p_credential_id: credential.id,
          p_new_counter: newCounter,
        });

        if (updateError) {
          console.error('[Passkey Login] Failed to update counter:', updateError);
          // Не критично, продолжаем
        }

        // ============================================
        // СОЗДАНИЕ SUPABASE СЕССИИ (Link Exchange Pattern)
        // ============================================

        console.log('[Passkey Login] Creating Supabase session for user:', passkeyData.user_email);

        // Шаг 1: Генерируем Magic Link (не отправляется, возвращается в ответе)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: passkeyData.user_email,
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error('[Passkey Login] Failed to generate magic link:', linkError);
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Шаг 2: Извлекаем СЫРОЙ токен из action_link
        // action_link: https://.../auth/v1/verify?token=RAW_TOKEN&type=magiclink&redirect_to=...
        const actionLink = new URL(linkData.properties.action_link);
        const rawToken = actionLink.searchParams.get('token');

        if (!rawToken) {
          console.error('[Passkey Login] Token not found in action_link');
          console.error('[Passkey Login] Action link:', linkData.properties.action_link);
          return new Response(
            JSON.stringify({ error: 'Failed to extract token from link' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[Passkey Login] Raw token extracted, length:', rawToken.length);
        console.log('[Passkey Login] Token preview:', rawToken.substring(0, 20) + '...');
        console.log('[Passkey Login] Exchanging for session...');

        // Шаг 3: ОБМЕНИВАЕМ сырой токен на сессию через verifyOtp
        // КРИТИЧНО: Используем ANON client для verifyOtp, НЕ service_role!
        // verifyOtp - это публичная операция, должна идти от anon key
        const { data: sessionData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
          email: passkeyData.user_email,
          token: rawToken, // ← Сырой токен из URL
          type: 'magiclink',
        });

        if (verifyError || !sessionData?.session) {
          console.error('[Passkey Login] Failed to verify OTP:', verifyError);
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const accessToken = sessionData.session.access_token;
        const refreshToken = sessionData.session.refresh_token;

        console.log('[Passkey Login] Session created successfully via Link Exchange pattern');

        // Возвращаем токены клиенту
        return new Response(
          JSON.stringify({
            success: true,
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
              id: passkeyData.user_id,
              email: passkeyData.user_email,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (verificationError: any) {
        console.error('[Passkey Login] Verification error:', verificationError);
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
    console.error('[Passkey Login] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
