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
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
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
        // Прямые свойства viewport safe area (могут быть доступны напрямую)
        viewportSafeAreaInsetTop?: number;
        viewportSafeAreaInsetBottom?: number;
        viewportSafeAreaInsetLeft?: number;
        viewportSafeAreaInsetRight?: number;
        // Стабильная высота viewport без клавиатуры
        viewportStableHeight?: number;
        viewportHeight?: number;
        // Дополнительные свойства
        platform?: string;
        version?: string;
        isExpanded?: boolean;
        // События для динамических обновлений
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
        isVersionAtLeast: (version: string) => boolean;
        requestFullscreen?: () => void;
        openTelegramLink: (url: string) => void;
        // Haptic Feedback
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'selection_changed') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export {};
