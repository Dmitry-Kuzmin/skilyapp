import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";

export const TelegramNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const isMainScreen = location.pathname === "/";

    // BackButton handling
    if (isMainScreen) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(() => {
        navigate(-1);
      });
    }

    // Hide MainButton completely
    webApp.MainButton.hide();

    // Cleanup
    return () => {
      webApp.BackButton.offClick(() => {});
      webApp.MainButton.offClick(() => {});
    };
  }, [location.pathname, navigate]);

  // Handle safe area insets updates
  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    // Функция обновления CSS-переменных для safe area
    const updateSafeAreaInsets = () => {
      if (webApp.safeAreaInset) {
        document.documentElement.style.setProperty('--tg-safe-area-inset-top', `${webApp.safeAreaInset.top}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', `${webApp.safeAreaInset.bottom}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-left', `${webApp.safeAreaInset.left}px`);
        document.documentElement.style.setProperty('--tg-safe-area-inset-right', `${webApp.safeAreaInset.right}px`);
      }
    };

    // Функция обновления CSS-переменных для content safe area
    const updateContentSafeAreaInsets = () => {
      if (webApp.contentSafeAreaInset) {
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${webApp.contentSafeAreaInset.top}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${webApp.contentSafeAreaInset.bottom}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${webApp.contentSafeAreaInset.left}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${webApp.contentSafeAreaInset.right}px`);
      }
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
      console.log('Viewport changed');
      updateViewportHeight();
    };

    // Добавляем слушатели
    webApp.onEvent('safeAreaChanged', handleSafeAreaChanged);
    webApp.onEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
    webApp.onEvent('viewportChanged', handleViewportChanged);

    // Cleanup
    return () => {
      webApp.offEvent('safeAreaChanged', handleSafeAreaChanged);
      webApp.offEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
      webApp.offEvent('viewportChanged', handleViewportChanged);
    };
  }, []);

  return null; // This component only manages Telegram WebApp buttons
};
