import { supabase } from '@/integrations/supabase/client';
import { queueAnalyticsEvent } from '@/utils/analyticsQueue';

interface DispatchOptions {
  overrideTemplateType?: string;
}

/**
 * Отправить событие пользователя (с кэшированием при оффлайн)
 * События автоматически кэшируются и отправляются пачкой при восстановлении связи
 */
export async function dispatchUserEvent(
  userId: string | null | undefined,
  eventType: string,
  payload: Record<string, any> = {},
  options?: DispatchOptions
): Promise<void> {
  if (!userId) return;

  // Всегда добавляем событие в очередь (она сама решит, отправить сразу или кэшировать)
  await queueAnalyticsEvent(userId, eventType, payload, options?.overrideTemplateType);

  // Если онлайн, пытаемся отправить сразу (через очередь)
  if (navigator.onLine) {
    // Очередь сама отправит события при следующем тике
    // Это позволяет батчить события для лучшей производительности
  }
}


