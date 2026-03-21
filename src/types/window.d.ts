export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  /** Имеет ли пользователь Telegram Premium подписку */
  is_premium?: boolean;
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
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        switchInlineQuery?: (query: string, chatTypes?: string[]) => void;
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
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        // Popups and dialogs
        showAlert?: (message: string) => void;
        showConfirm?: (message: string, callback: (confirmed: boolean) => void) => void;
        showPopup?: (params: {
          message: string;
          buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text: string;
          }>;
        }, callback: (buttonId: string | null) => void) => void;
        // Payment (Telegram Stars)
        openInvoice?: (invoiceLink: string, callback: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
        // Open external link in Telegram browser
        openLink?: (url: string) => void;
        // Closing confirmation (защита от случайного закрытия)
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        // Share to Stories (требует Telegram Premium, доступно с версии 7.8+)
        shareToStory?: (
          mediaUrl: string,
          params?: {
            text?: string;
            widget_link?: {
              url: string;
              name?: string;
            };
          }
        ) => void;
        // Bottom Button (Bot API 9.5+)
        BottomButton?: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          hasShineEffect: boolean;
          iconCustomEmojiId?: string;
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
          setParams: (params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_visible?: boolean;
            is_active?: boolean;
            has_shine_effect?: boolean;
            icon_custom_emoji_id?: string;
          }) => void;
        };
      };
    };
  }
}

export { };
