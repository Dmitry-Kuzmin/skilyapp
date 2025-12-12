import { TelegramUser, PuzzleCodeData } from "@/types/window";
import { 
  getTelegramWebApp, 
  initTelegramApp, 
  getTelegramUser as getTelegramUserFromLib 
} from "@/lib/telegram";
import { extractDeepLink, DeepLinkData } from "@/lib/telegramNotifications";

export function initTelegram() {
  if (typeof window === 'undefined') return null;

  const webApp = getTelegramWebApp();
  
  if (webApp) {
    try {
      // Initialize Telegram WebApp
      initTelegramApp();
      
      console.log('[Telegram Init] WebApp detected');
      console.log('[Telegram Init] initData:', webApp.initData);
      console.log('[Telegram Init] initDataUnsafe:', webApp.initDataUnsafe);

      // Обрабатываем deep link
      const deepLink = extractDeepLink();
      if (deepLink) {
        console.log('[Telegram Init] Deep link detected:', deepLink);
        handleDeepLink(deepLink);
      }

      const user = getTelegramUserFromLib();

      if (user) {
        window.puzzleUser = user;
        window.puzzleCodeData = {
          FIRST_NAME: user.first_name,
          LAST_NAME: user.last_name,
          USERNAME: user.username,
          ID: user.id,
          LANGUAGE: user.language_code,
          PLATFORM: 'telegram'
        };

        console.log('[Telegram Init] User initialized:', {
          id: user.id,
          name: user.first_name,
          username: user.username,
          photo_url: user.photo_url,
          platform: 'telegram'
        });

        return user;
      } else {
        console.log('[Telegram Init] No user data in initDataUnsafe, but WebApp exists');
        // WebApp exists but no user yet - это тоже Telegram платформа
        window.puzzleCodeData = {
          PLATFORM: 'telegram'
        };
        return null;
      }
    } catch (error) {
      console.error('[Telegram Init] Error:', error);
      return null;
    }
  } else {
    // Web platform
    console.log('[Telegram Init] No WebApp - running in web mode');
    if (!window.puzzleCodeData) {
      window.puzzleCodeData = {
        PLATFORM: 'web'
      };
    }
  }

  return null;
}

/**
 * Обработка deep links из Telegram уведомлений
 * Сохраняет deep link в sessionStorage для обработки компонентом DeepLinkHandler
 * (который работает внутри BrowserRouter и может использовать navigate)
 */
function handleDeepLink(deepLink: DeepLinkData): void {
  console.log('[Telegram Init] Handling deep link:', deepLink);

  // Сохраняем deep link для обработки после загрузки приложения
  // DeepLinkHandler компонент обработает его внутри BrowserRouter
  sessionStorage.setItem('telegram_deeplink', JSON.stringify(deepLink));

  // Для referral кода сохраняем отдельно
  if (deepLink.action === 'ref' && deepLink.id) {
    console.log('[Telegram Init] Storing referral code:', deepLink.id);
    sessionStorage.setItem('referral_code', deepLink.id.toUpperCase());
  }

  // КРИТИЧНО: Для партнерского кода сохраняем отдельно и связываем с пользователем
  if (deepLink.action === 'partner' && deepLink.id) {
    console.log('[Telegram Init] Storing partner code:', deepLink.id);
    sessionStorage.setItem('partner_ref_code', deepLink.id.toUpperCase());
    // Связываем пользователя с партнером (если пользователь уже авторизован)
    linkUserToPartner(deepLink.id);
  }
}

/**
 * Связывает пользователя с партнером на основе start_param
 * Вызывается при первом входе в приложение
 */
async function linkUserToPartner(partnerCode: string): Promise<void> {
  try {
    // Импортируем Supabase только когда нужно
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Telegram Init] User not authenticated yet, will link after auth');
      return;
    }

    // Получаем profile_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      console.warn('[Telegram Init] Profile not found for user');
      return;
    }

    // Вызываем функцию связки
    const { data, error } = await supabase.rpc('link_user_to_partner_from_start_param', {
      p_user_id: profile.id,
      p_start_param: `partner_${partnerCode}`
    });

    if (error) {
      console.error('[Telegram Init] Failed to link user to partner:', error);
      return;
    }

    if (data && data.length > 0 && data[0].success) {
      console.log('[Telegram Init] User linked to partner:', {
        partner_id: data[0].partner_id,
        partner_code: data[0].partner_code
      });
    } else {
      console.log('[Telegram Init] Partner link result:', data?.[0]?.message || 'Unknown');
    }
  } catch (error) {
    console.error('[Telegram Init] Error linking user to partner:', error);
  }
}

export function isTelegramPlatform(): boolean {
  return !!window.Telegram?.WebApp;
}

export function getTelegramUser(): TelegramUser | null {
  return window.puzzleUser || null;
}

export function getPlatform(): 'telegram' | 'web' {
  return window.puzzleCodeData?.PLATFORM || 'web';
}
