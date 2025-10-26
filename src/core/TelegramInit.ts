import { TelegramUser, PuzzleCodeData } from "@/types/window";

export function initTelegram() {
  if (typeof window === 'undefined') return;

  if (window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();

      const user = window.Telegram.WebApp.initDataUnsafe?.user;

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
          platform: 'telegram'
        });
      }
    } catch (error) {
      console.error('[Telegram Init] Error:', error);
    }
  } else {
    // Web platform
    if (!window.puzzleCodeData) {
      window.puzzleCodeData = {
        PLATFORM: 'web'
      };
    }
  }
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
