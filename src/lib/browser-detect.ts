/**
 * Browser Detection Utilities
 * Определяет тип браузера (встроенный WebView vs системный браузер)
 */

/**
 * Проверяет, открыто ли приложение во встроенном браузере (WebView)
 * Встроенные браузеры: Instagram, Facebook, TikTok, Telegram, WeChat, и т.д.
 * Google OAuth НЕ работает в встроенных браузерах
 */
export function isInEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();

  // Telegram Mini App — проверяем реальный initData, не просто наличие объекта.
  // telegram-login.js создаёт window.Telegram.Login (и window.Telegram), но НЕ является встроенным браузером.
  // Реальный Mini App: initData непустой и не мок.
  const tgWebApp = (window as any).Telegram?.WebApp;
  if (tgWebApp?.initData && !tgWebApp.initData.startsWith('mock_')) {
    return true;
  }

  // Instagram In-App Browser
  if (ua.includes('instagram')) {
    return true;
  }

  // Facebook In-App Browser
  if (ua.includes('fbav') || ua.includes('fban')) {
    return true;
  }

  // TikTok In-App Browser
  if (ua.includes('tiktok') || ua.includes('musical_ly')) {
    return true;
  }

  // WeChat In-App Browser
  if (ua.includes('micromessenger')) {
    return true;
  }

  // LINE In-App Browser
  if (ua.includes('line')) {
    return true;
  }

  // Viber In-App Browser
  if (ua.includes('viber')) {
    return true;
  }

  // Snapchat In-App Browser
  if (ua.includes('snapchat')) {
    return true;
  }

  // Twitter/X In-App Browser
  if (ua.includes('twitter') || ua.includes('x.com')) {
    return true;
  }

  // LinkedIn In-App Browser
  if (ua.includes('linkedin')) {
    return true;
  }

  // Pinterest In-App Browser
  if (ua.includes('pinterest')) {
    return true;
  }

  // Яндекс.Браузер (в некоторых приложениях)
  if (ua.includes('yabrowser')) {
    return true;
  }

  return false;
}

/**
 * Получить человекочитаемое имя встроенного браузера для сообщения пользователю
 */
export function getEmbeddedBrowserName(): string {
  const ua = navigator.userAgent.toLowerCase();

  if ((window as any).Telegram?.WebApp) return 'Telegram';
  if (ua.includes('instagram')) return 'Instagram';
  if (ua.includes('fbav') || ua.includes('fban')) return 'Facebook';
  if (ua.includes('tiktok') || ua.includes('musical_ly')) return 'TikTok';
  if (ua.includes('micromessenger')) return 'WeChat';
  if (ua.includes('line')) return 'LINE';
  if (ua.includes('viber')) return 'Viber';
  if (ua.includes('snapchat')) return 'Snapchat';
  if (ua.includes('twitter')) return 'Twitter';
  if (ua.includes('linkedin')) return 'LinkedIn';
  if (ua.includes('pinterest')) return 'Pinterest';

  return 'этого приложения';
}
