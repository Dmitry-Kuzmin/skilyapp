# 🚨 Быстрое исправление ошибки 500

## ❌ Проблема: Ошибка 500 при оплате звездами

Ошибка `Edge Function returned a non-2xx status code` означает, что функция упала с ошибкой.

---

## ✅ Решение (по порядку):

### Шаг 1: Проверить логи Edge Function

1. **Откройте Supabase Dashboard:**
   - https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions

2. **Найдите функцию `telegram-stars-payment`**

3. **Откройте вкладку "Logs"**

4. **Проверьте последние ошибки** - там будет точная причина

---

### Шаг 2: Проверить TELEGRAM_BOT_TOKEN

**Самая частая причина ошибки 500!**

1. **Откройте Supabase Dashboard → Edge Functions → Settings → Secrets**

2. **Проверьте, есть ли секрет `TELEGRAM_BOT_TOKEN`**

3. **Если нет - добавьте:**
   - Нажмите **"Add new secret"**
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** токен от @BotFather
   - **Save**

4. **После добавления секрета - передеплойте функцию:**
   ```bash
   supabase functions deploy telegram-stars-payment --project-ref yffjnqegeiorunyvcxkn
   ```

---

### Шаг 3: Применить миграцию БД

**Вторая частая причина - таблицы не созданы!**

1. **Откройте Supabase Dashboard → SQL Editor**

2. **Скопируйте и выполните миграцию:**
   - Откройте файл: `supabase/migrations/20250120000000_create_telegram_stars_payment_system.sql`
   - Скопируйте весь SQL
   - Вставьте в SQL Editor
   - Нажмите **"Run"**

3. **Проверьте, что таблицы созданы:**
   ```sql
   SELECT COUNT(*) FROM pricing_packages WHERE is_active = true;
   ```
   
   **Должно вернуть:** `6` (2 Premium + 4 пакета монет)

---

### Шаг 4: Проверить workflow в GitHub

Workflow может не появляться, потому что он в feature ветке.

**Решение:**

1. **Откройте прямую ссылку:**
   ```
   https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml
   ```

2. **Или переключитесь на ветку в GitHub UI:**
   - GitHub → Actions
   - Вверху выберите ветку `feature/premium-race-game` (выпадающий список)

---

## 🔍 Диагностика

### Проверка 1: Секреты

```bash
# Проверить через Supabase Dashboard
# Edge Functions → Settings → Secrets
# Должен быть: TELEGRAM_BOT_TOKEN
```

### Проверка 2: Таблицы БД

```sql
-- Выполнить в SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('pricing_packages', 'stars_payments');
```

**Должно вернуть 2 строки.**

### Проверка 3: Пакеты

```sql
SELECT package_key, price_coins 
FROM pricing_packages 
WHERE is_active = true;
```

**Должно вернуть 6 пакетов.**

---

## 🎯 Приоритет исправления

1. **Сначала:** Проверьте логи Edge Function (самое важное!)
2. **Затем:** Добавьте `TELEGRAM_BOT_TOKEN` если его нет
3. **Затем:** Примените миграцию БД если таблиц нет
4. **Затем:** Передеплойте функцию

---

## 📞 После исправления

Попробуйте снова оплатить через звезды. Если все настроено правильно - должно работать!

