// =====================================================
// Утилиты для работы с Telegram уведомлениями
// =====================================================

import { getTelegramWebApp } from './telegram';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// Deep Links
// =====================================================

export interface DeepLinkData {
  action: string;
  id?: string;
  params?: Record<string, string>;
}

/**
 * Парсит deep link из Telegram start параметра
 * Форматы:
 * - duel_{duel_id} → { action: 'duel', id: duel_id }
 * - test_{topic_id} → { action: 'test', id: topic_id }
 * - blog_{slug} → { action: 'blog', id: slug }
 * - ref_{code} → { action: 'ref', id: code }
 * - partner_{code} → { action: 'partner', id: code }
 * - {code} (без префикса) → проверяем, партнерский ли это код
 * - learn → { action: 'learn' }
 */
export function parseDeepLink(startParam: string): DeepLinkData | null {
  if (!startParam) return null;

  console.log('[Deep Link] Parsing:', startParam);

  // Проверяем формат action_id
  const parts = startParam.split('_');

  if (parts.length === 2) {
    const [action, id] = parts;
    console.log('[Deep Link] Parsed:', { action, id });
    return { action, id };
  }

  // Простое действие без ID
  if (parts.length === 1) {
    const code = parts[0];

    // КРИТИЧНО: Если код без префикса, проверяем, может это партнерский код
    // Telegram Partner Program может использовать просто код без префикса
    // Проверяем формат (обычно партнерские коды - это 3-6 символов, реферальные - 6)
    if (code.length >= 3 && code.length <= 6 && /^[A-Z0-9]+$/.test(code.toUpperCase())) {
      // Это может быть партнерский код - возвращаем как partner
      console.log('[Deep Link] Detected possible partner code (no prefix):', code);
      return { action: 'partner', id: code };
    }

    console.log('[Deep Link] Parsed simple action:', code);
    return { action: code };
  }

  console.warn('[Deep Link] Invalid format:', startParam);
  return null;
}

/**
 * Извлекает deep link из Telegram WebApp
 */
export function extractDeepLink(): DeepLinkData | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;

  try {
    // Получаем start_param из initData
    const startParam = webApp.initDataUnsafe?.start_param;

    if (startParam) {
      console.log('[Deep Link] Found start_param:', startParam);
      return parseDeepLink(startParam);
    }

    // Пытаемся получить из URL (fallback)
    const urlParams = new URLSearchParams(window.location.search);
    const startAppParam = urlParams.get('startapp');

    if (startAppParam) {
      console.log('[Deep Link] Found startapp param:', startAppParam);
      return parseDeepLink(startAppParam);
    }

  } catch (error) {
    console.error('[Deep Link] Error extracting:', error);
  }

  return null;
}

/**
 * Форматирует deep link для отправки в Telegram
 */
export function formatDeepLink(action: string, id?: string, params?: Record<string, string>): string {
  if (id) {
    return `${action}_${id}`;
  }
  if (params) {
    const paramString = Object.entries(params)
      .map(([key, value]) => `${key}_${value}`)
      .join('_');
    return `${action}_${paramString}`;
  }
  return action;
}

// =====================================================
// Отправка уведомлений
// =====================================================

export interface SendTelegramNotificationParams {
  userId: string;
  templateType: string;
  variables?: Record<string, any>;
  title?: string;
  message?: string;
  icon?: string;
  ctaText?: string;
  ctaDeeplink?: string;
  force?: boolean;
}

/**
 * Отправляет уведомление пользователю в Telegram
 */
export async function sendTelegramNotification(params: SendTelegramNotificationParams): Promise<boolean> {
  try {
    console.log('[Telegram Notification] Sending:', params);

    const response = await supabase.functions.invoke('notification-sender', {
      body: {
        user_id: params.userId,
        template_type: params.templateType,
        variables: params.variables,
        title: params.title,
        message: params.message,
        icon: params.icon,
        cta_text: params.ctaText,
        cta_deeplink: params.ctaDeeplink,
        force: params.force || false
      }
    });

    if (response.error) {
      console.error('[Telegram Notification] Error:', response.error);
      return false;
    }

    console.log('[Telegram Notification] Sent successfully:', response.data);
    return true;

  } catch (error) {
    console.error('[Telegram Notification] Exception:', error);
    return false;
  }
}

// =====================================================
// Отслеживание кликов
// =====================================================

/**
 * Отмечает уведомление как кликнутое
 */
export async function trackNotificationClick(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notification_logs')
      .update({
        clicked: true,
        clicked_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('[Notification Tracking] Error:', error);
    } else {
      console.log('[Notification Tracking] Click tracked:', notificationId);
    }
  } catch (error) {
    console.error('[Notification Tracking] Exception:', error);
  }
}

// =====================================================
// Проверка активности приложения
// =====================================================

let lastActivityTime = Date.now();
let isAppVisible = true;

// Отслеживание активности
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    isAppVisible = !document.hidden;
    if (isAppVisible) {
      lastActivityTime = Date.now();
    }
  });

  // Обновляем время при любом взаимодействии
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
      lastActivityTime = Date.now();
    }, { passive: true });
  });
}

/**
 * Проверяет, активен ли пользователь в приложении
 */
export function isAppActive(): boolean {
  if (!isAppVisible) return false;

  const inactiveThreshold = 60 * 1000; // 1 минута
  const timeSinceActivity = Date.now() - lastActivityTime;

  return timeSinceActivity < inactiveThreshold;
}

/**
 * Проверяет, открыто ли приложение в Telegram
 */
export function isInTelegram(): boolean {
  return !!getTelegramWebApp();
}

// =====================================================
// Управление настройками уведомлений
// =====================================================

export interface NotificationSettings {
  enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  categories_enabled: string[];
  preferred_language: string;
}

/**
 * Получает настройки уведомлений пользователя
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Notification Settings] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Notification Settings] Exception:', error);
    return null;
  }
}

/**
 * Обновляет настройки уведомлений пользователя
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[Notification Settings] Update error:', error);
      return false;
    }

    console.log('[Notification Settings] Updated successfully');
    return true;
  } catch (error) {
    console.error('[Notification Settings] Update exception:', error);
    return false;
  }
}

