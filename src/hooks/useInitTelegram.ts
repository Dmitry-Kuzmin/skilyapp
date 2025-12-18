import { useEffect } from "react";
import { isTelegramMobilePlatformName } from "@/lib/telegram";

/**
 * Хук для инициализации Telegram WebApp
 * КРИТИЧЕСКИ ВАЖНО: вызывается в самом начале приложения
 */
export function useInitTelegram() {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const debugOverride = import.meta.env.VITE_DEBUG_TELEGRAM === "true";
    const shouldLog = !!tg || debugOverride;
    const log = (...args: any[]) => {
      if (shouldLog) {
        console.debug(...args);
      }
    };
    const warn = (...args: any[]) => {
      if (shouldLog) {
        console.warn(...args);
      }
    };

    if (!tg) {
      warn("[useInitTelegram] ❌ Telegram WebApp не найден");
      return;
    }

    log("[useInitTelegram] 🚀 Инициализация Telegram WebApp");

    // КРИТИЧЕСКИ ВАЖНО: вызываем ready() и expand() сразу
    tg.ready();
    
    // АГРЕССИВНЫЙ ПОДХОД: Множественные вызовы expand() для Menu Button
    const forceExpand = () => {
      try {
        if (typeof tg.expand === 'function') {
          tg.expand();
          log("[useInitTelegram] ✅ expand() called");
        }
      } catch (e) {
        warn("[useInitTelegram] ⚠️ Error calling expand():", e);
      }
    };
    
    // Вызываем сразу
    forceExpand();
    
    // Вызываем на событиях
    if (typeof tg.onEvent === 'function') {
      tg.onEvent('viewport_changed', () => {
        log("[useInitTelegram] 📐 viewport_changed - calling expand()");
        forceExpand();
      });
    }
    
    // Вызываем с задержками
    setTimeout(forceExpand, 10);
    setTimeout(forceExpand, 50);
    setTimeout(forceExpand, 100);
    setTimeout(forceExpand, 200);
    setTimeout(forceExpand, 500);

    log("[useInitTelegram] ✅ WebApp ready:", tg.isExpanded);
    
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

    // Функция для логирования всех safe area свойств
    const logSafeAreaProperties = (eventName?: string) => {
      log(`[useInitTelegram] 🧭 SafeArea${eventName ? ` (${eventName})` : ''}:`, {
        // Прямые свойства viewport safe area
        viewportSafeAreaInsetTop: (tg as any).viewportSafeAreaInsetTop,
        viewportSafeAreaInsetBottom: (tg as any).viewportSafeAreaInsetBottom,
        viewportSafeAreaInsetLeft: (tg as any).viewportSafeAreaInsetLeft,
        viewportSafeAreaInsetRight: (tg as any).viewportSafeAreaInsetRight,
        // Объекты safe area
        safeAreaInset: tg.safeAreaInset,
        contentSafeAreaInset: tg.contentSafeAreaInset,
        // Дополнительная информация
        platform: tg.platform,
        version: tg.version,
        isExpanded: tg.isExpanded,
        viewportHeight: tg.viewportHeight,
        viewportStableHeight: tg.viewportStableHeight,
      });
    };
    
    // Сразу логируем текущие значения (могут быть undefined)
    logSafeAreaProperties('начальные значения');

    // Проверим наличие переменных в CSS
    const computed = getComputedStyle(document.documentElement);
    log("[useInitTelegram] 🎨 CSS safe-area переменные:", {
      '--tg-safe-area-inset-top': computed.getPropertyValue("--tg-safe-area-inset-top"),
      '--tg-safe-area-inset-bottom': computed.getPropertyValue("--tg-safe-area-inset-bottom"),
      '--app-safe-top': computed.getPropertyValue("--app-safe-top"),
      '--app-content-top': computed.getPropertyValue("--app-content-top"),
    });

    // Функция обновления safe areas и CSS переменных
    const updateSafeAreas = (eventName?: string) => {
      const { platform, isMobilePlatform } = getPlatformInfo();
      applyPlatformClasses(isMobilePlatform);

      // Используем прямые свойства, если они доступны
      const topInset = (tg as any).viewportSafeAreaInsetTop ?? tg.safeAreaInset?.top ?? 0;
      const bottomInset = (tg as any).viewportSafeAreaInsetBottom ?? tg.safeAreaInset?.bottom ?? 0;
      const leftInset = (tg as any).viewportSafeAreaInsetLeft ?? tg.safeAreaInset?.left ?? 0;
      const rightInset = (tg as any).viewportSafeAreaInsetRight ?? tg.safeAreaInset?.right ?? 0;

      // Content safe area (от UI Telegram)
      const contentTop = tg.contentSafeAreaInset?.top ?? 0;
      const contentBottom = tg.contentSafeAreaInset?.bottom ?? 0;

      log(`[useInitTelegram] 📏 Обновление safe areas${eventName ? ` (${eventName})` : ''}:`, {
        topInset,
        bottomInset,
        leftInset,
        rightInset,
        contentTop,
        contentBottom,
        viewportHeight: tg.viewportHeight,
        viewportStableHeight: tg.viewportStableHeight,
        platform,
        isMobilePlatform,
      });

      // Логируем все доступные свойства для отладки
      logSafeAreaProperties(eventName);

      // Устанавливаем CSS переменные
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

      // Для обратной совместимости (используется в Layout и стилях)
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${isMobilePlatform ? tg.contentSafeAreaInset?.top ?? topInset : 0}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${isMobilePlatform ? tg.contentSafeAreaInset?.bottom ?? bottomInset : 0}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${isMobilePlatform ? tg.contentSafeAreaInset?.left ?? leftInset : 0}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${isMobilePlatform ? tg.contentSafeAreaInset?.right ?? rightInset : 0}px`);
    };

    // КРИТИЧЕСКИ ВАЖНО: добавляем слушатель события viewport_changed
    // Telegram вызывает это событие, когда отступы уже рассчитаны
    if (tg.onEvent) {
      // Слушаем viewport_changed - это событие вызывается, когда Telegram рассчитал все метрики
      tg.onEvent('viewport_changed', () => {
        log("[useInitTelegram] 📐 viewport_changed событие получено!");
        updateSafeAreas('viewport_changed');
      });

      // Также слушаем другие события для обновления
      tg.onEvent('viewportChanged', () => {
        log("[useInitTelegram] 📐 viewportChanged событие получено!");
        updateSafeAreas('viewportChanged');
      });

      tg.onEvent('safeAreaChanged', () => {
        log("[useInitTelegram] 📐 safeAreaChanged событие получено!");
        updateSafeAreas('safeAreaChanged');
      });

      tg.onEvent('contentSafeAreaChanged', () => {
        log("[useInitTelegram] 📐 contentSafeAreaChanged событие получено!");
        updateSafeAreas('contentSafeAreaChanged');
      });
    }

    // Пробуем обновить значения сразу (могут быть еще undefined)
    updateSafeAreas('после ready/expand');

    // Также пробуем обновить с задержкой (на случай, если Telegram еще не успел)
    setTimeout(() => {
      updateSafeAreas('с задержкой 100ms');
    }, 100);

    setTimeout(() => {
      updateSafeAreas('с задержкой 500ms');
    }, 500);
  }, []);
}

