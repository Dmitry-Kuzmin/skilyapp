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

    // Отключаем вертикальные свайпы (pull-to-refresh) чтобы предотвратить закрытие приложения
    if (typeof (webApp as any).enableClosingConfirmation === 'function') {
      (webApp as any).enableClosingConfirmation();
    }
    
    // Попытка отключить pull-to-refresh через API (если доступен)
    if (typeof (webApp as any).disableVerticalSwipes === 'function') {
      (webApp as any).disableVerticalSwipes();
      console.log('[TelegramNavigation] Disabled vertical swipes');
    }

    // Cleanup
    return () => {
      webApp.BackButton.offClick(() => {});
      webApp.MainButton.offClick(() => {});
    };
  }, [location.pathname, navigate]);
  
  // Отключаем pull-to-refresh через обработку touch событий
  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    
    let touchStartY = 0;
    let touchStartScrollTop = 0;
    let isScrolling = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      isScrolling = false;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const touchDiff = touchY - touchStartY;
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      const scrollDiff = Math.abs(currentScrollTop - touchStartScrollTop);
      
      // Если уже прокручиваем, разрешаем движение
      if (scrollDiff > 5) {
        isScrolling = true;
        return;
      }
      
      // Если пользователь пытается свайпнуть вниз когда страница уже вверху
      if (touchDiff > 0 && currentScrollTop <= 0 && touchStartScrollTop <= 0) {
        // Предотвращаем pull-to-refresh полностью
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[TelegramNavigation] Prevented pull-to-refresh (touchDiff:', touchDiff, ')');
        return false;
      }
    };
    
    const handleTouchEnd = () => {
      touchStartY = 0;
      touchStartScrollTop = 0;
      isScrolling = false;
    };
    
    // Добавляем обработчики с capture для перехвата событий
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    
    // Также на window для надежности
    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true } as any);
      document.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
      document.removeEventListener('touchend', handleTouchEnd, { capture: true } as any);
      window.removeEventListener('touchstart', handleTouchStart, { capture: true } as any);
      window.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
      window.removeEventListener('touchend', handleTouchEnd, { capture: true } as any);
    };
  }, []);

  // Handle safe area insets updates
  useEffect(() => {
    if (!isTelegramMiniApp()) {
      // Убеждаемся, что класс telegram-webapp НЕ добавлен в браузере
      document.body.classList.remove('telegram-webapp');
      document.documentElement.classList.remove('telegram-webapp');
      return;
    }
    
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
      // Log для отладки
      console.log('[TelegramNavigation] contentSafeAreaInset:', webApp.contentSafeAreaInset);
      console.log('[TelegramNavigation] safeAreaInset:', webApp.safeAreaInset);
      console.log('[TelegramNavigation] viewportHeight:', webApp.viewportHeight);
      console.log('[TelegramNavigation] viewportStableHeight:', webApp.viewportStableHeight);
      
      // Используем contentSafeAreaInset если доступен, иначе safeAreaInset
      // Если оба undefined, используем эмпирическое значение для iPhone (высота нативной панели Telegram)
      let topInset = 0;
      if (webApp.contentSafeAreaInset?.top !== undefined) {
        topInset = webApp.contentSafeAreaInset.top;
      } else if (webApp.safeAreaInset?.top !== undefined) {
        topInset = webApp.safeAreaInset.top;
      } else {
        // Если API не возвращает значения, используем стандартное значение для iPhone
        // Высота нативной панели Telegram обычно 44px
        topInset = 44;
        console.warn('[TelegramNavigation] Safe area insets not available, using fallback 44px');
      }
      
      const bottomInset = webApp.contentSafeAreaInset?.bottom ?? webApp.safeAreaInset?.bottom ?? 0;
      const leftInset = webApp.contentSafeAreaInset?.left ?? webApp.safeAreaInset?.left ?? 0;
      const rightInset = webApp.contentSafeAreaInset?.right ?? webApp.safeAreaInset?.right ?? 0;
      
      console.log('[TelegramNavigation] Setting safe area insets:', { topInset, bottomInset, leftInset, rightInset });
      
      // Устанавливаем CSS переменные
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', `${topInset}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', `${bottomInset}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-left', `${leftInset}px`);
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-right', `${rightInset}px`);
      
      // Также добавляем класс на body для CSS селекторов (это критично для применения стилей)
      document.body.classList.add('telegram-webapp');
      document.documentElement.classList.add('telegram-webapp');
      console.log('[TelegramNavigation] Added telegram-webapp class to body and html');
      
      // Принудительно применяем стили к основному контенту
      const applyStylesToMainContent = () => {
        const mainContentElements = document.querySelectorAll('.telegram-main-content');
        // Используем фиксированное значение для тестирования (80px + системный safe area)
        const systemSafeArea = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10) || 0;
        const fixedPadding = `${topInset + systemSafeArea}px`;
        const computedTop = `calc(env(safe-area-inset-top, 0px) + ${topInset}px)`;
        
        mainContentElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Пробуем оба варианта - calc и фиксированное значение
          htmlEl.style.paddingTop = computedTop;
          // Также устанавливаем как важное значение для принудительного применения
          htmlEl.style.setProperty('padding-top', fixedPadding, 'important');
          console.log('[TelegramNavigation] Applied padding-top to .telegram-main-content:', {
            computed: computedTop,
            fixed: fixedPadding,
            element: el,
            finalValue: getComputedStyle(htmlEl).paddingTop
          });
        });
        
        if (mainContentElements.length === 0) {
          console.warn('[TelegramNavigation] No .telegram-main-content elements found!');
        } else {
          console.log(`[TelegramNavigation] Found ${mainContentElements.length} .telegram-main-content element(s)`);
        }
      };
      
      // Применяем сразу
      applyStylesToMainContent();
      
      // Применяем с задержкой для случаев, когда элементы еще не созданы
      setTimeout(applyStylesToMainContent, 100);
      setTimeout(applyStylesToMainContent, 500);
      setTimeout(applyStylesToMainContent, 1000);
    };

    // Функция обновления viewport stable height
    const updateViewportHeight = () => {
      if (webApp.viewportStableHeight) {
        document.documentElement.style.setProperty('--tg-viewport-stable-height', `${webApp.viewportStableHeight}px`);
      }
    };

    // Инициализация при монтировании с задержкой для гарантии загрузки Telegram API
    const initSafeAreas = () => {
      updateSafeAreaInsets();
      updateContentSafeAreaInsets();
      updateViewportHeight();
    };
    
    // Вызываем сразу и через небольшую задержку для надежности
    initSafeAreas();
    const timeoutId = setTimeout(initSafeAreas, 100);
    
    // Также вызываем после загрузки страницы
    if (document.readyState === 'loading') {
      window.addEventListener('load', initSafeAreas);
    }

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
      clearTimeout(timeoutId);
      window.removeEventListener('load', initSafeAreas);
      webApp.offEvent('safeAreaChanged', handleSafeAreaChanged);
      webApp.offEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
      webApp.offEvent('viewportChanged', handleViewportChanged);
    };
  }, []);

  return null; // This component only manages Telegram WebApp buttons
};
