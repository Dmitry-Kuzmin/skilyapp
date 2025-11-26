# Чеклист настройки системы монетизации

## ✅ Что уже сделано в коде:

1. ✅ Миграции БД созданы (5 файлов)
2. ✅ Edge Functions созданы (8 функций)
3. ✅ Frontend интеграция готова
4. ✅ Логика монетизации реализована

---

## 🔧 Что нужно сделать вручную:

### 1. SUPABASE - Применить миграции

**Шаги:**
1. Откройте Supabase Dashboard → SQL Editor
2. Примените миграции в порядке:
   ```sql
   -- 1. Добавить поля в profiles
   supabase/migrations/20251115000000_add_monetization_fields.sql
   
   -- 2. Создать таблицу transactions
   supabase/migrations/20251115000001_create_transactions.sql
   
   -- 3. Создать таблицу purchases
   supabase/migrations/20251115000002_create_purchases.sql
   
   -- 4. Создать таблицу stripe_events
   supabase/migrations/20251115000003_create_stripe_events.sql
   
   -- 5. Создать таблицу duel_pass_rewards (с данными)
   supabase/migrations/20251115000004_create_duel_pass_rewards.sql
   
   -- 6. Создать таблицу user_claimed_rewards
   supabase/migrations/20251115000005_create_user_claimed_rewards.sql
   ```

**Или через CLI:**
```bash
supabase db push
```

---

### 2. SUPABASE - Развернуть Edge Functions

**Шаги:**
1. Установите Supabase CLI (если не установлен):
   ```bash
   npm install -g supabase
   ```

2. Войдите в Supabase:
   ```bash
   supabase login
   ```

3. Свяжите проект:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Разверните все Edge Functions:
   ```bash
supabase functions deploy complete-test-and-award
   supabase functions deploy coins-spend
   supabase functions deploy premium-status
   supabase functions deploy purchase-create
   supabase functions deploy purchase-webhook
   supabase functions deploy duel-pass-xp
   supabase functions deploy duel-pass-claim
   supabase functions deploy assistant-suggest
   ```

**Или все сразу:**
```bash
supabase functions deploy
```

---

### 3. SUPABASE - Настроить переменные окружения для Edge Functions

**В Supabase Dashboard → Edge Functions → Settings:**

Добавьте следующие секреты:

```
STRIPE_SECRET_KEY=sk_test_... (или sk_live_... для продакшена)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://yourdomain.com/success
STRIPE_CANCEL_URL=https://yourdomain.com/cancel
```

**Для каждой функции, которая использует Stripe:**
- `purchase-create` - нужны все переменные
- `purchase-webhook` - нужны `STRIPE_SECRET_KEY` и `STRIPE_WEBHOOK_SECRET`

---

### 4. STRIPE - Настроить аккаунт и продукты

**Шаги:**

1. **Создайте аккаунт Stripe** (если нет):
   - https://stripe.com
   - Переключитесь в Test Mode для тестирования

2. **Получите API ключи:**
   - Dashboard → Developers → API keys
   - Скопируйте `Secret key` (начинается с `sk_test_` или `sk_live_`)
   - Добавьте в Supabase Edge Functions секреты

3. **Настройте Webhook:**
   - Откройте: **Developers → Webhooks** (или прямая ссылка: https://dashboard.stripe.com/test/webhooks)
   - Нажмите **"Add endpoint"**
   - **Endpoint URL:** `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/purchase-webhook`
   - **Description:** "Supabase Purchase Webhook" (опционально)
   - **Events to send:** Выберите события:
     - ✅ `checkout.session.completed` (обязательно)
     - ✅ `customer.subscription.created` (опционально)
     - ✅ `customer.subscription.updated` (опционально)
     - ✅ `customer.subscription.deleted` (опционально)
   - Нажмите **"Add endpoint"**
   - **ВАЖНО:** После создания webhook скопируйте **Signing secret** (начинается с `whsec_...`)
   - Добавьте этот секрет в Supabase как `STRIPE_WEBHOOK_SECRET`

4. **Создайте продукты (опционально, можно через API):**
   
   **Premium Monthly:**
   - Name: Premium Subscription (Monthly)
   - Price: €9.99/month
   - Recurring: Monthly
   
   **Premium Yearly:**
   - Name: Premium Subscription (Yearly)
   - Price: €59.99/year
   - Recurring: Yearly
   
   **Duel Pass:**
   - Name: Duel Pass (Season)
   - Price: €4.99 (one-time)
   
   **Coin Packs:**
   - Starter: €1.99 (200 coins)
   - Popular: €4.99 (600 coins)
   - Mega: €9.99 (1500 coins)
   - Pro: €19.99 (3500 coins)
   - Whale: €39.99 (8000 coins)

   **Примечание:** Продукты создаются автоматически через `purchase-create` функцию, но можно создать вручную для удобства.

---

### 5. TELEGRAM STARS - Интеграция (НЕ РЕАЛИЗОВАНО)

**Текущий статус:** Интеграция с Telegram Stars не реализована.

**Что нужно сделать:**

1. **Изучить документацию Telegram Stars:**
   - https://core.telegram.org/bots/payments#stars
   - Telegram Bot API для Stars

2. **Создать Edge Function для Telegram Stars:**
   - `supabase/functions/telegram-stars-purchase/index.ts`
   - Обработка платежей через Telegram Stars
   - Интеграция с существующей системой покупок

3. **Обновить frontend:**
   - Определить, когда использовать Stripe, а когда Telegram Stars
   - Добавить UI для выбора метода оплаты
   - Обработка ответов от Telegram Stars API

4. **Настроить Telegram Bot:**
   - Получить токен бота
   - Настроить webhook для платежей
   - Добавить команды для покупок

**Приоритет:** Низкий (можно добавить позже, сначала запустить со Stripe)

---

### 6. ПРОВЕРКА - Тестирование

**После настройки проверьте:**

1. ✅ Миграции применены (проверьте таблицы в Supabase)
2. ✅ Edge Functions развернуты (проверьте в Dashboard)
3. ✅ Переменные окружения установлены
4. ✅ Stripe webhook работает (проверьте логи в Stripe Dashboard)
5. ✅ Покупки проходят успешно (тестовый режим Stripe)

**Тестовые сценарии:**

1. **Premium подписка:**
   - Вызовите `purchase-create` с `catalog_key: "premium_monthly"`
   - Пройдите через Stripe Checkout
   - Проверьте, что `premium_until` обновился в `profiles`

2. **Покупка монет:**
   - Вызовите `purchase-create` с `catalog_key: "coins_pack_starter"`
   - Пройдите через Stripe Checkout
   - Проверьте, что монеты начислились

3. **Duel Pass:**
   - Вызовите `purchase-create` с `catalog_key: "duel_pass_season"`
   - Пройдите через Stripe Checkout
   - Проверьте, что `duel_pass_premium` стал `true`

4. **Начисление наград за тест:**
   - Вызовите `complete-test-and-award` с тестовыми данными (user_id, session_id, score, questions_count и т.д.)
   - Проверьте, что монеты и SP начислились, в `transactions` появилась запись `coins_earned_test`

5. **Duel Pass XP:**
   - Вызовите `duel-pass-xp` с `source_type: "test"`
   - Проверьте, что XP и уровень обновились

---

## 📝 Дополнительные заметки:

### Безопасность:
- ✅ Все операции с монетами на сервере (Edge Functions)
- ✅ Проверка баланса перед списанием
- ✅ Логирование всех транзакций
- ✅ Валидация через Stripe webhooks

### Мониторинг:
- Проверяйте логи Edge Functions в Supabase Dashboard
- Мониторьте таблицу `stripe_events` для отладки
- Проверяйте `transactions` для аудита операций

### Масштабирование:
- При большом количестве транзакций добавьте индексы
- Настройте алерты на ошибки в Stripe Dashboard
- Рассмотрите кеширование для `premium-status`

---

## 🚀 Быстрый старт:

```bash
# 1. Применить миграции
supabase db push

# 2. Развернуть функции
supabase functions deploy

# 3. Настроить секреты в Supabase Dashboard
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.

# 4. Настроить Stripe webhook
# URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/purchase-webhook

# 5. Протестировать покупку в тестовом режиме Stripe
```

---

## ❓ Вопросы?

Если что-то не работает:
1. Проверьте логи Edge Functions в Supabase Dashboard
2. Проверьте логи Stripe webhook в Stripe Dashboard
3. Проверьте таблицу `stripe_events` для отладки
4. Убедитесь, что все переменные окружения установлены

