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
