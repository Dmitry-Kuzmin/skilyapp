import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DeepLinkData, extractDeepLink } from "@/lib/telegramNotifications";

/**
 * Компонент для обработки deep links из Telegram без перезагрузки страницы
 * Должен быть внутри BrowserRouter
 */
export function DeepLinkHandler() {
  const navigate = useNavigate();

  const processDeepLink = useCallback((deepLink: DeepLinkData) => {
    console.log('[DeepLinkHandler] Processing deep link:', deepLink);

    // Навигация в зависимости от action
    switch (deepLink.action) {
      case 'navigate':
        if (deepLink.params?.path) {
          const path = '/' + deepLink.params.path.replace(/^\//, '');
          console.log('[DeepLinkHandler] Navigate to path:', path);
          navigate(path, { replace: true });
        }
        break;

      case 'duel':
        if (deepLink.id) {
          if (deepLink.id === 'new') {
            console.log('[DeepLinkHandler] Navigating to create new duel');
            navigate('/games/duel', { replace: true });
          } else {
            console.log('[DeepLinkHandler] Navigating to duel with code:', deepLink.id);
            navigate(`/games/duel?code=${deepLink.id}`, { replace: true });
          }
        } else {
          navigate('/games/duel', { replace: true });
        }
        break;

      case 'ref':
        if (deepLink.id) {
          console.log('[DeepLinkHandler] Referral code already stored, navigating to dashboard');
          navigate('/dashboard', { replace: true });
        }
        break;

      case 'blog':
        if (deepLink.id) {
          console.log('[DeepLinkHandler] Navigating to blog article:', deepLink.id);
          navigate(`/blog/${deepLink.id}`, { replace: true });
        }
        break;

      case 'test':
        if (deepLink.id) {
          console.log('[DeepLinkHandler] Navigating to test:', deepLink.id);
          navigate(`/test?topic=${deepLink.id}`, { replace: true });
        }
        break;

      case 'learn':
      case 'learning':
        console.log('[DeepLinkHandler] Navigating to learning');
        navigate('/learning', { replace: true });
        break;

      case 'dashboard':
        console.log('[DeepLinkHandler] Navigating to dashboard');
        navigate('/dashboard', { replace: true });
        break;

      case 'tests':
      case 'exam-prep':
        console.log('[DeepLinkHandler] Navigating to tests');
        navigate('/tests', { replace: true });
        break;

      case 'games':
        console.log('[DeepLinkHandler] Navigating to games');
        navigate('/games', { replace: true });
        break;

      case 'daily-bonus':
        console.log('[DeepLinkHandler] Navigating to daily bonus');
        navigate('/daily-bonus', { replace: true });
        break;

      case 'settings':
        console.log('[DeepLinkHandler] Navigating to settings');
        navigate('/settings', { replace: true });
        break;

      case 'inventory':
        console.log('[DeepLinkHandler] Navigating to inventory');
        navigate('/inventory', { replace: true });
        break;

      case 'road-signs':
      case 'sign':
        console.log('[DeepLinkHandler] Navigating to road signs with ID:', deepLink.id);
        const signQuery = deepLink.id ? `?search=${deepLink.id}` : '';
        navigate(`/road-signs${signQuery}`, { replace: true });
        break;

      case 'dictionary':
        console.log('[DeepLinkHandler] Navigating to dictionary');
        navigate('/dictionary', { replace: true });
        break;

      case 'premium':
      case 'paywall':
        console.log('[DeepLinkHandler] Opening premium/paywall via deep link');
        navigate('/dashboard?modal=paywall', { replace: true });
        break;

      case 'ton-pay':
      case 'wallet':
      case 'ton':
        console.log('[DeepLinkHandler] Opening TON payment modal via deep link');
        // Handle '1_5' -> '1.5' conversion for Telegram start_param compatibility
        const amount = (deepLink.id || '1.5').replace('_', '.');
        navigate(`/dashboard?modal=ton-pay&amount=${amount}&autoPay=true`, { replace: true });
        break;

      default:
        console.log('[DeepLinkHandler] Unknown deep link action:', deepLink.action);
    }
  }, [navigate]);

  useEffect(() => {
    const checkAndProcess = () => {
      // 1. Проверяем наличие deep link в sessionStorage (установлено при загрузке)
      const deepLinkStr = sessionStorage.getItem('telegram_deeplink');
      if (deepLinkStr) {
        try {
          const deepLink: DeepLinkData = JSON.parse(deepLinkStr);
          processDeepLink(deepLink);
          sessionStorage.removeItem('telegram_deeplink');
          return; // Приоритет sessionStorage
        } catch (e) {
          sessionStorage.removeItem('telegram_deeplink');
        }
      }

      // 2. Проверяем напрямую через WebApp (если приложение было открыто)
      const deepLink = extractDeepLink();
      if (deepLink) {
        // Чтобы не зацикливаться, проверяем не обрабатывали ли мы этот ID в текущей сессии
        // Но для навигационных ссылок это обычно безопасно
        processDeepLink(deepLink);
      }
    };

    // Проверяем при монтировании
    checkAndProcess();

    // Слушаем возвращение в приложение
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[DeepLinkHandler] App visible, checking for new deep links...');
        checkAndProcess();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [processDeepLink]);

  return null;
}

