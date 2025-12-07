import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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

      try {
        // КРИТИЧНО: Supabase автоматически обрабатывает токены из hash
        // Но нужно дать время для обработки и явно вызвать getSession()
        // Также пробуем getUser() как альтернативу
        
        console.log('[OAuthCallbackHandler] Waiting for Supabase to process tokens...');
        
        // Даем Supabase время обработать токены из hash
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let attempts = 0;
        const maxAttempts = 20; // Увеличиваем до 20 попыток (4 секунды)
        
        const waitForSession = async (): Promise<{ session: any; user: any; error: any }> => {
          while (attempts < maxAttempts) {
            // Пробуем оба метода: getSession() и getUser()
            const [sessionResult, userResult] = await Promise.all([
              supabase.auth.getSession(),
              supabase.auth.getUser()
            ]);
            
            const { data: { session }, error: sessionError } = sessionResult;
            const { data: { user }, error: userError } = userResult;
            
            // Если есть сессия - отлично
            if (session?.user) {
              console.log(`[OAuthCallbackHandler] ✅ Session found on attempt ${attempts + 1}:`, session.user.email);
              return { session, user: session.user, error: null };
            }
            
            // Если есть user но нет session - пробуем еще раз (session может создаваться)
            if (user && !session) {
              console.log(`[OAuthCallbackHandler] User found but no session yet (attempt ${attempts + 1}), waiting...`);
            }
            
            // Если есть критическая ошибка (не связанная с ожиданием)
            if (sessionError && !sessionError.message.includes('session') && !sessionError.message.includes('No session')) {
              console.error('[OAuthCallbackHandler] Critical session error:', sessionError);
              return { session: null, user: null, error: sessionError };
            }
            
            if (userError && !userError.message.includes('session') && !userError.message.includes('No session')) {
              console.error('[OAuthCallbackHandler] Critical user error:', userError);
              return { session: null, user: null, error: userError };
            }
            
            attempts++;
            if (attempts < maxAttempts) {
              // Увеличиваем задержку с каждой попыткой (exponential backoff)
              const delay = Math.min(200 + (attempts * 50), 500);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          // Последняя попытка
          console.log('[OAuthCallbackHandler] Final attempt to get session...');
          const [finalSessionResult, finalUserResult] = await Promise.all([
            supabase.auth.getSession(),
            supabase.auth.getUser()
          ]);
          
          const { data: { session }, error: sessionError } = finalSessionResult;
          const { data: { user }, error: userError } = finalUserResult;
          
          if (session?.user) {
            return { session, user: session.user, error: null };
          }
          
          // Если есть user, но нет session - это странно, но можем попробовать продолжить
          if (user) {
            console.warn('[OAuthCallbackHandler] User found but no session - this is unusual');
            return { session: null, user, error: null };
          }
          
          return { session: null, user: null, error: sessionError || userError };
        };

        const { session, user, error } = await waitForSession();

        if (error) {
          console.error('[OAuthCallbackHandler] Error getting session:', error);
          setIsProcessing(false);
          // Очищаем hash и редиректим на главную
          window.location.hash = '';
          navigate('/', { replace: true });
          return;
        }

        if (session?.user || user) {
          const email = session?.user?.email || user?.email;
          console.log('[OAuthCallbackHandler] ✅ Session/User found successfully:', email);
          
          // Очищаем hash от токенов (безопасность)
          window.location.hash = '';
          
          // Редиректим на dashboard
          // Используем window.location.href для полной перезагрузки
          // Это гарантирует, что UserProvider загрузится и обработает новую сессию
          // Особенно важно, если мы на лендинге (где UserProvider может отсутствовать)
          console.log('[OAuthCallbackHandler] Redirecting to dashboard...');
          
          // Небольшая задержка перед редиректом, чтобы убедиться что все обработано
          // Индикатор загрузки останется видимым до редиректа
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 300);
        } else {
          console.warn('[OAuthCallbackHandler] No session or user found after OAuth callback');
          console.warn('[OAuthCallbackHandler] Error details:', error);
          console.warn('[OAuthCallbackHandler] Hash was:', hash.substring(0, 100));
          console.warn('[OAuthCallbackHandler] Attempting redirect anyway - UserProvider will check session on dashboard');
          
          // КРИТИЧНО: Даже если сессия не найдена, редиректим на dashboard
          // UserProvider на dashboard проверит сессию при загрузке через onAuthStateChange
          // Это важно, так как на лендинге может не быть UserProvider
          window.location.hash = '';
          
          // Редиректим на dashboard - там UserProvider точно есть и обработает сессию
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 300);
        }
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

