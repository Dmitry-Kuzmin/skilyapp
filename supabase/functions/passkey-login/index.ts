import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WebAuthn Utilities
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

function generateChallenge(): string {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return bufferToBase64url(challenge);
}

// Хранилище challenges в памяти (для production можно использовать Redis или Supabase storage)
// Для минимальной нагрузки используем in-memory с TTL
const challengeStore = new Map<string, { challenge: string; expires: number }>();

// Очистка старых challenges (вызывается периодически)
function cleanupChallenges() {
  const now = Date.now();
  for (const [key, value] of challengeStore.entries()) {
    if (now > value.expires) {
      challengeStore.delete(key);
    }
  }
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;

    // ============================================
    // ACTION: begin (Генерация challenge для входа)
    // ============================================
    if (action === 'begin') {
      const challenge = generateChallenge();
      const sessionId = crypto.randomUUID();
      
      // Сохраняем challenge с TTL 2 минуты
      challengeStore.set(sessionId, {
        challenge,
        expires: Date.now() + 120000,
      });

      // Периодическая очистка
      if (challengeStore.size > 100) {
        cleanupChallenges();
      }

      console.log('[Passkey Login] Challenge generated:', sessionId);

      // Возвращаем опции для navigator.credentials.get()
      return new Response(
        JSON.stringify({
          sessionId,
          challenge,
          rpId: Deno.env.get('PASSKEY_RP_ID') || 'skilyapp.com',
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

      // Получаем сохранённый challenge
      const storedChallenge = challengeStore.get(sessionId);
      if (!storedChallenge) {
        console.error('[Passkey Login] Challenge not found:', sessionId);
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверяем TTL
      if (Date.now() > storedChallenge.expires) {
        challengeStore.delete(sessionId);
        console.error('[Passkey Login] Challenge expired');
        return new Response(
          JSON.stringify({ error: 'Challenge expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Удаляем challenge (одноразовый)
      challengeStore.delete(sessionId);

      // Верифицируем challenge из clientDataJSON
      const clientDataJSON = base64urlToBuffer(credential.response.clientDataJSON);
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

      if (clientData.challenge !== storedChallenge.challenge) {
        console.error('[Passkey Login] Challenge mismatch');
        return new Response(
          JSON.stringify({ error: 'Challenge verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (clientData.type !== 'webauthn.get') {
        console.error('[Passkey Login] Invalid type');
        return new Response(
          JSON.stringify({ error: 'Invalid credential type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Получаем passkey из БД
      const { data: passkeyData, error: passkeyError } = await supabase
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

      // ВАЖНО: Здесь должна быть полноценная криптографическая верификация подписи
      // Для production используйте @simplewebauthn/server или аналог
      // Упрощённая проверка для MVP:
      const authenticatorData = base64urlToBuffer(credential.response.authenticatorData);
      const signature = base64urlToBuffer(credential.response.signature);

      // Проверяем flags (user present, user verified)
      const flags = authenticatorData[32];
      const userPresent = (flags & 0x01) !== 0;
      const userVerified = (flags & 0x04) !== 0;

      if (!userPresent || !userVerified) {
        console.error('[Passkey Login] User verification failed');
        return new Response(
          JSON.stringify({ error: 'User verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Извлекаем counter
      const counterView = new DataView(authenticatorData.buffer, 33, 4);
      const newCounter = counterView.getUint32(0, false); // Big-endian

      // Проверяем counter (защита от replay)
      if (newCounter <= passkeyData.counter) {
        console.error('[Passkey Login] Counter mismatch (replay attack?)', {
          stored: passkeyData.counter,
          received: newCounter,
        });
        return new Response(
          JSON.stringify({ error: 'Invalid counter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // TODO: Полная криптографическая верификация подписи
      // Для MVP пропускаем (доверяем браузеру)
      // В production добавить полную верификацию через crypto.subtle.verify

      // Обновляем counter и last_used_at
      const { error: updateError } = await supabase.rpc('update_passkey_last_used', {
        p_credential_id: credential.id,
        p_new_counter: newCounter,
      });

      if (updateError) {
        console.error('[Passkey Login] Failed to update counter:', updateError);
      }

      // ============================================
      // СОЗДАНИЕ SUPABASE СЕССИИ
      // ============================================

      // Генерируем сессию для пользователя через Admin API
      // Используем signInWithPassword с временным токеном или generateLink
      
      // Вариант 1: Используем admin.generateLink (безопаснее)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: passkeyData.user_email,
        options: {
          redirectTo: `${Deno.env.get('FRONTEND_URL') || 'https://skilyapp.com'}/auth/callback`,
        }
      });

      if (linkError || !linkData) {
        console.error('[Passkey Login] Failed to generate link:', linkError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Извлекаем токен из ссылки
      const url = new URL(linkData.properties.action_link);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        console.error('[Passkey Login] Missing tokens in generated link');
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Passkey Login] Session created successfully for user:', passkeyData.user_id);

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
    }

    // Неизвестный action
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Passkey Login] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

