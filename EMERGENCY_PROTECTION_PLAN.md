# 🛡️ План экстренной защиты перед запуском

**Приоритет:** 🔴 КРИТИЧНО  
**Время выполнения:** 2-4 часа  
**Цель:** Защита от перегрузки при большом наплыве пользователей

---

## ✅ Чеклист быстрых исправлений

- [ ] 1. Настроить Connection Pooling (5 минут)
- [ ] 2. Добавить Rate Limiting через Upstash (30 минут)
- [ ] 3. Создать Feature Flags (20 минут)
- [ ] 4. Оптимизировать Real-time подписки (30 минут)
- [ ] 5. Отключить Spend Cap в Supabase (2 минуты)

---

## 1. 🛡️ Connection Pooling (Подушка безопасности)

### Проблема:
Сейчас используется прямой порт 5432, что ограничивает до 60-200 подключений.

### Решение:
Использовать порт **6543** (Supavisor Connection Pooler) в режиме **Transaction**.

### Шаги:

#### 1.1. Проверить текущую конфигурацию

Откройте `src/integrations/supabase/client.ts` - сейчас используется:
```typescript
const SUPABASE_URL = 'https://yffjnqegeiorunyvcxkn.supabase.co';
```

#### 1.2. Создать отдельный клиент для Edge Functions

**НЕ МЕНЯЙТЕ** основной клиент (он используется на фронте).  
Создайте отдельный клиент для Edge Functions с Connection Pooling.

**Файл:** `supabase/functions/_shared/supabase-pooled.ts`
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

// КРИТИЧНО: Используем Connection Pooler (порт 6543)
// Это позволяет 200 подключениям обслуживать тысячи запросов
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Заменяем порт на 6543 для Connection Pooling
const POOLED_URL = SUPABASE_URL.replace(':5432', ':6543').replace('https://', 'https://');

export const supabasePooled = createClient(POOLED_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: 'public',
  },
  // КРИТИЧНО: Режим Transaction для Connection Pooling
  // Это позволяет переиспользовать соединения
});
```

#### 1.3. Использовать в Edge Functions

В каждой Edge Function замените:
```typescript
// Было:
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Стало:
import { supabasePooled as supabase } from '../_shared/supabase-pooled.ts';
```

**Приоритет:** 🟡 Средний (можно сделать после запуска, но желательно до)

---

## 2. 🛑 Rate Limiting (Вышибала) - КРИТИЧНО

### Проблема:
Нет защиты от DDoS и перегрузки Edge Functions.

### Решение:
Использовать **Upstash Redis** (бесплатный тариф: 10K команд/день).

### Шаги:

#### 2.1. Создать аккаунт Upstash

1. Зарегистрируйтесь на https://upstash.com
2. Создайте Redis database (бесплатный тариф)
3. Скопируйте `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN`

#### 2.2. Добавить секреты в Supabase

1. Откройте Supabase Dashboard → Settings → Edge Functions → Secrets
2. Добавьте:
   - `UPSTASH_REDIS_REST_URL` = ваш URL
   - `UPSTASH_REDIS_REST_TOKEN` = ваш токен

#### 2.3. Создать утилиту для Rate Limiting

**Файл:** `supabase/functions/_shared/rate-limit.ts`
```typescript
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
```

#### 2.4. Использовать в Edge Functions

**Пример для `duel-manager/index.ts`:**
```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Rate limiting в начале функции
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 100, // 100 запросов
    windowMs: 60000, // в минуту
  });
  
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }
  
  // Остальной код функции...
});
```

**Приоритет:** 🔴 КРИТИЧНО (сделать обязательно)

---

## 3. 🚦 Feature Flags (Аварийные рубильники)

### Проблема:
Нет способа быстро отключить тяжелые фичи при перегрузке.

### Решение:
Создать таблицу `app_config` и проверять флаги перед использованием фич.

### Шаги:

#### 3.1. Создать миграцию

**Файл:** `supabase/migrations/$(date +%Y%m%d%H%M%S)_app_config.sql`
```sql
-- Таблица для Feature Flags
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем дефолтные флаги
INSERT INTO app_config (key, value, description) VALUES
  ('realtime_enabled', 'true'::jsonb, 'Включить Real-time подписки'),
  ('notifications_realtime', 'true'::jsonb, 'Real-time для уведомлений'),
  ('duel_realtime', 'true'::jsonb, 'Real-time для дуэлей'),
  ('ai_chat_enabled', 'true'::jsonb, 'Включить AI чат')
ON CONFLICT (key) DO NOTHING;

-- RLS политика (все могут читать, только админы могут писать)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_config"
  ON app_config FOR SELECT
  USING (true);

-- Функция для получения флага (с кэшированием)
CREATE OR REPLACE FUNCTION get_feature_flag(flag_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_value JSONB;
BEGIN
  SELECT value INTO flag_value
  FROM app_config
  WHERE key = flag_key;
  
  IF flag_value IS NULL THEN
    RETURN true; -- По умолчанию включено
  END IF;
  
  RETURN COALESCE((flag_value->>'enabled')::boolean, (flag_value::text)::boolean, true);
END;
$$ LANGUAGE plpgsql STABLE;
```

#### 3.2. Создать хук для проверки флагов

**Файл:** `src/hooks/useFeatureFlag.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlag(flagKey: string, defaultValue: boolean = true) {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', flagKey)
        .single();
      
      if (error || !data) {
        return defaultValue;
      }
      
      // Поддерживаем разные форматы: {enabled: true} или просто true
      const value = data.value;
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'object' && 'enabled' in value) {
        return value.enabled === true;
      }
      
      return defaultValue;
    },
    staleTime: 5 * 60 * 1000, // Кэш 5 минут
    refetchInterval: 60 * 1000, // Обновлять каждую минуту
  });
  
  return { enabled: data ?? defaultValue, isLoading };
}
```

#### 3.3. Использовать в компонентах

**Пример в `useNotifications.ts`:**
```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function useNotifications(options?: { showToasts?: boolean; playSounds?: boolean }) {
  const { profileId } = useUserContext();
  const { enabled: realtimeEnabled } = useFeatureFlag('notifications_realtime', true);
  
  // ... остальной код ...
  
  // Подписываемся только если флаг включен
  useEffect(() => {
    if (!profileId || !realtimeEnabled) {
      console.log('[useNotifications] Real-time disabled by feature flag');
      return;
    }
    
    // ... код подписки ...
  }, [profileId, realtimeEnabled]);
}
```

#### 3.4. Создать админ-панель для управления флагами

**Файл:** `src/pages/admin/AdminFeatureFlags.tsx`
```typescript
// Простая страница для переключения флагов
// Можно добавить в AdminLayout
```

**Приоритет:** 🟡 Средний (можно сделать после запуска)

---

## 4. 📉 Оптимизация Real-time подписок

### Проблема:
Real-time подписки занимают лимит соединений (200-500).

### Решение:
1. Отключить подписки на уведомления (заменить на polling)
2. Подписываться только в активной дуэли
3. Отписываться сразу после выхода

### Шаги:

#### 4.1. Заменить Real-time на Polling для уведомлений

**Файл:** `src/hooks/useNotifications.ts`

Найти код подписки и заменить на polling:

```typescript
// БЫЛО (Real-time):
const channel = supabase
  .channel(`notifications:${profileId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'duel_notifications',
    filter: `user_id=eq.${profileId}`,
  }, handleNewNotification)
  .subscribe();

// СТАЛО (Polling каждые 60 секунд):
useEffect(() => {
  if (!profileId) return;
  
  const pollInterval = setInterval(async () => {
    // Загружаем новые уведомления
    const { data: newNotifications } = await supabase
      .from('duel_notifications')
      .select('*')
      .eq('user_id', profileId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (newNotifications) {
      newNotifications.forEach(handleNewNotification);
    }
  }, 60000); // Каждые 60 секунд
  
  return () => clearInterval(pollInterval);
}, [profileId]);
```

#### 4.2. Проверить отписку в useDuelRealtime

**Файл:** `src/hooks/useDuelRealtime.ts`

Убедиться, что есть cleanup:

```typescript
useEffect(() => {
  if (!duelId) return;
  
  const channel = supabase
    .channel(`duel:${duelId}`)
    .on('postgres_changes', { ... }, handleUpdate)
    .subscribe();
  
  // КРИТИЧНО: Отписываемся при размонтировании
  return () => {
    supabase.removeChannel(channel);
  };
}, [duelId]);
```

**Приоритет:** 🔴 КРИТИЧНО (сделать обязательно)

---

## 5. 💰 Отключить Spend Cap в Supabase

### Проблема:
При достижении лимитов API перестанет отвечать.

### Решение:
Разрешить перерасход (лучше заплатить лишние $50-100, чем потерять пользователей).

### Шаги:

1. Откройте Supabase Dashboard
2. Перейдите в **Settings → Billing**
3. Найдите **Spend Cap** или **Usage Limits**
4. **Отключите** ограничение (разрешите перерасход)
5. Установите лимит уведомлений (например, $200/месяц)

**Приоритет:** 🔴 КРИТИЧНО (сделать обязательно)

---

## 📋 Итоговый чеклист перед запуском

### Критично (сделать обязательно):
- [ ] ✅ Отключить Spend Cap в Supabase
- [ ] ✅ Добавить Rate Limiting через Upstash
- [ ] ✅ Заменить Real-time на Polling для уведомлений
- [ ] ✅ Проверить отписку в useDuelRealtime

### Важно (желательно сделать):
- [ ] ⚠️ Настроить Connection Pooling
- [ ] ⚠️ Создать Feature Flags

### После запуска (мониторинг):
- [ ] 📊 Настроить алерты в Supabase Dashboard
- [ ] 📊 Отслеживать количество активных соединений
- [ ] 📊 Мониторить Edge Function вызовы

---

## 🚀 Порядок выполнения

1. **Сначала (5 минут):** Отключить Spend Cap
2. **Затем (30 минут):** Добавить Rate Limiting
3. **Потом (30 минут):** Оптимизировать Real-time
4. **После (20 минут):** Создать Feature Flags (опционально)

**Общее время:** ~1.5 часа

---

## ✅ После выполнения

Проверьте:
1. Rate Limiting работает (попробуйте сделать 101 запрос подряд)
2. Real-time отключен для уведомлений (проверьте в DevTools)
3. Spend Cap отключен (проверьте в Dashboard)

**Готово к запуску!** 🎉

