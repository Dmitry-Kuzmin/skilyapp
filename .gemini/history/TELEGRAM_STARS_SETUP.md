# 🎯 Настройка Telegram Stars Payment System

## 📋 Обзор

Система приема платежей через Telegram Stars с поддержкой:
- ✅ Автоматического начисления Premium и монет
- ✅ Защиты от мошенничества (fraud protection)
- ✅ Автоматического retry при ошибках начисления
- ✅ Idempotency (защита от дублей)

**Курс:** 1 Star = 100 coins (внутренняя валюта)  
**Округление:** Math.round для честной цены

---

## 🔧 Шаг 1: Применить миграцию

```bash
# Миграция уже создана в:
supabase/migrations/20250120000000_create_telegram_stars_payment_system.sql

# Применить через Supabase CLI:
supabase db push

# Или через Supabase Dashboard → Database → Migrations
```

Миграция создаст:
- Таблицы `pricing_packages` и `stars_payments`
- RPC функции `activate_premium` и `process_stars_payment_rewards`
- Инициализирует пакеты (Premium и монеты)

---

## 🔑 Шаг 2: Настроить переменные окружения

В Supabase Dashboard → Edge Functions → Settings добавить:

### Обязательные:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Как получить TELEGRAM_BOT_TOKEN:
1. Открыть [@BotFather](https://t.me/BotFather) в Telegram
2. Отправить `/newbot` или выбрать существующего бота
3. Скопировать токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

## 📡 Шаг 3: Настроить Telegram Bot Webhook

Webhook нужен для получения событий платежей от Telegram.

### ✅ Функции уже задеплоены!

Функции `telegram-stars-payment` и `stars-payment-retry` уже задеплоены и доступны в Dashboard.

**URL функции:** `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-stars-payment`

### Вариант A: Через скрипт (рекомендуется)

Используйте готовый скрипт:

```bash
# Установите TELEGRAM_BOT_TOKEN
export TELEGRAM_BOT_TOKEN="your_bot_token_here"

# Запустите скрипт
./scripts/setup-telegram-webhook.sh
```

Или передайте токен напрямую:

```bash
./scripts/setup-telegram-webhook.sh YOUR_BOT_TOKEN
```

### Вариант B: Через curl (вручную)

```bash
# Замените YOUR_BOT_TOKEN на ваш токен
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-stars-payment",
    "allowed_updates": ["pre_checkout_query", "message"]
  }'
```

### Вариант C: Через браузер (быстрый способ)

Откройте в браузере (замените `YOUR_BOT_TOKEN`):

```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-stars-payment&allowed_updates=["pre_checkout_query","message"]
```

### Проверить webhook:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Или в браузере:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": {
    "url": "https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-stars-payment",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## ⚙️ Шаг 4: Настроить Cron Job для Retry

Автоматический retry начислений каждые 5 минут.

### ⚠️ Важно: pg_cron доступен только на платных планах

`pg_cron` доступен только на планах **Pro** и выше. Если у вас **Free** план, используйте [альтернативный вариант](#альтернативный-вариант-для-free-плана).

---

### Вариант A: Через SQL Editor (Pro план и выше)

**Быстрый способ:**

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте и выполните содержимое файла: `scripts/setup-stars-retry-cron.sql`

**Или выполните вручную:**

```sql
-- Шаг 1: Установить расширение (если еще не установлено)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Шаг 2: Проверить существующие cron jobs
SELECT * FROM cron.job WHERE jobname = 'stars-payment-retry';

-- Шаг 3: Удалить существующий (если нужно пересоздать)
-- SELECT cron.unschedule('stars-payment-retry');

-- Шаг 4: Создать новый cron job
SELECT cron.schedule(
  'stars-payment-retry',
  '*/5 * * * *', -- Каждые 5 минут
  $$
  SELECT net.http_post(
    url := 'https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    )
  );
  $$
);

-- Шаг 5: Проверить создание
SELECT 
  jobid,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname = 'stars-payment-retry';
```

### Проверить cron job:

```sql
-- Посмотреть все cron jobs
SELECT * FROM cron.job;

-- Посмотреть конкретный job
SELECT * FROM cron.job WHERE jobname = 'stars-payment-retry';

-- Посмотреть историю выполнения
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stars-payment-retry')
ORDER BY start_time DESC 
LIMIT 10;
```

---

### Альтернативный вариант (для Free плана)

Если `pg_cron` недоступен, используйте внешний сервис:

#### Вариант 1: GitHub Actions (бесплатно)

Создайте файл `.github/workflows/stars-payment-retry.yml`:

```yaml
name: Stars Payment Retry

on:
  schedule:
    - cron: '*/5 * * * *'  # Каждые 5 минут
  workflow_dispatch:  # Ручной запуск

jobs:
  retry:
    runs-on: ubuntu-latest
    steps:
      - name: Call Retry Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry
```

**Настройка:**
1. Создайте секрет `SUPABASE_ANON_KEY` в GitHub → Settings → Secrets
2. Получите ANON_KEY из Supabase Dashboard → Settings → API

#### Вариант 2: Cron-job.org (бесплатно)

1. Зарегистрируйтесь на [cron-job.org](https://cron-job.org)
2. Создайте новый cron job:
   - **URL:** `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry`
   - **Method:** POST
   - **Headers:** `Authorization: Bearer YOUR_ANON_KEY`
   - **Schedule:** Каждые 5 минут

#### Вариант 3: Ручной запуск (для тестирования)

Используйте готовый скрипт:

```bash
# Установите ANON_KEY
export SUPABASE_ANON_KEY="your_anon_key_here"

# Запустите retry
./scripts/manual-retry-stars-payment.sh
```

Или через curl:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry
```

---

## 🧪 Шаг 5: Тестирование

### 1. Проверить создание invoice

В Telegram Mini App:
1. Открыть PaywallModal
2. Нажать кнопку "Оплатить ⭐"
3. Должно открыться нативное окно Telegram Stars

### 2. Проверить webhook

Отправить тестовый запрос:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/telegram-stars-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "action": "pre_checkout_query",
    "query_id": "test_query_id",
    "invoice_payload": "test_payload"
  }'
```

### 3. Проверить retry механизм

```bash
curl -X POST https://your-project.supabase.co/functions/v1/stars-payment-retry \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 📊 Мониторинг

### Проверить платежи в БД:

```sql
-- Все платежи
SELECT * FROM stars_payments ORDER BY created_at DESC LIMIT 10;

-- Платежи с ошибками начисления
SELECT * FROM stars_payments 
WHERE rewards_status IN ('failed', 'retrying', 'manual_review')
ORDER BY created_at DESC;

-- Статистика по статусам
SELECT 
  status,
  rewards_status,
  COUNT(*) as count
FROM stars_payments
GROUP BY status, rewards_status;
```

### Логи Edge Functions:

Supabase Dashboard → Edge Functions → Logs

---

## 🔒 Безопасность

### Реализовано:

1. **Fraud Protection:**
   - Двойная проверка пакета (при создании invoice и при успешной оплате)
   - Проверка суммы платежа
   - Валидация пакета в БД

2. **Idempotency:**
   - Уникальный `invoice_payload` для каждого платежа
   - Проверка `telegram_payment_charge_id` на дубли
   - Защита от повторной обработки

3. **Soft-Fail:**
   - Награды начисляются через отдельную RPC функцию
   - Ошибки логируются в `rewards_errors`
   - Автоматический retry до 5 попыток

---

## 🐛 Troubleshooting

### Проблема: Invoice не создается

**Решение:**
1. Проверить `TELEGRAM_BOT_TOKEN` в Edge Functions Settings
2. Проверить логи Edge Function
3. Убедиться, что пакет существует в `pricing_packages`

### Проблема: Webhook не получает события

**Решение:**
1. Проверить webhook URL: `getWebhookInfo`
2. Убедиться, что webhook настроен правильно
3. Проверить, что функция `telegram-stars-payment` доступна публично

### Проблема: Награды не начисляются

**Решение:**
1. Проверить статус `rewards_status` в БД
2. Проверить `rewards_errors` для деталей
3. Запустить retry вручную через Edge Function
4. Проверить логи RPC функции `process_stars_payment_rewards`

### Проблема: Дублирующие платежи

**Решение:**
1. Проверить уникальность `telegram_payment_charge_id`
2. Проверить логи на наличие дублей
3. Убедиться, что idempotency работает корректно

---

## 📝 Пакеты по умолчанию

После миграции создаются следующие пакеты:

| Пакет | Цена (coins) | Stars | Что дает |
|-------|--------------|-------|----------|
| `premium_monthly` | 30,000 | 300 ⭐ | Premium на 30 дней |
| `premium_yearly` | 180,000 | 1,800 ⭐ | Premium на 365 дней |
| `coins_300` | 300 | 3 ⭐ | 300 монет |
| `coins_700` | 700 | 7 ⭐ | 700 монет |
| `coins_1500` | 1,500 | 15 ⭐ | 1,500 монет |
| `coins_5000` | 5,000 | 50 ⭐ | 5,000 монет |

---

## 🎯 Следующие шаги

1. ✅ Применить миграцию
2. ✅ Настроить `TELEGRAM_BOT_TOKEN`
3. ✅ Настроить webhook
4. ✅ Настроить cron job для retry
5. ✅ Протестировать платежи
6. ✅ Мониторить логи и статистику

---

## 📚 Дополнительная информация

- [Telegram Bot API - Payments](https://core.telegram.org/bots/payments)
- [Telegram Stars Documentation](https://core.telegram.org/bots/payments#stars)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

