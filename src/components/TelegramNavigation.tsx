import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";

export const TelegramNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isTelegramReady, setTelegramReady] = useState(() => isTelegramMiniApp());

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
        // Через ~10 секунд прекращаем попытки, логируем для отладки
        window.clearInterval(interval);
        console.warn("[TelegramNavigation] WebApp not detected within timeout");
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isTelegramReady]);
  
  // Инициализируем BackButton один раз и вешаем стабильный обработчик
  useEffect(() => {
    if (!isTelegramReady) return;
    
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const handleBack = () => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/");
        // Если мы уже на главном экране, закрываем Mini App
        if (typeof webApp.close === "function") {
          try {
            webApp.close();
          } catch (error) {
            console.warn("[TelegramNavigation] Unable to close WebApp:", error);
          }
        }
      }
    };

    webApp.BackButton.onClick(handleBack);
    webApp.MainButton.hide();

    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [isTelegramReady, navigate]);

  // Управляем отображением BackButton в зависимости от текущего маршрута
  useEffect(() => {
    if (!isTelegramReady) return;
    
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const isMainScreen = location.pathname === "/";
    if (isMainScreen) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
    }
  }, [isTelegramReady, location.pathname]);

  // Handle safe area insets updates
  useEffect(() => {
    if (!isTelegramReady) return;
    
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    // Функция обновления CSS-переменных для safe area
    const updateSafeAreaInsets = () => {
      // Используем прямые свойства viewportSafeAreaInset* если они доступны, иначе fallback
      const top = (webApp as any).viewportSafeAreaInsetTop ?? webApp.safeAreaInset?.top ?? 0;
      const bottom = (webApp as any).viewportSafeAreaInsetBottom ?? webApp.safeAreaInset?.bottom ?? 0;
      const left = (webApp as any).viewportSafeAreaInsetLeft ?? webApp.safeAreaInset?.left ?? 0;
      const right = (webApp as any).viewportSafeAreaInsetRight ?? webApp.safeAreaInset?.right ?? 0;
      
      console.log('[TelegramNavigation] 📏 Обновление safe area insets:', {
        top,
        bottom,
        left,
        right,
        usingViewportProperties: !!(webApp as any).viewportSafeAreaInsetTop,
        usingSafeAreaInset: !!webApp.safeAreaInset,
      });
      
      document.documentElement.style.setProperty('--tg-safe-area-inset-top', `${top}px`);
      document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', `${bottom}px`);
      document.documentElement.style.setProperty('--tg-safe-area-inset-left', `${left}px`);
      document.documentElement.style.setProperty('--tg-safe-area-inset-right', `${right}px`);
    };

    // Функция обновления CSS-переменных для content safe area
    // Единая система отступов на основе Telegram WebApp API
    const updateContentSafeAreaInsets = () => {
      // Определяем платформу (мобильная или десктоп)
      const platform = webApp.platform || 'unknown';
      const isMobile = platform === 'ios' || platform === 'android';
      
      // Для мобильных устройств используем contentSafeAreaInset из Telegram API
      // Для десктопа отступы не нужны (нет нативной панели Telegram)
      let contentTop = 0;
      let contentBottom = 0;
      
      // Логируем ВСЕ доступные свойства для отладки
      console.log('[TelegramNavigation] 🔍 Проверка всех safe area свойств:', {
        platform,
        isMobile,
        // Прямые свойства viewport safe area
        viewportSafeAreaInsetTop: (webApp as any).viewportSafeAreaInsetTop,
        viewportSafeAreaInsetBottom: (webApp as any).viewportSafeAreaInsetBottom,
        // Объекты safe area
        safeAreaInset: webApp.safeAreaInset,
        contentSafeAreaInset: webApp.contentSafeAreaInset,
      });
      
      if (isMobile && webApp.contentSafeAreaInset) {
        // Используем contentSafeAreaInset.top из Telegram API
        // УМЕНЬШАЕМ В 2 РАЗА, как просил пользователь
        contentTop = Math.round((webApp.contentSafeAreaInset.top || 0) / 2);
        contentBottom = Math.round((webApp.contentSafeAreaInset.bottom || 0) / 2);
      } else if (isMobile && webApp.safeAreaInset) {
        // Fallback: используем safeAreaInset если contentSafeAreaInset недоступен
        // УМЕНЬШАЕМ В 2 РАЗА
        contentTop = Math.round((webApp.safeAreaInset.top || 0) / 2);
        contentBottom = Math.round((webApp.safeAreaInset.bottom || 0) / 2);
      }
      // Для десктопа contentTop и contentBottom остаются 0
      
      console.log('[TelegramNavigation] ✅ Setting content safe area insets:', {
        platform,
        isMobile,
        contentTop,
        contentBottom,
        willApplyPadding: contentTop > 0 || contentBottom > 0,
      });
      
      // Устанавливаем единую систему отступов
      document.documentElement.style.setProperty('--app-content-top', `${contentTop}px`);
      document.documentElement.style.setProperty('--app-content-bottom', `${contentBottom}px`);
      
      // Также сохраняем для обратной совместимости (если нужно)
      if (webApp.contentSafeAreaInset) {
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${webApp.contentSafeAreaInset.top}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${webApp.contentSafeAreaInset.bottom}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${webApp.contentSafeAreaInset.left}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${webApp.contentSafeAreaInset.right}px`);
      }
      
      // Добавляем класс на body/html для CSS селекторов
      document.body.classList.add('telegram-webapp');
      document.documentElement.classList.add('telegram-webapp');
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
  }, [isTelegramReady]);

  return null; // This component only manages Telegram WebApp buttons
};
