import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DeepLinkData } from "@/lib/telegramNotifications";

/**
 * Компонент для обработки deep links из Telegram без перезагрузки страницы
 * Должен быть внутри BrowserRouter
 */
export function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем наличие deep link в sessionStorage
    const deepLinkStr = sessionStorage.getItem('telegram_deeplink');
    if (!deepLinkStr) return;

    try {
      const deepLink: DeepLinkData = JSON.parse(deepLinkStr);
      console.log('[DeepLinkHandler] Processing deep link:', deepLink);

      // Удаляем deep link из sessionStorage, чтобы не обрабатывать повторно
      sessionStorage.removeItem('telegram_deeplink');

      // Навигация в зависимости от action
      switch (deepLink.action) {
        case 'duel':
          if (deepLink.id) {
            console.log('[DeepLinkHandler] Navigating to duel with code:', deepLink.id);
            navigate(`/games/duel?code=${deepLink.id}`, { replace: true });
          }
          break;
        
        case 'ref':
          if (deepLink.id) {
            console.log('[DeepLinkHandler] Referral code already stored, navigating to dashboard');
            // Код уже сохранен в TelegramInit, просто переходим на dashboard
            navigate('/dashboard', { replace: true });
          }
          break;
        
        case 'test':
          if (deepLink.id) {
            console.log('[DeepLinkHandler] Navigating to test:', deepLink.id);
            navigate(`/test?topic=${deepLink.id}`, { replace: true });
          }
          break;
        
        case 'learn':
          console.log('[DeepLinkHandler] Navigating to learning');
          navigate('/learning', { replace: true });
          break;
        
        case 'dashboard':
          console.log('[DeepLinkHandler] Navigating to dashboard');
          navigate('/dashboard', { replace: true });
          break;
        
        case 'exam-prep':
          console.log('[DeepLinkHandler] Navigating to tests');
          navigate('/tests', { replace: true });
          break;
        
        case 'daily-bonus':
          console.log('[DeepLinkHandler] Navigating to daily bonus');
          navigate('/daily-bonus', { replace: true });
          break;
        
        default:
          console.log('[DeepLinkHandler] Unknown deep link action:', deepLink.action);
      }
    } catch (error) {
      console.error('[DeepLinkHandler] Error parsing deep link:', error);
      sessionStorage.removeItem('telegram_deeplink');
    }
  }, [navigate]);

  return null; // Компонент не рендерит ничего
}

