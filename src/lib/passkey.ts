/**
 * Passkey (WebAuthn) Utilities
 * 
 * Легковесная обёртка над WebAuthn API для регистрации и входа через биометрию.
 * Оптимизирована для минимальной нагрузки на Supabase.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// Types
// ============================================

export interface PasskeyCredential {
  id: string;
  user_id: string;
  device_name: string | null;
  transports: string[] | null;
  created_at: string;
  last_used_at: string | null;
}

export interface PasskeyRegistrationOptions {
  deviceName?: string;
}

// ============================================
// Feature Detection
// ============================================

/**
 * Проверяет поддержку WebAuthn в браузере
 */
export function isPasskeySupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create
  );
}

/**
 * Проверяет доступность platform authenticator (Face ID, Touch ID, Windows Hello)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Проверяет наличие conditional UI (автоматическое предложение passkey)
 */
export async function isConditionalMediationAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;

  try {
    return await PublicKeyCredential.isConditionalMediationAvailable?.() || false;
  } catch {
    return false;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Конвертирует Base64URL строку в ArrayBuffer
 */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Конвертирует ArrayBuffer в Base64URL строку
 */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ============================================
// Registration
// ============================================

/**
 * Регистрирует новый Passkey для текущего пользователя
 */
export async function registerPasskey(
  options: PasskeyRegistrationOptions = {}
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    // Проверка поддержки
    if (!isPasskeySupported()) {
      return { success: false, error: 'WebAuthn не поддерживается в этом браузере' };
    }

    // Шаг 1: Получаем challenge от сервера
    const { data: beginData, error: beginError } = await supabase.functions.invoke(
      'passkey-register',
      {
        body: { action: 'begin' },
      }
    );

    if (beginError || !beginData) {
      console.error('[Passkey] Begin error:', beginError);
      return { success: false, error: 'Не удалось начать регистрацию' };
    }

    // Новое: сервер возвращает sessionId для связи begin ↔ verify
    const { sessionId } = beginData;
    console.log('[Passkey] Registration challenge received, sessionId:', sessionId);

    // Шаг 2: Создаём credential через браузер
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64urlToBuffer(beginData.challenge),
      rp: beginData.rp,
      user: {
        id: base64urlToBuffer(beginData.user.id),
        name: beginData.user.name,
        displayName: beginData.user.displayName,
      },
      pubKeyCredParams: beginData.pubKeyCredParams,
      timeout: beginData.timeout,
      attestation: beginData.attestation,
      authenticatorSelection: beginData.authenticatorSelection,
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'Регистрация отменена' };
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    // Шаг 3: Отправляем credential на верификацию (с sessionId)
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
      'passkey-register',
      {
        body: {
          action: 'verify',
          sessionId, // Новое: связываем с challenge из begin
          credential: {
            id: credential.id,
            rawId: bufferToBase64url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: bufferToBase64url(response.clientDataJSON),
              attestationObject: bufferToBase64url(response.attestationObject),
              transports: response.getTransports?.() || [],
            },
          },
          deviceName: options.deviceName,
        },
      }
    );

    if (verifyError || !verifyData?.success) {
      console.error('[Passkey] Verify error:', verifyError);
      return { success: false, error: 'Не удалось сохранить Passkey' };
    }

    console.log('[Passkey] Registration successful:', verifyData.credentialId);

    return {
      success: true,
      credentialId: verifyData.credentialId,
    };
  } catch (error: any) {
    console.error('[Passkey] Registration error:', error);

    // Обрабатываем типичные ошибки
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Регистрация отменена пользователем' };
    }
    if (error.name === 'InvalidStateError') {
      return { success: false, error: 'Этот Passkey уже зарегистрирован' };
    }

    return { success: false, error: error.message || 'Неизвестная ошибка' };
  }
}

// ============================================
// Authentication
// ============================================

/**
 * Выполняет вход через Passkey
 */
export async function loginWithPasskey(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Проверка поддержки
    if (!isPasskeySupported()) {
      return { success: false, error: 'WebAuthn не поддерживается в этом браузере' };
    }

    // Шаг 1: Получаем challenge от сервера
    const { data: beginData, error: beginError } = await supabase.functions.invoke(
      'passkey-login',
      {
        body: { action: 'begin' },
      }
    );

    if (beginError || !beginData) {
      console.error('[Passkey] Login begin error:', beginError);
      return { success: false, error: 'Не удалось начать вход' };
    }

    // Новое: сервер возвращает sessionId для связи begin ↔ verify
    const { sessionId } = beginData;
    console.log('[Passkey] Login challenge received, sessionId:', sessionId);

    // Шаг 2: Получаем credential от браузера
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64urlToBuffer(beginData.challenge),
      rpId: beginData.rpId,
      timeout: beginData.timeout,
      userVerification: beginData.userVerification,
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'Вход отменён' };
    }

    const response = credential.response as AuthenticatorAssertionResponse;

    // Шаг 3: Отправляем credential на верификацию (с sessionId)
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
      'passkey-login',
      {
        body: {
          action: 'verify',
          sessionId, // Связываем с challenge из begin
          credential: {
            id: credential.id,
            rawId: bufferToBase64url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: bufferToBase64url(response.clientDataJSON),
              authenticatorData: bufferToBase64url(response.authenticatorData),
              signature: bufferToBase64url(response.signature),
              userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
            },
          },
        },
      }
    );

    if (verifyError || !verifyData?.success) {
      console.error('[Passkey] Login verify error:', verifyError);
      return { success: false, error: 'Не удалось войти' };
    }

    // Шаг 4: Устанавливаем сессию в Supabase
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: verifyData.access_token,
      refresh_token: verifyData.refresh_token,
    });

    if (sessionError) {
      console.error('[Passkey] Session error:', sessionError);
      return { success: false, error: 'Не удалось установить сессию' };
    }

    console.log('[Passkey] Login successful');

    return { success: true };
  } catch (error: any) {
    console.error('[Passkey] Login error:', error);

    // Обрабатываем типичные ошибки
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Вход отменён пользователем' };
    }

    return { success: false, error: error.message || 'Неизвестная ошибка' };
  }
}

// ============================================
// Management
// ============================================

/**
 * Получает список зарегистрированных Passkeys текущего пользователя
 */
export async function listPasskeys(): Promise<{
  success: boolean;
  passkeys?: PasskeyCredential[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('passkey_credentials')
      .select('id, user_id, device_name, transports, created_at, last_used_at')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Passkey] List error:', error);
      return { success: false, error: 'Не удалось загрузить список' };
    }

    return { success: true, passkeys: data || [] };
  } catch (error: any) {
    console.error('[Passkey] List error:', error);
    return { success: false, error: error.message || 'Неизвестная ошибка' };
  }
}

/**
 * Удаляет Passkey
 */
export async function deletePasskey(credentialId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('[Passkey] Deleting credential:', credentialId);

    // Проверяем авторизацию
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[Passkey] No active session for delete');
      return { success: false, error: 'Требуется авторизация' };
    }

    console.log('[Passkey] Session user:', session.user.id);

    const { error, count } = await supabase
      .from('passkey_credentials')
      .delete({ count: 'exact' })
      .eq('id', credentialId);

    if (error) {
      console.error('[Passkey] Delete error:', error);
      return { success: false, error: `Ошибка: ${error.message}` };
    }

    console.log('[Passkey] Delete result — rows affected:', count);

    // Supabase может вернуть success даже если RLS заблокировал удаление (0 row affected)
    if (count === 0) {
      console.warn('[Passkey] No rows deleted — possible RLS restriction');
      return { success: false, error: 'Ключ не найден или нет прав на удаление' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Passkey] Delete error:', error);
    return { success: false, error: error.message || 'Неизвестная ошибка' };
  }
}

