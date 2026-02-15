import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Хук для управления сессией Supabase с обработкой ошибок
 * 
 * Решает проблемы:
 * 1. Ошибка "Invalid Refresh Token" - фильтруется как нормальное поведение
 * 2. Логирование только реальных ошибок аутентификации
 */
export function useSession() {
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          // Фильтруем ошибку "Refresh Token Not Found" - это норма для чистого браузера
          if (error.message?.includes('Refresh Token') ||
            error.message?.includes('refresh_token_not_found') ||
            (error as any).status === 400) {

            // Если это 400 ошибка, значит токен в localStorage протух окончательно
            if ((error as any).status === 400) {
              console.warn('[useSession] 🚨 Invalid refresh token (400), clearing auth storage...');
              localStorage.removeItem('sb-yffjnqegeiorunyvcxkn-auth-token');
              // Можно не перезагружать, Supabase клиент сам обновит состояние
            }

            if (import.meta.env.DEV) {
              console.debug('[useSession] Session expired or missing, require login');
            }
            return;
          }

          // Логируем только реальные ошибки
          console.error('[useSession] Auth error:', error);
        } else if (data?.session) {

          if (import.meta.env.DEV) {
            console.debug('[useSession] Session restored:', {
              userId: data.session.user.id,
              expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
            });
          }
        }
      } catch (error) {
        // Обрабатываем неожиданные ошибки
        console.error('[useSession] Unexpected error:', error);
      }
    };

    initSession();
  }, []);
}

