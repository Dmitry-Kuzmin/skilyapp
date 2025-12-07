import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Компонент для обработки OAuth callback (Google, etc.)
 * Извлекает токены из URL hash и обменивает их на сессию Supabase
 * 
 * Должен быть размещен в App.tsx на уровне роутера
 */
export function OAuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Предотвращаем повторную обработку
    if (hasProcessedRef.current) {
      return;
    }

    const handleOAuthCallback = async () => {
      // Проверяем наличие токенов в URL hash
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token')) {
        return; // Нет OAuth токенов в URL
      }

      // Помечаем как обработанное, чтобы не обрабатывать повторно
      hasProcessedRef.current = true;

      console.log('[OAuthCallbackHandler] OAuth tokens detected in URL hash:', hash.substring(0, 50) + '...');

      try {
        // КРИТИЧНО: Supabase автоматически обрабатывает токены из hash
        // Но нужно явно вызвать getSession() чтобы обновить состояние
        // Также можно использовать getSession() с waitForSession для надежности
        let attempts = 0;
        const maxAttempts = 10;
        
        const waitForSession = async (): Promise<{ session: any; error: any }> => {
          while (attempts < maxAttempts) {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (session?.user) {
              return { session, error: null };
            }
            
            if (error && !error.message.includes('session')) {
              return { session: null, error };
            }
            
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          // Последняя попытка
          const { data: { session }, error } = await supabase.auth.getSession();
          return { session, error };
        };

        const { session, error } = await waitForSession();

        if (error) {
          console.error('[OAuthCallbackHandler] Error getting session:', error);
          // Очищаем hash и редиректим на главную
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }

        if (session?.user) {
          console.log('[OAuthCallbackHandler] ✅ Session created successfully:', session.user.email);
          
          // Очищаем hash от токенов (безопасность)
          window.location.hash = '';
          
          // Редиректим на dashboard
          // Используем window.location.href для полной перезагрузки
          // Это гарантирует, что UserProvider загрузится и обработает новую сессию
          // Особенно важно, если мы на лендинге (где UserProvider может отсутствовать)
          console.log('[OAuthCallbackHandler] Redirecting to dashboard...');
          window.location.href = '/dashboard';
        } else {
          console.warn('[OAuthCallbackHandler] No session found after OAuth callback');
          // Очищаем hash и редиректим на главную
          window.location.hash = '';
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('[OAuthCallbackHandler] Exception handling OAuth callback:', error);
        // Очищаем hash и редиректим на главную
        window.location.hash = '';
        navigate('/', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, location]);

  return null; // Компонент не рендерит ничего
}

