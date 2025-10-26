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
      webApp.ready();
      webApp.expand();
      console.log('[Telegram] WebApp initialized');
      return true;
    } catch (error) {
      console.error('[Telegram] Initialization error:', error);
      return false;
    }
  }
  return false;
};
