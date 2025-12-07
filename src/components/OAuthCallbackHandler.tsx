import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
        
        console.log('[OAuthCallbackHandler] Creating session from tokens manually...');
        
        // Вручную создаем сессию из токенов
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (setSessionError) {
          console.error('[OAuthCallbackHandler] Error setting session:', setSessionError);
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }
        
        if (!sessionData?.session) {
          console.error('[OAuthCallbackHandler] No session created from tokens');
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }
        
        console.log('[OAuthCallbackHandler] ✅ Session created successfully:', sessionData.session.user.email);
        
        // Даем время для сохранения сессии
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Проверяем что сессия действительно создана
        const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession();
        
        if (verifyError || !verifiedSession) {
          console.error('[OAuthCallbackHandler] Session verification failed:', verifyError);
          setIsProcessing(false);
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }
        
        console.log('[OAuthCallbackHandler] ✅ Session verified:', verifiedSession.user.email);
        
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
          <Loader2 className="h-12 w-12 animate-spin text-white" />
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
