import { useEffect } from "react";

/**
 * Хук для инициализации Telegram WebApp
 * КРИТИЧЕСКИ ВАЖНО: вызывается в самом начале приложения
 */
export function useInitTelegram() {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (!tg) {
      console.warn("[useInitTelegram] ❌ Telegram WebApp не найден");
      return;
    }

    console.log("[useInitTelegram] 🚀 Инициализация Telegram WebApp");

    // КРИТИЧЕСКИ ВАЖНО: вызываем ready() и expand() сразу
    tg.ready();
    tg.expand();

    console.log("[useInitTelegram] ✅ WebApp ready:", tg.isExpanded);
    
    // Функция для логирования всех safe area свойств
    const logSafeAreaProperties = (eventName?: string) => {
      console.log(`[useInitTelegram] 🧭 SafeArea${eventName ? ` (${eventName})` : ''}:`, {
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
    console.log("[useInitTelegram] 🎨 CSS safe-area переменные:", {
      '--tg-safe-area-inset-top': computed.getPropertyValue("--tg-safe-area-inset-top"),
      '--tg-safe-area-inset-bottom': computed.getPropertyValue("--tg-safe-area-inset-bottom"),
      '--app-safe-top': computed.getPropertyValue("--app-safe-top"),
      '--app-content-top': computed.getPropertyValue("--app-content-top"),
    });

    // Функция обновления safe areas и CSS переменных
    const updateSafeAreas = (eventName?: string) => {
      // Используем прямые свойства, если они доступны
      const topInset = (tg as any).viewportSafeAreaInsetTop ?? tg.safeAreaInset?.top ?? 0;
      const bottomInset = (tg as any).viewportSafeAreaInsetBottom ?? tg.safeAreaInset?.bottom ?? 0;
      const leftInset = (tg as any).viewportSafeAreaInsetLeft ?? tg.safeAreaInset?.left ?? 0;
      const rightInset = (tg as any).viewportSafeAreaInsetRight ?? tg.safeAreaInset?.right ?? 0;

      // Content safe area (от UI Telegram)
      const contentTop = tg.contentSafeAreaInset?.top ?? 0;
      const contentBottom = tg.contentSafeAreaInset?.bottom ?? 0;

      console.log(`[useInitTelegram] 📏 Обновление safe areas${eventName ? ` (${eventName})` : ''}:`, {
        topInset,
        bottomInset,
        leftInset,
        rightInset,
        contentTop,
        contentBottom,
        viewportHeight: tg.viewportHeight,
        viewportStableHeight: tg.viewportStableHeight,
      });

      // Логируем все доступные свойства для отладки
      logSafeAreaProperties(eventName);

      // Устанавливаем CSS переменные
      document.documentElement.style.setProperty('--app-safe-top', `${topInset}px`);
      document.documentElement.style.setProperty('--app-safe-bottom', `${bottomInset}px`);
      document.documentElement.style.setProperty('--app-safe-left', `${leftInset}px`);
      document.documentElement.style.setProperty('--app-safe-right', `${rightInset}px`);
      document.documentElement.style.setProperty('--app-content-top', `${Math.round(contentTop / 2)}px`);
      document.documentElement.style.setProperty('--app-content-bottom', `${Math.round(contentBottom / 2)}px`);
    };

    // КРИТИЧЕСКИ ВАЖНО: добавляем слушатель события viewport_changed
    // Telegram вызывает это событие, когда отступы уже рассчитаны
    if (tg.onEvent) {
      // Слушаем viewport_changed - это событие вызывается, когда Telegram рассчитал все метрики
      tg.onEvent('viewport_changed', () => {
        console.log('[useInitTelegram] 📐 viewport_changed событие получено!');
        updateSafeAreas('viewport_changed');
      });

      // Также слушаем другие события для обновления
      tg.onEvent('viewportChanged', () => {
        console.log('[useInitTelegram] 📐 viewportChanged событие получено!');
        updateSafeAreas('viewportChanged');
      });

      tg.onEvent('safeAreaChanged', () => {
        console.log('[useInitTelegram] 📐 safeAreaChanged событие получено!');
        updateSafeAreas('safeAreaChanged');
      });

      tg.onEvent('contentSafeAreaChanged', () => {
        console.log('[useInitTelegram] 📐 contentSafeAreaChanged событие получено!');
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

