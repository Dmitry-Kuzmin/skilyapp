import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { isTelegramMobilePlatformName } from '@/lib/telegram';

// Типы для Telegram WebApp
interface WebApp {
  ready: () => void;
  expand: () => void;
  platform: string;
  version: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentSafeAreaInset?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  disableVerticalSwipes?: () => void;
  onEvent?: (event: string, callback: () => void) => void;
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
  };
}

const TelegramContext = createContext<WebApp | null>(null);

interface TelegramProviderProps {
  children: ReactNode;
}

/**
 * TelegramProvider - Singleton Pattern для единой инициализации Telegram WebApp
 * 
 * Решает проблемы:
 * 1. Множественная инициализация (ready/expand вызываются только один раз)
 * 2. Версионность API (проверка версии перед использованием функций)
 * 3. Централизованное управление состоянием WebApp
 */
export function TelegramProvider({ children }: TelegramProviderProps) {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const initializedRef = useRef(false);
  const debugOverride = import.meta.env.VITE_DEBUG_TELEGRAM === "true";

  useEffect(() => {
    // Singleton: инициализируем только один раз
    if (initializedRef.current) {
      return;
    }

    const tg = (window as any).Telegram?.WebApp;
    const shouldLog = !!tg || debugOverride;
    
    const log = (...args: any[]) => {
      if (shouldLog) {
        console.debug('[TelegramProvider]', ...args);
      }
    };

    if (!tg) {
      if (shouldLog) {
        console.debug('[TelegramProvider] ❌ Telegram WebApp не найден');
      }
      return;
    }

    initializedRef.current = true;
    log('🚀 Инициализация Telegram WebApp (Singleton)');

    // КРИТИЧНО: вызываем ready() и expand() только один раз
    tg.ready();
    
    // АГРЕССИВНЫЙ ПОДХОД: Вызываем expand() множественно для Menu Button
    const forceExpand = () => {
      try {
        if (typeof tg.expand === 'function') {
          tg.expand();
          log('✅ expand() called in TelegramProvider');
        }
      } catch (e) {
        log('⚠️ Error calling expand():', e);
      }
    };
    
    // Вызываем сразу
    forceExpand();
    
    // Вызываем на событиях viewport
    if (typeof tg.onEvent === 'function') {
      tg.onEvent('viewport_changed', () => {
        log('📐 viewport_changed - calling expand()');
        forceExpand();
      });
      
      tg.onEvent('safeAreaChanged', () => {
        log('📐 safeAreaChanged - calling expand()');
        forceExpand();
      });
    }
    
    // Вызываем с задержками
    setTimeout(forceExpand, 10);
    setTimeout(forceExpand, 50);
    setTimeout(forceExpand, 100);
    setTimeout(forceExpand, 200);
    setTimeout(forceExpand, 500);

    // Обработка версионности API (решает проблему №5)
    const version = parseFloat(tg.version || '0');
    if (version >= 6.1 && typeof tg.disableVerticalSwipes === 'function') {
      try {
        tg.disableVerticalSwipes();
        log('✅ Vertical swipes disabled (API 6.1+)');
      } catch (error) {
        // Игнорируем ошибку для версий < 6.1
        log('⚠️ disableVerticalSwipes not supported in version', tg.version);
      }
    } else if (version < 6.1) {
      log('⚠️ API version', tg.version, '- swipes behavior changes not supported');
    }

    // Применяем platform classes
    const platform = tg.platform || 'unknown';
    const isMobilePlatform = isTelegramMobilePlatformName(platform);
    
    document.documentElement.classList.add('telegram-webapp');
    document.body.classList.add('telegram-webapp');
    document.documentElement.classList.toggle('telegram-mobile-app', isMobilePlatform);
    document.documentElement.classList.toggle('telegram-desktop-app', !isMobilePlatform);
    document.body.classList.toggle('telegram-mobile-app', isMobilePlatform);
    document.body.classList.toggle('telegram-desktop-app', !isMobilePlatform);

    // Функция обновления safe areas
    const updateSafeAreas = (eventName?: string) => {
      const topInset = (tg as any).viewportSafeAreaInsetTop ?? tg.safeAreaInset?.top ?? 0;
      const bottomInset = (tg as any).viewportSafeAreaInsetBottom ?? tg.safeAreaInset?.bottom ?? 0;
      const leftInset = (tg as any).viewportSafeAreaInsetLeft ?? tg.safeAreaInset?.left ?? 0;
      const rightInset = (tg as any).viewportSafeAreaInsetRight ?? tg.safeAreaInset?.right ?? 0;
      const contentTop = tg.contentSafeAreaInset?.top ?? 0;
      const contentBottom = tg.contentSafeAreaInset?.bottom ?? 0;

      const safeTop = isMobilePlatform ? topInset : 0;
      const safeBottom = isMobilePlatform ? bottomInset : 0;
      const safeLeft = isMobilePlatform ? leftInset : 0;
      const safeRight = isMobilePlatform ? rightInset : 0;
      const contentTopValue = isMobilePlatform ? Math.round(contentTop / 2) : 0;
      const contentBottomValue = isMobilePlatform ? Math.round(contentBottom / 2) : 0;

      document.documentElement.style.setProperty('--app-safe-top', `${safeTop}px`);
      document.documentElement.style.setProperty('--app-safe-bottom', `${safeBottom}px`);
      document.documentElement.style.setProperty('--app-safe-left', `${safeLeft}px`);
      document.documentElement.style.setProperty('--app-safe-right', `${safeRight}px`);
      document.documentElement.style.setProperty('--app-content-top', `${contentTopValue}px`);
      document.documentElement.style.setProperty('--app-content-bottom', `${contentBottomValue}px`);

      // Для обратной совместимости
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${isMobilePlatform ? tg.contentSafeAreaInset?.top ?? topInset : 0}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${isMobilePlatform ? tg.contentSafeAreaInset?.bottom ?? bottomInset : 0}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${isMobilePlatform ? tg.contentSafeAreaInset?.left ?? leftInset : 0}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${isMobilePlatform ? tg.contentSafeAreaInset?.right ?? rightInset : 0}px`);
    };

    // Подписываемся на события viewport changes
    if (tg.onEvent) {
      tg.onEvent('viewport_changed', () => {
        log('📐 viewport_changed event');
        updateSafeAreas('viewport_changed');
      });

      tg.onEvent('viewportChanged', () => {
        log('📐 viewportChanged event');
        updateSafeAreas('viewportChanged');
      });

      tg.onEvent('safeAreaChanged', () => {
        log('📐 safeAreaChanged event');
        updateSafeAreas('safeAreaChanged');
      });

      tg.onEvent('contentSafeAreaChanged', () => {
        log('📐 contentSafeAreaChanged event');
        updateSafeAreas('contentSafeAreaChanged');
      });
    }

    // Обновляем safe areas сразу и с задержкой
    updateSafeAreas('initial');
    
    setTimeout(() => {
      updateSafeAreas('delayed-100ms');
    }, 100);

    setTimeout(() => {
      updateSafeAreas('delayed-500ms');
    }, 500);

    log('✅ WebApp initialized:', {
      platform: tg.platform,
      version: tg.version,
      isExpanded: tg.isExpanded,
    });

    setWebApp(tg);
  }, []);

  return (
    <TelegramContext.Provider value={webApp}>
      {children}
    </TelegramContext.Provider>
  );
}

/**
 * Хук для доступа к Telegram WebApp
 * Возвращает null если WebApp не доступен
 */
export function useTelegram(): WebApp | null {
  return useContext(TelegramContext);
}

