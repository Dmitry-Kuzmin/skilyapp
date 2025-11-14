export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const isTelegramMiniApp = () => {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;
  
  // Check if we have initData or user data
  const hasInitData = webApp.initData && webApp.initData !== '';
  const hasUserData = !!webApp.initDataUnsafe?.user;
  
  return hasInitData || hasUserData;
};

export const getTelegramUser = () => {
  const webApp = getTelegramWebApp();
  if (webApp?.initDataUnsafe?.user) {
    return webApp.initDataUnsafe.user;
  }
  return null;
};

export const initTelegramApp = () => {
  const webApp = getTelegramWebApp();
  if (webApp) {
    try {
      // КРИТИЧЕСКИ ВАЖНО: вызываем ready() и expand() в самом начале
      webApp.ready();
      webApp.expand();
      
      // Отключаем вертикальные свайпы чтобы приложение не сворачивалось при скролле
      if (typeof webApp.disableVerticalSwipes === 'function') {
        webApp.disableVerticalSwipes();
        console.log('[Telegram] ✅ Vertical swipes disabled');
      }
      
      // Логируем состояние WebApp для отладки
      console.log('[Telegram] ✅ WebApp initialized:', {
        platform: webApp.platform,
        version: webApp.version,
        isExpanded: webApp.isExpanded,
        viewportHeight: webApp.viewportHeight,
        viewportStableHeight: webApp.viewportStableHeight,
        safeAreaInset: webApp.safeAreaInset,
        contentSafeAreaInset: webApp.contentSafeAreaInset,
      });
      
      return true;
    } catch (error) {
      console.error('[Telegram] ❌ Initialization error:', error);
      return false;
    }
  }
  console.warn('[Telegram] ⚠️ WebApp не найден - возможно, приложение запущено не в Telegram');
  return false;
};

/**
 * Вибрация в Telegram Web App
 * @param type - тип вибрации: 'success' для правильного ответа, 'error' для неправильного, 'light'/'medium'/'heavy' для тактильной обратной связи
 */
export const triggerHapticFeedback = (type: 'success' | 'error' | 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'warning' | 'selection') => {
  const webApp = getTelegramWebApp();
  if (!webApp || !webApp.HapticFeedback) {
    return;
  }

  try {
    switch (type) {
      case 'success':
        webApp.HapticFeedback.notificationOccurred('success');
        break;
      case 'error':
        webApp.HapticFeedback.notificationOccurred('error');
        break;
      case 'warning':
        webApp.HapticFeedback.notificationOccurred('warning');
        break;
      case 'light':
      case 'medium':
      case 'heavy':
      case 'rigid':
      case 'soft':
        webApp.HapticFeedback.impactOccurred(type);
        break;
      case 'selection':
        webApp.HapticFeedback.selectionChanged();
        break;
      default:
        webApp.HapticFeedback.impactOccurred('light');
    }
  } catch (error) {
    console.warn('[Telegram] ⚠️ HapticFeedback error:', error);
  }
};

/**
 * Показать всплывающее окно в Telegram Web App
 * @param message - текст сообщения
 * @param title - заголовок (опционально)
 */
export const showTelegramAlert = (message: string, title?: string) => {
  const webApp = getTelegramWebApp();
  if (!webApp || !webApp.showAlert) {
    // Fallback для браузера
    alert(title ? `${title}\n\n${message}` : message);
    return;
  }

  try {
    webApp.showAlert(message);
  } catch (error) {
    console.warn('[Telegram] ⚠️ showAlert error:', error);
    alert(title ? `${title}\n\n${message}` : message);
  }
};

/**
 * Показать диалог подтверждения в Telegram Web App
 * @param message - текст сообщения
 * @param title - заголовок (опционально)
 * @returns Promise<boolean> - true если пользователь подтвердил
 */
export const showTelegramConfirm = (message: string, title?: string): Promise<boolean> => {
  const webApp = getTelegramWebApp();
  if (!webApp || !webApp.showConfirm) {
    // Fallback для браузера
    return Promise.resolve(confirm(title ? `${title}\n\n${message}` : message));
  }

  try {
    return new Promise((resolve) => {
      webApp.showConfirm(message, (confirmed: boolean) => {
        resolve(confirmed);
      });
    });
  } catch (error) {
    console.warn('[Telegram] ⚠️ showConfirm error:', error);
    return Promise.resolve(confirm(title ? `${title}\n\n${message}` : message));
  }
};

/**
 * Показать всплывающее окно с кнопками в Telegram Web App
 * @param message - текст сообщения
 * @param buttons - массив объектов с текстом и id кнопок
 * @returns Promise<string | null> - id нажатой кнопки или null
 */
export const showTelegramPopup = (
  message: string,
  buttons: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text: string }>
): Promise<string | null> => {
  const webApp = getTelegramWebApp();
  if (!webApp || !webApp.showPopup) {
    // Fallback для браузера - используем confirm
    const result = confirm(message);
    return Promise.resolve(result ? buttons[0]?.id || null : null);
  }

  try {
    return new Promise((resolve) => {
      webApp.showPopup(
        {
          message,
          buttons: buttons.map(btn => ({
            id: btn.id || btn.text.toLowerCase().replace(/\s+/g, '_'),
            type: btn.type || 'default',
            text: btn.text,
          })),
        },
        (buttonId: string | null) => {
          resolve(buttonId);
        }
      );
    });
  } catch (error) {
    console.warn('[Telegram] ⚠️ showPopup error:', error);
    const result = confirm(message);
    return Promise.resolve(result ? buttons[0]?.id || null : null);
  }
};
