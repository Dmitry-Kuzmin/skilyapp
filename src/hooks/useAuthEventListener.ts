// =====================================================
// Auth Event Listener Hook
// =====================================================
// Слушает события Supabase Auth и отправляет их в auth-event-handler
// для отправки Telegram уведомлений о критичных изменениях

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yffjnqegeiorunyvcxkn.supabase.co';

/**
 * Hook для отслеживания Auth событий и отправки уведомлений
 * 
 * @example
 * ```tsx
 * function App() {
 *   useAuthEventListener();
 *   return <YourApp />;
 * }
 * ```
 */
export function useAuthEventListener() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthEventListener] Auth event:', event, session?.user?.id);

      // Получаем текущего пользователя
      const user = session?.user;
      if (!user) return;

      try {
        // Маппинг событий Supabase Auth на наши типы
        const eventMap: Record<string, string> = {
          'PASSWORD_RECOVERY': 'password_reset_request',
          'SIGNED_OUT': 'user_signed_out',
          'TOKEN_REFRESHED': 'token_refreshed',
        };

        // Для событий, которые требуют дополнительной обработки
        // (password changed, email changed) лучше использовать Database Triggers
        // Но для MVP можем обработать здесь

        const eventType = eventMap[event];
        if (!eventType) return; // Пропускаем неизвестные события

        // Вызываем auth-event-handler
        const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-event-handler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            event_type: eventType,
            user_id: user.id,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('[AuthEventListener] Failed to send event:', error);
          return;
        }

        const result = await response.json();
        console.log('[AuthEventListener] Event sent:', eventType, result);
      } catch (error) {
        console.error('[AuthEventListener] Error:', error);
        // Не блокируем приложение при ошибках уведомлений
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

/**
 * Функция для ручной отправки Auth события
 * Используется при изменении пароля/email через API
 * 
 * @example
 * ```tsx
 * async function handlePasswordChange() {
 *   await supabase.auth.updateUser({ password: newPassword });
 *   await sendAuthEvent('password_changed', user.id);
 * }
 * ```
 */
export async function sendAuthEvent(
  eventType: 'password_changed' | 'email_changed' | 'phone_changed' | 
              'identity_linked' | 'identity_unlinked' | 
              'mfa_enrolled' | 'mfa_unenrolled',
  userId: string,
  payload?: {
    old_value?: string;
    new_value?: string;
    provider_name?: string;
    provider_email?: string;
    location?: string;
    device_info?: string;
    ip_address?: string;
  }
): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-event-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        user_id: userId,
        ...payload,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[sendAuthEvent] Failed:', error);
      return false;
    }

    const result = await response.json();
    console.log('[sendAuthEvent] Success:', result);
    return result.success === true;
  } catch (error) {
    console.error('[sendAuthEvent] Error:', error);
    return false;
  }
}


