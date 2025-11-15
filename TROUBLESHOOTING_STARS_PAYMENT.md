# 🔧 Устранение проблем: Telegram Stars Payment

## ❌ Ошибка 500 при создании invoice

### Проблема 1: TELEGRAM_BOT_TOKEN не настроен

**Симптом:** Ошибка 500, в логах Edge Function: `TELEGRAM_BOT_TOKEN not configured`

**Решение:**

1. **Получите токен бота:**
   - Откройте [@BotFather](https://t.me/BotFather) в Telegram
   - Отправьте `/mybots` или `/newbot`
   - Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Добавьте секрет в Supabase:**
   - Откройте Supabase Dashboard → **Edge Functions** → **Settings** → **Secrets**
   - Нажмите **"Add new secret"**
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** вставьте токен бота
   - Нажмите **"Save"**

3. **Передеплойте функцию:**
   ```bash
   supabase functions deploy telegram-stars-payment --project-ref yffjnqegeiorunyvcxkn
   ```

---

### Проблема 2: Миграция БД не применена

**Симптом:** Ошибка 500, в логах: `relation "pricing_packages" does not exist`

**Решение:**

1. **Примените миграцию:**
   - Откройте Supabase Dashboard → **SQL Editor**
   - Скопируйте содержимое файла: `supabase/migrations/20250120000000_create_telegram_stars_payment_system.sql`
   - Вставьте в SQL Editor
   - Нажмите **"Run"** (или `Ctrl+Enter`)

2. **Проверьте, что таблицы созданы:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('pricing_packages', 'stars_payments');
   ```

3. **Проверьте, что пакеты инициализированы:**
   ```sql
   SELECT package_key, price_coins, premium_days 
   FROM pricing_packages 
   WHERE is_active = true;
   ```

---

### Проблема 3: Workflow не появляется в GitHub Actions

**Симптом:** Workflow не видно в списке, показывает "Not found"

**Решение:**

1. **Проверьте, что файл в правильной ветке:**
   - Workflow должен быть в ветке `feature/premium-race-game`
   - Или слейте в `main` ветку

2. **Откройте прямую ссылку:**
   ```
   https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml?branch=feature/premium-race-game
   ```

3. **Или создайте Pull Request и слейте в main:**
   ```bash
   git checkout main
   git merge feature/premium-race-game
   git push origin main
   ```

---

## 🔍 Как проверить логи Edge Function

1. **Откройте Supabase Dashboard:**
   - https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions

2. **Найдите функцию `telegram-stars-payment`**

3. **Откройте вкладку "Logs"**

4. **Проверьте последние ошибки:**
   - Ищите строки с `ERROR` или `TELEGRAM_BOT_TOKEN`
   - Проверьте, что все параметры передаются правильно

---

## ✅ Быстрая проверка

### Проверка 1: Секреты настроены?

Supabase Dashboard → Edge Functions → Settings → Secrets:
- ✅ `TELEGRAM_BOT_TOKEN` должен быть установлен

### Проверка 2: Миграция применена?

Supabase Dashboard → SQL Editor:
```sql
SELECT COUNT(*) FROM pricing_packages WHERE is_active = true;
```

**Ожидаемый результат:** Должно вернуть 6 (2 Premium + 4 пакета монет)

### Проверка 3: Функция задеплоена?

Supabase Dashboard → Edge Functions:
- ✅ `telegram-stars-payment` должна быть в списке
- ✅ Последний деплой должен быть недавно

---

## 🧪 Тестирование после исправления

1. **Откройте приложение в Telegram Mini App**

2. **Попробуйте купить Premium:**
   - Откройте PaywallModal
   - Нажмите "Оплатить ⭐"
   - Должно открыться нативное окно Telegram Stars

3. **Проверьте консоль:**
   - Не должно быть ошибок 500
   - Должен быть лог: `[Stars Payment] Creating invoice: ...`

---

## 📊 Проверка логов

### В консоли браузера должно быть:
```
[Stars Payment] Creating invoice: {user_id: "...", package_key: "premium_monthly", telegram_user_id: ...}
```

### В логах Edge Function должно быть:
```
[Stars Payment] Creating invoice: {user_id: "...", package_key: "premium_monthly", telegram_user_id: ...}
[Stars Payment] Invoice created successfully: {payment_id: "...", invoice_link: "...", stars_amount: 300}
```

---

## ❓ Если все еще не работает

1. **Проверьте логи Edge Function** (самое важное!)
2. **Убедитесь, что миграция применена**
3. **Проверьте, что `TELEGRAM_BOT_TOKEN` правильный**
4. **Передеплойте функцию после добавления секрета**

