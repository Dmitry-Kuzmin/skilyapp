import { TelegramUser, PuzzleCodeData } from "@/types/window";
import { 
  getTelegramWebApp, 
  initTelegramApp, 
  getTelegramUser as getTelegramUserFromLib 
} from "@/lib/telegram";
import { extractDeepLink, DeepLinkData } from "@/lib/telegramNotifications";

export function initTelegram() {
  if (typeof window === 'undefined') return null;

  const webApp = getTelegramWebApp();
  
  if (webApp) {
    try {
      // Initialize Telegram WebApp
      initTelegramApp();
      
      console.log('[Telegram Init] WebApp detected');
      console.log('[Telegram Init] initData:', webApp.initData);
      console.log('[Telegram Init] initDataUnsafe:', webApp.initDataUnsafe);

      // Обрабатываем deep link
      const deepLink = extractDeepLink();
      if (deepLink) {
        console.log('[Telegram Init] Deep link detected:', deepLink);
        handleDeepLink(deepLink);
      }

      const user = getTelegramUserFromLib();

      if (user) {
        window.puzzleUser = user;
        window.puzzleCodeData = {
          FIRST_NAME: user.first_name,
          LAST_NAME: user.last_name,
          USERNAME: user.username,
          ID: user.id,
          LANGUAGE: user.language_code,
          PLATFORM: 'telegram'
        };

        console.log('[Telegram Init] User initialized:', {
          id: user.id,
          name: user.first_name,
          username: user.username,
          photo_url: user.photo_url,
          platform: 'telegram'
        });

        return user;
      } else {
        console.log('[Telegram Init] No user data in initDataUnsafe, but WebApp exists');
        // WebApp exists but no user yet - это тоже Telegram платформа
        window.puzzleCodeData = {
          PLATFORM: 'telegram'
        };
        return null;
      }
    } catch (error) {
      console.error('[Telegram Init] Error:', error);
      return null;
    }
  } else {
    // Web platform
    console.log('[Telegram Init] No WebApp - running in web mode');
    if (!window.puzzleCodeData) {
      window.puzzleCodeData = {
        PLATFORM: 'web'
      };
    }
  }

  return null;
}

/**
 * Обработка deep links из Telegram уведомлений
 */
function handleDeepLink(deepLink: DeepLinkData): void {
  console.log('[Telegram Init] Handling deep link:', deepLink);

  // Сохраняем deep link для обработки после загрузки приложения
  sessionStorage.setItem('telegram_deeplink', JSON.stringify(deepLink));

  // Навигация в зависимости от action
  setTimeout(() => {
    switch (deepLink.action) {
      case 'duel':
        if (deepLink.id) {
          console.log('[Telegram Init] Navigating to duel with code:', deepLink.id);
          window.location.href = `/games/duel?code=${deepLink.id}`;
        }
        break;
      
      case 'ref':
        if (deepLink.id) {
          console.log('[Telegram Init] Storing referral code:', deepLink.id);
          // Сохраняем код для использования при регистрации
          sessionStorage.setItem('referral_code', deepLink.id.toUpperCase());
          // Перенаправляем на главную
          window.location.href = '/';
        }
        break;
      
      case 'test':
        if (deepLink.id) {
          console.log('[Telegram Init] Navigating to test:', deepLink.id);
          window.location.href = `/test?topic=${deepLink.id}`;
        }
        break;
      
      case 'learn':
        console.log('[Telegram Init] Navigating to learn');
        window.location.href = '/learn';
        break;
      
      case 'dashboard':
        console.log('[Telegram Init] Navigating to dashboard');
        window.location.href = '/dashboard';
        break;
      
      case 'exam-prep':
        console.log('[Telegram Init] Navigating to exam prep');
        window.location.href = '/exam-prep';
        break;
      
      case 'daily-bonus':
        console.log('[Telegram Init] Navigating to daily bonus');
        window.location.href = '/daily-bonus';
        break;
      
      default:
        console.log('[Telegram Init] Unknown deep link action:', deepLink.action);
    }
  }, 100); // Небольшая задержка для корректной навигации
}

export function isTelegramPlatform(): boolean {
  return !!window.Telegram?.WebApp;
}

export function getTelegramUser(): TelegramUser | null {
  return window.puzzleUser || null;
}

export function getPlatform(): 'telegram' | 'web' {
  return window.puzzleCodeData?.PLATFORM || 'web';
}
