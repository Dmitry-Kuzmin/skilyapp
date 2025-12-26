import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTelegramWebApp, isTelegramMiniApp, isTelegramMobilePlatformName, syncTelegramColors } from "@/lib/telegram";
import { useSettingsStore } from "@/store/settingsStore";
import { useTheme } from "next-themes";


export const TelegramNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isTelegramReady, setTelegramReady] = useState(() => isTelegramMiniApp());
  const { isOpen: isSettingsOpen, closeSettings } = useSettingsStore();
  const { theme, resolvedTheme } = useTheme();

  // Синхронизируем цвета header и background Telegram с текущей темой
  useEffect(() => {
    if (!isTelegramReady) return;

    // Определяем, тёмная ли тема сейчас активна
    const isDarkMode = resolvedTheme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    syncTelegramColors(isDarkMode);
  }, [isTelegramReady, theme, resolvedTheme, location.pathname]);

  // Пуллим доступность Telegram WebApp после монтирования,
  // чтобы не пропустить момент, когда initData появится чуть позже.
  useEffect(() => {
    if (isTelegramReady) return;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (isTelegramMiniApp()) {
        setTelegramReady(true);
        window.clearInterval(interval);
      } else if (attempts > 40) {
        // Через ~10 секунд прекращаем попытки
        window.clearInterval(interval);
        // Logging disabled - this is normal when not running in Telegram
        // console.warn("[TelegramNavigation] WebApp not detected within timeout");
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isTelegramReady]);

  // Инициализируем BackButton один раз и вешаем стабильный обработчик
  // КРИТИЧНО: Добавлен isSettingsOpen в зависимости
  useEffect(() => {
    if (!isTelegramReady) return;

    const webApp = getTelegramWebApp();
    if (!webApp) return;

    // КРИТИЧНО: Проверяем, это дуэльная страница или дашборд
    // ВАЖНО: /duel-leaderboard НЕ является дуэльной страницей, только /games/duel
    const isDuelPage = location.pathname.includes('/games/duel');
    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

    // Для дуэльных страниц НЕ регистрируем обработчик здесь, ЕСЛИ настройки закрыты
    // DuelBattleFullscreen и DuelResult сами управляют BackButton
    if (isDuelPage && !isSettingsOpen) {
      console.log('[TelegramNavigation] Duel page detected - not registering global handler');
      return; // Выходим из useEffect - cleanup не нужен
    }

    const version = parseFloat(webApp.version || '0');
    const supportsBackButton = version >= 6.1;

    const handleBack = () => {
      console.log('[TelegramNavigation] BackButton clicked, current path:', location.pathname);

      // Если открыты настройки - закрываем их
      if (isSettingsOpen) {
        closeSettings();
        return;
      }

      // На дашборде закрываем приложение
      if (isDashboard) {
        console.log('[TelegramNavigation] Dashboard - closing app');
        if (typeof webApp.close === "function") {
          try {
            webApp.close();
          } catch (error) {
            console.warn("[TelegramNavigation] Unable to close WebApp:", error);
          }
        }
        return;
      }

      // Обычная навигация назад
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/dashboard");
      }
    };

    if (supportsBackButton && webApp.BackButton) {
      try {
        webApp.BackButton.onClick(handleBack);
      } catch (e) {
        console.warn('[TelegramNavigation] Error registering BackButton.onClick:', e);
      }
    }

    if (webApp.MainButton) {
      try {
        webApp.MainButton.hide();
      } catch (e) { }
    }

    return () => {
      if (supportsBackButton && webApp.BackButton) {
        try {
          webApp.BackButton.offClick(handleBack);
        } catch (e) { }
      }
    };
  }, [isTelegramReady, navigate, location.pathname, isSettingsOpen, closeSettings]);

  // Управляем отображением BackButton и CSS-классами для padding в зависимости от текущего маршрута
  useEffect(() => {
    if (!isTelegramReady) return;

    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
    // ВАЖНО: /duel-leaderboard НЕ является дуэльной страницей
    const isDuelPage = location.pathname.includes('/games/duel');

    // Определяем fullscreen режимы (тесты, игры)
    const isFullscreenMode =
      location.pathname.startsWith('/test/') ||
      location.pathname.includes('/race-game') ||
      location.pathname.includes('/guess-the-sign') ||
      location.pathname.includes('/matching') ||
      location.pathname.includes('/four-variants') ||
      location.pathname.includes('/road-race');

    const version = parseFloat(webApp.version || '0');
    const supportsBackButton = version >= 6.1;

    // На дашборде скрываем BackButton, ЕСЛИ настройки закрыты
    // На дуэльных страницах компоненты сами управляют BackButton, ЕСЛИ настройки закрыты
    if (isSettingsOpen) {
      // Всегда показываем BackButton если открыты настройки
      if (supportsBackButton && webApp.BackButton) webApp.BackButton.show();
    } else if (isDashboard) {
      if (supportsBackButton && webApp.BackButton) webApp.BackButton.hide();
    } else if (!isDuelPage) {
      // На остальных страницах показываем BackButton
      if (supportsBackButton && webApp.BackButton) webApp.BackButton.show();
    }

    // КРИТИЧНО: Управляем CSS-классами для системы отступов в index.css
    // Эти классы определяют какой padding применяется к .telegram-main-content
    document.body.classList.toggle('duel-active', isDuelPage);
    document.documentElement.classList.toggle('duel-active', isDuelPage);

    document.body.classList.toggle('fullscreen-mode', isFullscreenMode);
    document.documentElement.classList.toggle('fullscreen-mode', isFullscreenMode);

    console.log('[TelegramNavigation] 🎯 CSS classes updated:', {
      isDuelPage,
      isFullscreenMode,
      pathname: location.pathname,
    });

    // Для duel-страниц ничего не делаем - компоненты сами управляют BackButton
  }, [isTelegramReady, location.pathname, isSettingsOpen]);

  // Handle safe area insets updates
  useEffect(() => {
    if (!isTelegramReady) return;

    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const getPlatformInfo = () => {
      const platform = webApp.platform || 'unknown';
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

    // Функция обновления CSS-переменных для safe area
    const updateSafeAreaInsets = () => {
      // Используем прямые свойства viewportSafeAreaInset* если они доступны, иначе fallback
      const top = (webApp as any).viewportSafeAreaInsetTop ?? webApp.safeAreaInset?.top ?? 0;
      const bottom = (webApp as any).viewportSafeAreaInsetBottom ?? webApp.safeAreaInset?.bottom ?? 0;
      const left = (webApp as any).viewportSafeAreaInsetLeft ?? webApp.safeAreaInset?.left ?? 0;
      const right = (webApp as any).viewportSafeAreaInsetRight ?? webApp.safeAreaInset?.right ?? 0;
      const { isMobilePlatform } = getPlatformInfo();

      console.log('[TelegramNavigation] 📏 Обновление safe area insets:', {
        top,
        bottom,
        left,
        right,
        isMobilePlatform,
        usingViewportProperties: !!(webApp as any).viewportSafeAreaInsetTop,
        usingSafeAreaInset: !!webApp.safeAreaInset,
      });

      document.documentElement.style.setProperty('--tg-safe-area-inset-top', `${top}px`);
      document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', `${bottom}px`);
      document.documentElement.style.setProperty('--tg-safe-area-inset-left', `${left}px`);
      document.documentElement.style.setProperty('--tg-safe-area-inset-right', `${right}px`);

      if (isMobilePlatform) {
        document.documentElement.style.setProperty('--app-safe-top', `${top}px`);
        document.documentElement.style.setProperty('--app-safe-bottom', `${bottom}px`);
        document.documentElement.style.setProperty('--app-safe-left', `${left}px`);
        document.documentElement.style.setProperty('--app-safe-right', `${right}px`);
      } else {
        document.documentElement.style.setProperty('--app-safe-top', '0px');
        document.documentElement.style.setProperty('--app-safe-bottom', '0px');
        document.documentElement.style.setProperty('--app-safe-left', '0px');
        document.documentElement.style.setProperty('--app-safe-right', '0px');
      }
    };

    // Функция обновления CSS-переменных для content safe area
    // Единая система отступов на основе Telegram WebApp API
    const updateContentSafeAreaInsets = () => {
      // Определяем платформу (мобильная или десктоп)
      const { platform, isMobilePlatform } = getPlatformInfo();

      // Для мобильных устройств используем contentSafeAreaInset из Telegram API
      // Для десктопа отступы не нужны (нет нативной панели Telegram)
      let contentTop = 0;
      let contentBottom = 0;

      // Логируем ВСЕ доступные свойства для отладки
      console.log('[TelegramNavigation] 🔍 Проверка всех safe area свойств:', {
        platform,
        isMobile: isMobilePlatform,
        // Прямые свойства viewport safe area
        viewportSafeAreaInsetTop: (webApp as any).viewportSafeAreaInsetTop,
        viewportSafeAreaInsetBottom: (webApp as any).viewportSafeAreaInsetBottom,
        // Объекты safe area
        safeAreaInset: webApp.safeAreaInset,
        contentSafeAreaInset: webApp.contentSafeAreaInset,
      });

      // Минимальный отступ для мобильных устройств Telegram (высота хедера с кнопками)
      const MIN_MOBILE_TOP_INSET = 56;

      if (isMobilePlatform && webApp.contentSafeAreaInset) {
        // Используем contentSafeAreaInset.top из Telegram API
        // Берём максимум из API и минимального значения для надёжности
        contentTop = Math.max(webApp.contentSafeAreaInset.top || 0, MIN_MOBILE_TOP_INSET);
        contentBottom = webApp.contentSafeAreaInset.bottom || 0;
      } else if (isMobilePlatform && webApp.safeAreaInset) {
        // Fallback: используем safeAreaInset если contentSafeAreaInset недоступен
        contentTop = Math.max(webApp.safeAreaInset.top || 0, MIN_MOBILE_TOP_INSET);
        contentBottom = webApp.safeAreaInset.bottom || 0;
      } else if (isMobilePlatform) {
        // Fallback для мобильных если API не возвращает значения
        contentTop = MIN_MOBILE_TOP_INSET;
      }
      // Для десктопа contentTop и contentBottom остаются 0

      console.log('[TelegramNavigation] ✅ Setting content safe area insets:', {
        platform,
        isMobile: isMobilePlatform,
        contentTop,
        contentBottom,
        willApplyPadding: contentTop > 0 || contentBottom > 0,
      });

      // КРИТИЧНО: Устанавливаем единую систему отступов
      // Для десктопа всегда 0, для мобильных - значения из Telegram API
      document.documentElement.style.setProperty('--app-content-top', `${contentTop}px`);
      document.documentElement.style.setProperty('--app-content-bottom', `${contentBottom}px`);

      // Также сохраняем для обратной совместимости
      // КРИТИЧНО: Для десктопа устанавливаем 0, чтобы не было отступов
      if (isMobilePlatform && webApp.contentSafeAreaInset) {
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${webApp.contentSafeAreaInset.top}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${webApp.contentSafeAreaInset.bottom}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${webApp.contentSafeAreaInset.left}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${webApp.contentSafeAreaInset.right}px`);
      } else {
        // КРИТИЧНО: Для десктопа устанавливаем 0, чтобы убрать отступы
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', '0px');
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', '0px');
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', '0px');
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', '0px');
      }

      // Добавляем класс на body/html для CSS селекторов
      document.body.classList.add('telegram-webapp');
      document.documentElement.classList.add('telegram-webapp');
      applyPlatformClasses(isMobilePlatform);
    };

    // Функция обновления viewport stable height
    const updateViewportHeight = () => {
      if (webApp.viewportStableHeight) {
        document.documentElement.style.setProperty('--tg-viewport-stable-height', `${webApp.viewportStableHeight}px`);
      }
    };

    // Инициализация при монтировании
    updateSafeAreaInsets();
    updateContentSafeAreaInsets();
    updateViewportHeight();

    // Слушатели событий для динамических обновлений
    const handleSafeAreaChanged = () => {
      console.log('Safe area changed');
      updateSafeAreaInsets();
    };

    const handleContentSafeAreaChanged = () => {
      console.log('Content safe area changed');
      updateContentSafeAreaInsets();
    };

    const handleViewportChanged = () => {
      console.log('[TelegramNavigation] Viewport changed');
      updateViewportHeight();
      updateSafeAreaInsets();
      updateContentSafeAreaInsets();
    };

    // КРИТИЧЕСКИ ВАЖНО: слушаем оба варианта имени события
    // viewport_changed - официальное событие Telegram (iOS/macOS)
    // viewportChanged - альтернативное имя (может использоваться в некоторых версиях)
    if (webApp.onEvent) {
      webApp.onEvent('safeAreaChanged', handleSafeAreaChanged);
      webApp.onEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
      webApp.onEvent('viewport_changed', handleViewportChanged);  // Основное событие
      webApp.onEvent('viewportChanged', handleViewportChanged);   // Альтернативное имя
    }

    // Cleanup
    return () => {
      if (webApp.offEvent) {
        webApp.offEvent('safeAreaChanged', handleSafeAreaChanged);
        webApp.offEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
        webApp.offEvent('viewport_changed', handleViewportChanged);  // Основное событие
        webApp.offEvent('viewportChanged', handleViewportChanged);   // Альтернативное имя
      }
    };
  }, [isTelegramReady, location.pathname]); // КРИТИЧНО: Добавлен location.pathname для обновления при навигации

  return null; // This component only manages Telegram WebApp buttons
};
