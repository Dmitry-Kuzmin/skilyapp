import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Страница-прокладка для обработки OAuth callback
 * 
 * КРИТИЧНО: Эта страница НЕ загружает данные с бэкенда
 * Она только ждет, пока Supabase обработает токены из hash
 * и создаст сессию, затем редиректит на dashboard
 * 
 * Это решает race condition: Dashboard не будет делать запросы
 * до того, как сессия будет готова
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Функция для безопасного редиректа (предотвращает множественные редиректы)
    function redirectToDashboard(session: any) {
      if (hasRedirectedRef.current) {
        console.log('[AuthCallback] Already redirected, skipping');
        return;
      }

      console.log('[AuthCallback] Starting redirect process...', {
        email: session?.user?.email,
        userId: session?.user?.id,
      });

      hasRedirectedRef.current = true;

      // Очищаем таймаут если он еще не сработал
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setStatus('success');

      // POPUP MODE: Если окно открыто как попап, отправляем сообщение родителю
      if (window.opener) {
        console.log('[AuthCallback] Popup detected, sending message to opener...');
        try {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            session: session
          }, window.location.origin);

          setTimeout(() => {
            window.close();
          }, 100);
          return;
        } catch (err) {
          console.error('[AuthCallback] Failed to communicate with opener:', err);
          // Fallback to normal redirect if communication fails
        }
      }

      // Небольшая задержка для UI feedback, затем редирект
      setTimeout(() => {
        console.log('[AuthCallback] ✅ Redirecting to dashboard...');
        // Очищаем hash от токенов (безопасность)
        window.location.hash = '';
        // Используем window.location.href для полной перезагрузки
        // Это гарантирует что UserProvider загрузится и обработает сессию
        window.location.href = '/dashboard';
      }, 300);
    }

    console.log('[AuthCallback] Component mounted, checking for OAuth tokens...');
    console.log('[AuthCallback] Hash:', window.location.hash ? window.location.hash.substring(0, 50) + '...' : 'empty');

    // Проверяем наличие токенов в hash
    const hash = window.location.hash;
    const hasTokens = hash && hash.includes('access_token');

    // КРИТИЧНО: Если hash пустой, но мы на /auth/callback, возможно Supabase уже обработал токены
    // Проверяем сессию ПЕРЕД тем, как редиректить на главную
    if (!hasTokens) {
      console.log('[AuthCallback] No tokens in hash, checking if session already exists...');

      // Проверяем сессию - возможно Supabase уже обработал токены
      supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
        if (sessionError) {
          console.error('[AuthCallback] Error getting session:', sessionError);
        }

        if (session?.user) {
          console.log('[AuthCallback] ✅ Session found (Supabase already processed tokens):', session.user.email);
          // Сессия есть - редиректим на dashboard
          redirectToDashboard(session);
        } else {
          // Нет сессии и нет токенов - редиректим на главную
          console.warn('[AuthCallback] No OAuth tokens in hash and no session, redirecting to home');
          setStatus('error');
          setError('No OAuth tokens found');
          setTimeout(() => navigate('/', { replace: true }), 2000);
        }
      });

      return;
    }

    console.log('[AuthCallback] OAuth tokens detected, waiting for Supabase to process...');

    // КРИТИЧНО: Supabase JS автоматически обработает токены из hash (detectSessionInUrl: true)
    // Нам нужно только дождаться события SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthCallback] Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[AuthCallback] ✅ Session established:', session.user.email);
          redirectToDashboard(session);
        } else if (event === 'SIGNED_OUT') {
          console.warn('[AuthCallback] User signed out during callback');
          if (!hasRedirectedRef.current) {
            setStatus('error');
            setError('Sign in failed');
            setTimeout(() => navigate('/', { replace: true }), 2000);
          }
        }
      }
    );

    // Также проверяем существующую сессию (на случай если Supabase уже обработал)
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('[AuthCallback] Error getting session:', sessionError);
      }
      if (session?.user) {
        console.log('[AuthCallback] ✅ Session already exists:', session.user.email);
        redirectToDashboard(session);
        return;
      }
    });

    // Таймаут на случай если событие не придет (только если еще не редиректили)
    timeoutRef.current = setTimeout(() => {
      if (hasRedirectedRef.current) {
        console.log('[AuthCallback] Already redirected, skipping timeout');
        return;
      }

      console.warn('[AuthCallback] ⚠️ Timeout waiting for SIGNED_IN event, checking session...');
      supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
        if (sessionError) {
          console.error('[AuthCallback] Error getting session on timeout:', sessionError);
        }
        if (session?.user) {
          console.log('[AuthCallback] ✅ Session found after timeout:', session.user.email);
          redirectToDashboard(session);
        } else {
          console.error('[AuthCallback] ❌ No session found after timeout');
          if (!hasRedirectedRef.current) {
            setStatus('error');
            setError('Authentication timeout');
            setTimeout(() => navigate('/', { replace: true }), 2000);
          }
        }
      });
    }, 10000); // 10 секунд таймаут

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-white">
            {status === 'processing' && 'Завершение входа...'}
            {status === 'success' && 'Вход выполнен!'}
            {status === 'error' && 'Ошибка входа'}
          </p>
          <p className="text-sm text-zinc-400">
            {status === 'processing' && 'Пожалуйста, подождите'}
            {status === 'success' && 'Перенаправление...'}
            {status === 'error' && error}
          </p>
        </div>
      </div>
    </div>
  );
}
