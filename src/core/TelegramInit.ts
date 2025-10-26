import { TelegramUser, PuzzleCodeData } from "@/types/window";
import { 
  getTelegramWebApp, 
  initTelegramApp, 
  getTelegramUser as getTelegramUserFromLib 
} from "@/lib/telegram";

export function initTelegram() {
  if (typeof window === 'undefined') return;

  const webApp = getTelegramWebApp();
  
  if (webApp) {
    try {
      // Initialize Telegram WebApp
      initTelegramApp();

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
        console.log('[Telegram Init] No user data available in initDataUnsafe');
      }
    } catch (error) {
      console.error('[Telegram Init] Error:', error);
    }
  } else {
    // Web platform
    console.log('[Telegram Init] Running in web mode');
    if (!window.puzzleCodeData) {
      window.puzzleCodeData = {
        PLATFORM: 'web'
      };
    }
  }

  return null;
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
