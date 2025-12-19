/**
 * Rate Limiting через Upstash Redis
 * Лимит: 100 запросов в минуту на IP или user_id
 */

interface RateLimitOptions {
  identifier: string; // IP или user_id
  limit: number; // Максимум запросов
  windowMs: number; // Окно времени в миллисекундах
}

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { identifier, limit, windowMs } = options;
  
  const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    // Если Upstash не настроен - разрешаем все (fallback)
    console.warn('[RateLimit] Upstash not configured, allowing request');
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }
  
  const key = `ratelimit:${identifier}`;
  const window = Math.floor(Date.now() / windowMs);
  const windowKey = `${key}:${window}`;
  
  try {
    // INCR - увеличивает счетчик и возвращает новое значение
    const response = await fetch(`${UPSTASH_URL}/incr/${windowKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      },
    });
    
    const data = await response.json();
    const count = data.result || 0;
    
    // Устанавливаем TTL на ключ (автоматически удалится после окна)
    await fetch(`${UPSTASH_URL}/expire/${windowKey}/${Math.ceil(windowMs / 1000)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      },
    });
    
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = (window + 1) * windowMs;
    
    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // При ошибке разрешаем запрос (fail-open)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }
}

/**
 * Получить IP адрес из запроса
 */
export function getClientIP(req: Request): string {
  // Проверяем заголовки (для прокси/CDN)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback (для Edge Functions это будет IP Supabase)
  return 'unknown';
}

