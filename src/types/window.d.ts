export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface PuzzleCodeData {
  FIRST_NAME?: string;
  LAST_NAME?: string;
  USERNAME?: string;
  ID?: number;
  LANGUAGE?: string;
  PLATFORM?: 'telegram' | 'web';
}

declare global {
  interface Window {
    puzzleUser?: TelegramUser | null;
    puzzleCodeData?: PuzzleCodeData;
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe?: {
          user?: TelegramUser;
        };
      };
    };
  }
}

export {};
