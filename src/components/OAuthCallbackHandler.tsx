import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Компонент для обработки OAuth callback (Google, etc.)
 * Извлекает токены из URL hash и обменивает их на сессию Supabase
 * 
 * Должен быть размещен в App.tsx на уровне роутера
 */
export function OAuthCallbackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Проверяем наличие токенов в URL hash
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token')) {
        return; // Нет OAuth токенов в URL
      }

      console.log('[OAuthCallbackHandler] OAuth tokens detected in URL hash');

      try {
        // Supabase автоматически обрабатывает токены из hash через getSession()
        // Но нужно явно вызвать getSession() чтобы обновить состояние
        const { data: { session }, error } = await supabase.auth.getSession();

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
  }, [navigate]);

  return null; // Компонент не рендерит ничего
}

