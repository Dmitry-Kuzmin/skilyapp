import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


// Импортируем SUPABASE_URL для проверки localStorage
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  'https://yffjnqegeiorunyvcxkn.supabase.co';

/**
 * Компонент для обработки OAuth callback (Google, etc.)
 * Извлекает токены из URL hash и создает сессию Supabase вручную
 * 
 * КРИТИЧНО: В supabase/client.ts установлено detectSessionInUrl: false
 * Это значит, что Supabase НЕ обрабатывает токены из hash автоматически
 * Нужно вручную создать сессию используя setSession()
 * 
 * Должен быть размещен в App.tsx на уровне роутера
 */
export function OAuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessedRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // КРИТИЧНО: Не обрабатываем OAuth callback на /auth/callback
    // Там это делает AuthCallback компонент
    if (location.pathname === '/auth/callback') {
      console.log('[OAuthCallbackHandler] Skipping - using AuthCallback page for OAuth');
      return;
    }

    // Логируем каждый раз, когда компонент монтируется или location меняется
    console.log('[OAuthCallbackHandler] Component mounted/updated, checking for OAuth tokens...', {
      pathname: location.pathname,
      hash: window.location.hash ? window.location.hash.substring(0, 50) + '...' : 'empty',
      hasProcessed: hasProcessedRef.current,
    });

    // Предотвращаем повторную обработку
    if (hasProcessedRef.current) {
      console.log('[OAuthCallbackHandler] Already processed, skipping');
      return;
    }

    const handleOAuthCallback = async () => {
      // Проверяем наличие токенов в URL hash
      const hash = window.location.hash;
      console.log('[OAuthCallbackHandler] Checking hash:', {
        hasHash: !!hash,
        hashLength: hash?.length || 0,
        containsAccessToken: hash?.includes('access_token') || false,
        hashPreview: hash ? hash.substring(0, 100) + '...' : 'empty',
      });

      if (!hash || !hash.includes('access_token')) {
        console.log('[OAuthCallbackHandler] No OAuth tokens in hash, exiting');
        return; // Нет OAuth токенов в URL
      }

      // Помечаем как обработанное, чтобы не обрабатывать повторно
      hasProcessedRef.current = true;

      // Показываем индикатор загрузки
      setIsProcessing(true);

      console.log('[OAuthCallbackHandler] OAuth tokens detected in URL hash:', hash.substring(0, 50) + '...');

      // Извлекаем параметры из hash
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');
      const expiresIn = hashParams.get('expires_in');

      console.log('[OAuthCallbackHandler] Token details:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenType,
        expiresIn,
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
      });

      // Проверяем наличие обязательных токенов
      if (!accessToken || !refreshToken) {
        console.error('[OAuthCallbackHandler] Missing required tokens in hash');
        setIsProcessing(false);
        window.location.hash = '';
        navigate('/', { replace: true });
        return;
      }

      try {
        // КРИТИЧНО: В supabase/client.ts установлено detectSessionInUrl: false
        // Это значит, что Supabase НЕ обрабатывает токены из hash автоматически
        // Нужно вручную создать сессию используя setSession()

        console.log('[OAuthCallbackHandler] Creating session from tokens manually using setSession()...');

        // Вручную создаем сессию из токенов
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessionError) {
          console.error('[OAuthCallbackHandler] Error setting session:', setSessionError);
          console.error('[OAuthCallbackHandler] Error details:', {
            message: setSessionError.message,
            name: setSessionError.name,
            status: setSessionError.status,
          });
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }

        if (!sessionData?.session) {
          console.error('[OAuthCallbackHandler] No session created from tokens');
          console.error('[OAuthCallbackHandler] Session data:', sessionData);
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }

        console.log('[OAuthCallbackHandler] ✅ Session created successfully:', {
          email: sessionData.session.user.email,
          userId: sessionData.session.user.id,
          expiresAt: sessionData.session.expires_at,
        });

        // КРИТИЧНО: Убеждаемся, что сессия сохранена в localStorage
        // Supabase должен автоматически сохранить через persistSession: true
        // Но даем время для сохранения и проверяем
        await new Promise(resolve => setTimeout(resolve, 500));

        // Проверяем что сессия действительно создана и сохранена
        const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession();

        if (verifyError) {
          console.error('[OAuthCallbackHandler] Session verification error:', verifyError);
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }

        if (!verifiedSession) {
          console.error('[OAuthCallbackHandler] ⚠️ Session not found after creation!');
          console.error('[OAuthCallbackHandler] This means session was not saved to localStorage');
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }

        console.log('[OAuthCallbackHandler] ✅ Session verified and saved:', verifiedSession.user.email);

        // Дополнительная проверка: убеждаемся что сессия в localStorage
        // Supabase использует ключ вида: sb-{project-ref}-auth-token
        const projectRef = SUPABASE_URL.split('//')[1].split('.')[0];
        const supabaseAuthKey = `sb-${projectRef}-auth-token`;
        const storedSession = localStorage.getItem(supabaseAuthKey);

        if (!storedSession) {
          console.warn('[OAuthCallbackHandler] ⚠️ Session not found in localStorage!');
          console.warn('[OAuthCallbackHandler] Key checked:', supabaseAuthKey);
          console.warn('[OAuthCallbackHandler] Available keys:', Object.keys(localStorage).filter(k => k.includes('auth')));

          // Пробуем сохранить сессию вручную
          try {
            const sessionJson = JSON.stringify({
              access_token: verifiedSession.access_token,
              refresh_token: verifiedSession.refresh_token,
              expires_at: verifiedSession.expires_at,
              expires_in: verifiedSession.expires_in,
              token_type: verifiedSession.token_type,
              user: verifiedSession.user,
            });
            localStorage.setItem(supabaseAuthKey, sessionJson);
            console.log('[OAuthCallbackHandler] ✅ Manually saved session to localStorage');
          } catch (err) {
            console.error('[OAuthCallbackHandler] Failed to manually save session:', err);
            setIsProcessing(false);
            window.location.hash = '';
            navigate('/', { replace: true });
            return;
          }
        } else {
          console.log('[OAuthCallbackHandler] ✅ Session confirmed in localStorage');
        }

        // Очищаем hash от токенов (безопасность)
        window.location.hash = '';

        // Редиректим на dashboard
        // Используем window.location.href для полной перезагрузки
        // Это гарантирует, что UserProvider загрузится и обработает новую сессию
        console.log('[OAuthCallbackHandler] Redirecting to dashboard...');

        // Небольшая задержка перед редиректом, чтобы убедиться что все обработано
        // Индикатор загрузки останется видимым до редиректа
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 300);
      } catch (error) {
        console.error('[OAuthCallbackHandler] Exception handling OAuth callback:', error);
        setIsProcessing(false);
        // Очищаем hash и редиректим на главную
        window.location.hash = '';
        navigate('/', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, location]);

  // Показываем полноэкранный индикатор загрузки во время обработки OAuth
  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-12 w-12 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-white">Завершение входа...</p>
            <p className="text-sm text-zinc-400">Пожалуйста, подождите</p>
          </div>
        </div>
      </div>
    );
  }

  return null; // Компонент не рендерит ничего
}
