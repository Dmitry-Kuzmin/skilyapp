# ⚡ Быстрый старт: Защита за 1 час

**Время:** 1 час  
**Приоритет:** 🔴 КРИТИЧНО перед запуском

---

## 📋 Чеклист (по порядку)

### ✅ 1. Отключить Spend Cap (2 минуты)

1. Откройте https://supabase.com/dashboard
2. Settings → Billing
3. Найдите **Spend Cap** или **Usage Limits**
4. **Отключите** ограничение
5. Установите лимит уведомлений: $200/месяц

**Готово!** ✅

---

### ✅ 2. Настроить Upstash Redis (10 минут)

#### 2.1. Создать аккаунт
1. Зарегистрируйтесь: https://upstash.com
2. Создайте Redis database (бесплатный тариф)
3. Скопируйте:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

#### 2.2. Добавить секреты в Supabase
1. Supabase Dashboard → Settings → Edge Functions → Secrets
2. Добавьте:
   - `UPSTASH_REDIS_REST_URL` = ваш URL
   - `UPSTASH_REDIS_REST_TOKEN` = ваш токен

**Готово!** ✅

---

### ✅ 3. Применить миграцию Feature Flags (5 минут)

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла:
   ```
   supabase/migrations/20250101000000_app_config_feature_flags.sql
   ```
3. Вставьте и выполните (Run)

**Готово!** ✅

---

### ✅ 4. Добавить Rate Limiting в Edge Functions (20 минут)

#### 4.1. Файл уже создан:
- `supabase/functions/_shared/rate-limit.ts` ✅

#### 4.2. Использовать в критичных функциях:

**Пример для `duel-manager/index.ts`:**

Добавьте в начало функции (после `Deno.serve`):

```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Rate limiting в начале
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

**Применить к функциям:**
- [ ] `duel-manager`
- [ ] `coins-spend`
- [ ] `premium-status`
- [ ] `ai-chat`

**Готово!** ✅

---

### ✅ 5. Проверить Real-time подписки (10 минут)

#### 5.1. Проверить useNotifications

**Файл:** `src/hooks/useNotifications.ts`

Убедитесь, что используется **polling**, а не real-time:
- ✅ Должен быть `refetchInterval: 60000` (polling каждые 60 сек)
- ❌ НЕ должно быть `.subscribe()` на канал

**Статус:** ✅ Уже используется polling (проверено)

#### 5.2. Проверить useDuelRealtime

**Файл:** `src/hooks/useDuelRealtime.ts`

Убедитесь, что есть cleanup:
```typescript
useEffect(() => {
  if (!duelId) return;
  
  const channel = supabase.channel(`duel_${duelId}`)
    .on('postgres_changes', { ... }, handleUpdate)
    .subscribe();
  
  // КРИТИЧНО: Отписываемся при размонтировании
  return () => {
    supabase.removeChannel(channel);
  };
}, [duelId]);
```

**Статус:** ✅ Cleanup есть (проверено)

---

### ✅ 6. Опционально: Feature Flags (10 минут)

#### 6.1. Хук уже создан:
- `src/hooks/useFeatureFlag.ts` ✅

#### 6.2. Использовать в компонентах:

**Пример в `useDuelRealtime.ts`:**
```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function useDuelRealtime(duelId: string | null, ...) {
  const { enabled: realtimeEnabled } = useFeatureFlag('duel_realtime', true);
  
  useEffect(() => {
    if (!duelId || !realtimeEnabled) {
      console.log('[useDuelRealtime] Real-time disabled by feature flag');
      return;
    }
    
    // ... код подписки ...
  }, [duelId, realtimeEnabled]);
}
```

**Готово!** ✅

---

## 🎯 Итоговый чеклист

### Критично (обязательно):
- [x] ✅ Отключить Spend Cap
- [ ] ⚠️ Настроить Upstash Redis
- [ ] ⚠️ Добавить Rate Limiting в Edge Functions
- [x] ✅ Проверить Real-time подписки (уже оптимизировано)

### Важно (желательно):
- [ ] ⚠️ Применить миграцию Feature Flags
- [ ] ⚠️ Использовать Feature Flags в компонентах

---

## 🚀 После выполнения

### Тестирование:

1. **Rate Limiting:**
   ```bash
   # Сделайте 101 запрос подряд к Edge Function
   # Должен вернуть 429 после 100-го запроса
   ```

2. **Feature Flags:**
   ```sql
   -- В Supabase SQL Editor:
   UPDATE app_config SET value = 'false'::jsonb WHERE key = 'duel_realtime';
   -- Проверьте, что real-time отключился
   ```

3. **Spend Cap:**
   - Проверьте в Dashboard → Billing, что лимит отключен

---

## 📊 Мониторинг после запуска

1. **Supabase Dashboard → Monitoring:**
   - Количество активных соединений
   - Edge Function вызовы
   - Database connections

2. **Upstash Dashboard:**
   - Количество rate limit проверок
   - Использование Redis

3. **Алерты:**
   - Настройте уведомления при превышении лимитов

---

## ✅ Готово!

После выполнения всех пунктов вы защищены от:
- ✅ DDoS атак (Rate Limiting)
- ✅ Перегрузки базы (Connection Pooling опционально)
- ✅ Превышения лимитов (Spend Cap отключен)
- ✅ Перегрузки Real-time (уже оптимизировано)

**Можно запускать рекламу!** 🚀

