# ✅ Следующие шаги после добавления секретов

**Статус:** ✅ Upstash секреты добавлены в Supabase  
**Что дальше:** 3 простых шага

---

## 📋 Чеклист

- [x] ✅ Upstash база данных создана
- [x] ✅ Секреты добавлены в Supabase
- [ ] ⏭️ Применить миграцию Feature Flags
- [ ] ⏭️ Добавить Rate Limiting в Edge Functions
- [ ] ⏭️ Отключить Spend Cap в Supabase

---

## 🚀 Шаг 1: Применить миграцию Feature Flags (5 минут)

### Что делать:

1. **Откройте Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Выберите ваш проект
   - Перейдите в **SQL Editor**

2. **Откройте файл миграции:**
   - `supabase/migrations/20250101000000_app_config_feature_flags.sql`
   - Скопируйте **весь** содержимое файла

3. **Вставьте в SQL Editor:**
   - Вставьте скопированный SQL
   - Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)

4. **Проверьте результат:**
   - Должно быть сообщение: `Success. No rows returned`
   - Или: `CREATE TABLE`, `INSERT`, `CREATE FUNCTION` - все успешно

**Готово!** ✅

---

## 🛑 Шаг 2: Добавить Rate Limiting в Edge Functions (20 минут)

### Критичные функции (добавить обязательно):

#### 2.1. `duel-manager` (самая важная)

**Файл:** `supabase/functions/duel-manager/index.ts`

**Добавьте в начало (после импортов, перед `Deno.serve`):**

```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
```

**Добавьте в начало функции (после `Deno.serve(async (req) => {`):**

```typescript
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 🛑 RATE LIMITING - защита от DDoS
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 100, // 100 запросов
    windowMs: 60000, // в минуту
  });
  
  if (!rateLimit.allowed) {
    console.warn('[duel-manager] Rate limit exceeded:', {
      ip: clientIP,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt).toISOString(),
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }
```

#### 2.2. `coins-spend` (платежная операция)

**Файл:** `supabase/functions/coins-spend/index.ts`

**Добавьте то же самое, но с лимитом 50:**

```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

// В начале функции:
const rateLimit = await checkRateLimit({
  identifier: getClientIP(req),
  limit: 50, // 50 запросов (строже для платежей)
  windowMs: 60000,
});
```

#### 2.3. `ai-chat` (дорогая операция)

**Файл:** `supabase/functions/ai-chat/index.ts`

**Добавьте с лимитом 30:**

```typescript
const rateLimit = await checkRateLimit({
  identifier: getClientIP(req),
  limit: 30, // 30 запросов (AI дорогое)
  windowMs: 60000,
});
```

**Готово!** ✅

---

## 💰 Шаг 3: Отключить Spend Cap (2 минуты)

### Что делать:

1. **Откройте Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Выберите ваш проект
   - Перейдите в **Settings** → **Billing**

2. **Найдите Spend Cap:**
   - Найдите раздел **"Spend Cap"** или **"Usage Limits"**
   - Или **"Project Limits"**

3. **Отключите:**
   - Переключите **Spend Cap** в положение **OFF**
   - Или снимите галочку с **"Enable spend cap"**

4. **Установите лимит уведомлений (опционально):**
   - Если есть настройка лимита уведомлений - установите $200/месяц

**Готово!** ✅

---

## ✅ Проверка работы

### Тест Rate Limiting:

1. **Откройте любую Edge Function с rate limiting**
2. **Сделайте 101 запрос подряд** (для `duel-manager`)
3. **Должен вернуть 429** после 100-го запроса

### Тест Feature Flags:

```sql
-- В Supabase SQL Editor:
SELECT * FROM app_config;

-- Должны быть 4 записи:
-- realtime_enabled, notifications_realtime, duel_realtime, ai_chat_enabled
```

---

## 📊 Итоговый статус

После выполнения всех шагов:

- ✅ Rate Limiting работает (защита от DDoS)
- ✅ Feature Flags готовы (можно отключать фичи)
- ✅ Spend Cap отключен (нет риска остановки)
- ✅ Готово к запуску рекламы! 🚀

---

## 🎯 Приоритет выполнения

1. **Критично:** Отключить Spend Cap (2 мин) - без этого API может перестать работать
2. **Критично:** Добавить Rate Limiting в `duel-manager` (5 мин) - самая важная функция
3. **Важно:** Применить миграцию Feature Flags (5 мин) - для быстрого отключения фич
4. **Важно:** Добавить Rate Limiting в `coins-spend` и `ai-chat` (10 мин)

**Общее время:** ~20-30 минут

---

**Удачи!** После выполнения всех шагов вы полностью защищены. 🛡️

