export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

/**
 * Принудительная перезагрузка страницы в Telegram Mini App
 * Используется для обновления кеша когда Service Worker недоступен
 */
export const forceReloadTelegramApp = () => {
  const webApp = getTelegramWebApp();
  if (webApp) {
    console.log('[Telegram] 🔄 Force reloading Telegram Mini App...');
    // Используем hard reload с очисткой кеша
    window.location.reload();
  } else {
    console.log('[Telegram] Not in Telegram Mini App, using normal reload');
    window.location.reload();
  }
};

const normalizePlatform = (platform?: string | null) => (platform || '').toLowerCase();

export const isTelegramMobilePlatformName = (platform?: string | null) => {
  const normalized = normalizePlatform(platform);
  return normalized.startsWith('ios') || normalized.startsWith('android');
};

export const isTelegramDesktopPlatformName = (platform?: string | null) => {
  const normalized = normalizePlatform(platform);
  return (
    normalized === 'tdesktop' ||
    normalized === 'macos' ||
    normalized === 'windows' ||
    normalized === 'linux' ||
    normalized === 'web'
  );
};

/**
 * Проверяет наличие Telegram WebApp без требования initData
 * Используется для десктопной версии, где initData может появиться с задержкой
 */
export const hasTelegramWebApp = () => {
  if (typeof window === 'undefined') return false;
  if (!window.Telegram?.WebApp) return false;
  
  const webApp = window.Telegram.WebApp;
  
  // Проверяем, что это не мок
  const isMockData = webApp.initData === 'mock_init_data' || 
                     webApp.initData?.startsWith('mock_') ||
                     (webApp.initDataUnsafe?.user?.id === 123456789 && 
                      webApp.initDataUnsafe?.user?.username === 'test_user');
  
  if (isMockData) {
    return false;
  }
  
  // Проверяем наличие platform и version (эти свойства есть всегда в реальном Telegram WebApp)
  const platform = webApp.platform;
  const isValidPlatform = platform === 'web' || 
                          platform === 'ios' || 
                          platform === 'android' || 
                          platform === 'tdesktop' || 
                          platform === 'macos' || 
                          platform === 'windows' || 
                          platform === 'linux';
  
  const hasVersion = webApp.version && typeof webApp.version === 'string';
  
  // Возвращаем true если есть валидная платформа и версия (даже без initData)
  return isValidPlatform && hasVersion;
};

export const isTelegramMiniApp = () => {
  // Проверка: только если действительно в Telegram Web App
  if (typeof window === 'undefined') return false;
  
  // Проверяем, что window.Telegram существует и это не мок
  if (!window.Telegram || !window.Telegram.WebApp) return false;
  
  const webApp = window.Telegram.WebApp;
  
  // КРИТИЧНО: Проверяем, что это НЕ мок из index.html
  // Мок имеет initData = 'mock_init_data' - это не валидный Telegram initData
  const isMockData = webApp.initData === 'mock_init_data' || 
                     webApp.initData?.startsWith('mock_') ||
                     (webApp.initDataUnsafe?.user?.id === 123456789 && 
                      webApp.initDataUnsafe?.user?.username === 'test_user');
  
  if (isMockData) {
    if (import.meta.env.DEV) {
      console.debug('[Telegram] Mock detected, not a real Telegram Web App');
    }
    return false;
  }
  
  // В dev режиме: если есть Telegram WebApp с версией - считаем что это Telegram
  // (даже без initData, так как в dev может не быть авторизации)
  const hasVersion = webApp.version && typeof webApp.version === 'string';
  const hasPlatform = webApp.platform && typeof webApp.platform === 'string';
  
  // В dev режиме: достаточно версии и платформы
  if (import.meta.env.DEV) {
    return hasVersion && hasPlatform;
  }
  
  // В production: строгая проверка с initData/user
  const hasInitData = webApp.initData && webApp.initData !== '';
  const hasUserData = !!webApp.initDataUnsafe?.user;
  
  if (!hasInitData && !hasUserData) {
    return false;
  }
  
  // Дополнительная проверка: platform должен быть валидной Telegram платформой
  const platform = webApp.platform;
  const isValidPlatform = platform === 'web' || 
                          platform === 'ios' || 
                          platform === 'android' || 
                          platform === 'tdesktop' || 
                          platform === 'macos' || 
                          platform === 'windows' || 
                          platform === 'linux';
  
  // Возвращаем true только если есть данные, платформа валидна И есть версия
  return (hasInitData || hasUserData) && isValidPlatform && hasVersion;
};

export const getTelegramUser = () => {
  const webApp = getTelegramWebApp();
  if (webApp?.initDataUnsafe?.user) {
    const user = webApp.initDataUnsafe.user;
    
    // КРИТИЧНО: Фильтруем mock-данные
    // Mock имеет id = 123456789 и username = 'test_user'
    const isMock = user.id === 123456789 && user.username === 'test_user';
    if (isMock) {
      console.log('[Telegram] Mock user detected in getTelegramUser, returning null');
      return null;
    }
    
    return user;
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
