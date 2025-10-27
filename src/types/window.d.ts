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
        initData?: string;
        initDataUnsafe?: {
          user?: TelegramUser;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        MainButton: {
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
        };
        // Safe area insets для Dynamic Island, статус-бар, home indicator
        safeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        // Content safe area insets от UI Telegram
        contentSafeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        // Стабильная высота viewport без клавиатуры
        viewportStableHeight?: number;
        viewportHeight?: number;
        // События для динамических обновлений
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
        isVersionAtLeast: (version: string) => boolean;
        requestFullscreen?: () => void;
      };
    };
  }
}

export {};
