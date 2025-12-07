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

  useEffect(() => {
    console.log('[AuthCallback] Component mounted, checking for OAuth tokens...');
    console.log('[AuthCallback] Hash:', window.location.hash ? window.location.hash.substring(0, 50) + '...' : 'empty');

    // Проверяем наличие токенов в hash
    const hash = window.location.hash;
    const hasTokens = hash && hash.includes('access_token');

    if (!hasTokens) {
      console.warn('[AuthCallback] No OAuth tokens in hash, redirecting to home');
      setStatus('error');
      setError('No OAuth tokens found');
      setTimeout(() => navigate('/', { replace: true }), 2000);
      return;
    }

    console.log('[AuthCallback] OAuth tokens detected, waiting for Supabase to process...');

    // Функция для безопасного редиректа (предотвращает множественные редиректы)
    const redirectToDashboard = async () => {
      if (hasRedirectedRef.current) {
        console.log('[AuthCallback] Already redirected, skipping');
        return;
      }

      hasRedirectedRef.current = true;
      setStatus('success');

      // Небольшая задержка, чтобы убедиться что сессия сохранена
      await new Promise(resolve => setTimeout(resolve, 300));

      // Проверяем что сессия действительно сохранена
      const { data: { session: verifiedSession } } = await supabase.auth.getSession();
      if (verifiedSession) {
        console.log('[AuthCallback] ✅ Session verified, redirecting to dashboard...');
        // Очищаем hash от токенов (безопасность)
        window.location.hash = '';
        // Используем window.location.href для полной перезагрузки
        // Это гарантирует что UserProvider загрузится и обработает сессию
        window.location.href = '/dashboard';
      } else {
        console.error('[AuthCallback] ⚠️ Session not found after verification');
        setStatus('error');
        setError('Session not found');
        hasRedirectedRef.current = false; // Разрешаем повторить попытку
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    };

    // Supabase JS автоматически обработает токены из hash (detectSessionInUrl: true)
    // Нам нужно только дождаться события SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthCallback] Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          console.log('[AuthCallback] ✅ Session established:', session.user.email);
          await redirectToDashboard();
        } else if (event === 'SIGNED_OUT') {
          console.warn('[AuthCallback] User signed out during callback');
          setStatus('error');
          setError('Sign in failed');
          setTimeout(() => navigate('/', { replace: true }), 2000);
        }
      }
    );

    // Также проверяем существующую сессию (на случай если Supabase уже обработал)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('[AuthCallback] ✅ Session already exists:', session.user.email);
        redirectToDashboard();
      }
    });

    // Таймаут на случай если событие не придет
    const timeout = setTimeout(() => {
      if (hasRedirectedRef.current) {
        console.log('[AuthCallback] Already redirected, skipping timeout');
        return;
      }

      console.warn('[AuthCallback] ⚠️ Timeout waiting for SIGNED_IN event');
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          console.log('[AuthCallback] ✅ Session found after timeout:', session.user.email);
          redirectToDashboard();
        } else {
          console.error('[AuthCallback] ❌ No session found after timeout');
          setStatus('error');
          setError('Authentication timeout');
          setTimeout(() => navigate('/', { replace: true }), 2000);
        }
      });
    }, 10000); // 10 секунд таймаут

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
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

