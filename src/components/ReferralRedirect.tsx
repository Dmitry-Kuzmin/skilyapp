import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { isTelegramMiniApp, getTelegramWebApp } from '@/lib/telegram';
import { Loader2 } from 'lucide-react';

/**
 * Компонент для обработки реферальных ссылок /join/:code
 * - Если пользователь авторизован → показываем сообщение
 * - Если не авторизован → сохраняем код и редирект на главную с баннером
 * 
 * КРИТИЧНО для Telegram Web App:
 * - Использует window.location для редиректа (надежнее чем navigate в iframe)
 * - Показывает визуальную обратную связь
 */
export function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useUserContext();
  const [processing, setProcessing] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!code) {
      redirectToHome();
      return;
    }

    // Ждем загрузки контекста пользователя
    if (isLoading) {
      return;
    }

    handleReferralCode(code.toUpperCase());
  }, [code, isAuthenticated, isLoading]);

  const handleReferralCode = async (referralCode: string) => {
    try {
      // КРИТИЧНО: Всегда сохраняем код в sessionStorage (даже для авторизованных)
      // Это позволяет применить код при следующей регистрации
      sessionStorage.setItem('referral_code', referralCode);
      console.log('[ReferralRedirect] Referral code saved:', referralCode);

      if (isAuthenticated) {
        // Если пользователь уже зарегистрирован
        toast.info('Вы уже зарегистрированы. Поделитесь ссылкой с друзьями!', { duration: 3000 });
      } else {
        // Для новых пользователей
        toast.success('Регистрируйтесь и получите +50 монет! 🎁', { duration: 5000 });
      }

      // Небольшая задержка для показа toast
      await new Promise(resolve => setTimeout(resolve, 500));
      
      redirectToHome();
    } catch (error) {
      console.error('[ReferralRedirect] Error:', error);
      toast.error('Ошибка обработки реферальной ссылки');
      redirectToHome();
    } finally {
      setProcessing(false);
    }
  };

  const redirectToHome = () => {
    setRedirecting(true);
    
    const isTelegram = isTelegramMiniApp();
    const webApp = getTelegramWebApp();

    // КРИТИЧНО для Telegram Web App: используем window.location вместо navigate
    // Это более надежно работает в iframe контексте Telegram
    if (isTelegram && webApp) {
      console.log('[ReferralRedirect] Redirecting in Telegram Web App via window.location');
      // В Telegram используем window.location для надежного редиректа
      setTimeout(() => {
        window.location.href = window.location.origin + '/';
      }, 800);
    } else {
      // В обычном браузере используем navigate
      console.log('[ReferralRedirect] Redirecting via navigate');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 800);
    }
  };

  // Показываем загрузку во время обработки
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto" />
        <div className="space-y-2">
          <p className="text-white text-lg font-semibold">
            {processing ? 'Обработка реферальной ссылки...' : 'Перенаправление...'}
          </p>
          {code && (
            <p className="text-zinc-400 text-sm">
              Код: <span className="font-mono font-semibold text-indigo-400">{code.toUpperCase()}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
