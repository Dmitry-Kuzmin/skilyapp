import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { hasTelegramWebApp, isTelegramMiniApp, isTelegramMobilePlatformName } from '@/lib/telegram';

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
  offEvent?: (event: string, callback: () => void) => void;
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

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const initializedRef = useRef(false);
  const debugOverride = import.meta.env.VITE_DEBUG_TELEGRAM === 'true';

  useEffect(() => {
    let initInterval: number | undefined;
    const cleanupFns: Array<() => void> = [];
    let attempts = 0;

    const log = (...args: unknown[]) => {
      if (debugOverride && import.meta.env.DEV) {
        console.debug('[TelegramProvider]', ...args);
      }
    };

    const tryInitialize = () => {
      if (initializedRef.current) {
        return true;
      }

      const tg = (window as any).Telegram?.WebApp as WebApp | undefined;
      const isReadyForInit = isTelegramMiniApp() || hasTelegramWebApp();

      if (!tg || !isReadyForInit) {
        attempts += 1;
        if (attempts > 40 && initInterval) {
          log('Telegram WebApp did not become ready in time');
          window.clearInterval(initInterval);
          initInterval = undefined;
        }
        return false;
      }

      initializedRef.current = true;
      if (initInterval) {
        window.clearInterval(initInterval);
        initInterval = undefined;
      }

      tg.ready();

      const callExpand = () => {
        try {
          if (typeof tg.expand === 'function' && !tg.isExpanded) {
            tg.expand();
            log('expand() called');
          }
        } catch (error) {
          log('expand() failed', error);
        }
      };

      const getPlatformInfo = () => {
        const platform = tg.platform || 'unknown';
        const isMobilePlatform = isTelegramMobilePlatformName(platform);
        return { platform, isMobilePlatform };
      };

      const applyPlatformClasses = (isMobilePlatform: boolean) => {
        document.documentElement.classList.add('telegram-webapp');
        document.body.classList.add('telegram-webapp');
        document.documentElement.classList.toggle('telegram-mobile-app', isMobilePlatform);
        document.documentElement.classList.toggle('telegram-desktop-app', !isMobilePlatform);
        document.body.classList.toggle('telegram-mobile-app', isMobilePlatform);
        document.body.classList.toggle('telegram-desktop-app', !isMobilePlatform);
      };

      const updateSafeAreas = (eventName?: string) => {
        const { platform, isMobilePlatform } = getPlatformInfo();
        applyPlatformClasses(isMobilePlatform);

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
        const contentTopValue = isMobilePlatform ? contentTop : 0;
        const contentBottomValue = isMobilePlatform ? contentBottom : 0;

        document.documentElement.style.setProperty('--app-safe-top', `${safeTop}px`);
        document.documentElement.style.setProperty('--app-safe-bottom', `${safeBottom}px`);
        document.documentElement.style.setProperty('--app-safe-left', `${safeLeft}px`);
        document.documentElement.style.setProperty('--app-safe-right', `${safeRight}px`);
        document.documentElement.style.setProperty('--app-content-top', `${contentTopValue}px`);
        document.documentElement.style.setProperty('--app-content-bottom', `${contentBottomValue}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-top', `${safeTop}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', `${safeBottom}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-left', `${safeLeft}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-right', `${safeRight}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${isMobilePlatform ? tg.contentSafeAreaInset?.top ?? topInset : 0}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${isMobilePlatform ? tg.contentSafeAreaInset?.bottom ?? bottomInset : 0}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${isMobilePlatform ? tg.contentSafeAreaInset?.left ?? leftInset : 0}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${isMobilePlatform ? tg.contentSafeAreaInset?.right ?? rightInset : 0}px`);
        document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight ?? 0}px`);
        document.documentElement.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight ?? tg.viewportHeight ?? 0}px`);

        log('safe areas updated', {
          eventName,
          platform,
          safeTop,
          safeBottom,
          contentTop,
          contentBottom,
        });
      };

      callExpand();

      const version = parseFloat(tg.version || '0');
      if (version >= 6.1 && typeof tg.disableVerticalSwipes === 'function') {
        try {
          tg.disableVerticalSwipes();
        } catch (error) {
          log('disableVerticalSwipes failed', error);
        }
      }

      const handleViewportChanged = () => {
        callExpand();
        updateSafeAreas('viewport_changed');
      };

      const handleSafeAreaChanged = () => {
        callExpand();
        updateSafeAreas('safeAreaChanged');
      };

      const handleContentSafeAreaChanged = () => {
        updateSafeAreas('contentSafeAreaChanged');
      };

      if (tg.onEvent) {
        tg.onEvent('viewport_changed', handleViewportChanged);
        tg.onEvent('viewportChanged', handleViewportChanged);
        tg.onEvent('safeAreaChanged', handleSafeAreaChanged);
        tg.onEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);

        cleanupFns.push(() => {
          if (tg.offEvent) {
            tg.offEvent('viewport_changed', handleViewportChanged);
            tg.offEvent('viewportChanged', handleViewportChanged);
            tg.offEvent('safeAreaChanged', handleSafeAreaChanged);
            tg.offEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
          }
        });
      }

      updateSafeAreas('initial');

      window.setTimeout(() => updateSafeAreas('delayed-100ms'), 100);
      window.setTimeout(() => updateSafeAreas('delayed-500ms'), 500);
      window.setTimeout(() => updateSafeAreas('delayed-1000ms'), 1000);

      setWebApp(tg);
      log('initialized', { platform: tg.platform, version: tg.version });
      return true;
    };

    if (!tryInitialize()) {
      initInterval = window.setInterval(() => {
        tryInitialize();
      }, 250);
    }

    return () => {
      if (initInterval) {
        window.clearInterval(initInterval);
      }
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [debugOverride]);

  return (
    <TelegramContext.Provider value={webApp}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram(): WebApp | null {
  return useContext(TelegramContext);
}
