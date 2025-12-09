# 🧪 План тестирования платежей (Week 4)

## 📋 Обзор

Тестирование всех платежных систем:
- ✅ **Telegram Stars** (только в Telegram Mini App)
- ✅ **Cryptomus** (криптоплатежи)
- ✅ **Paddle** (EUR, веб-версия)
- ⚠️ **Stripe** (отключен до оформления autónomo)

---

## 🎯 Цель тестирования

Убедиться, что:
1. Платежи создаются корректно
2. Webhook'и обрабатываются правильно
3. Награды начисляются автоматически
4. Статусы обновляются в БД
5. Revenue Recovery работает (check-pending-transactions)

---

## 📊 Тестовые сценарии

### 1. Telegram Stars Payment

**Edge Function:** `telegram-stars-payment`

#### Тест 1.1: Создание invoice
```bash
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-stars-payment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_invoice",
    "user_id": "USER_UUID",
    "package_key": "premium_monthly",
    "telegram_user_id": 123456789
  }'
```

**Ожидаемый результат:**
- ✅ HTTP 200
- ✅ JSON с `success: true`, `invoice_link`
- ✅ Запись в `stars_payments` со статусом `pending`

#### Тест 1.2: Проверка webhook (симуляция)
```bash
# Webhook вызывается автоматически Telegram после оплаты
# Проверить вручную через Dashboard → Edge Functions → Logs
```

**Ожидаемый результат:**
- ✅ Запись в `stars_payments` обновлена: `status = 'completed'`, `rewards_status = 'completed'`
- ✅ Premium начислен (если `package_type = 'premium'`)
- ✅ Монеты начислены (если `package_type = 'coins_pack'`)

#### Тест 1.3: Проверка price_stars
```sql
-- Проверить, что price_stars заполнено для всех пакетов
SELECT package_key, price_coins, price_stars, 
       CASE 
         WHEN price_stars IS NULL THEN '❌ MISSING'
         WHEN price_stars < 1 THEN '❌ TOO LOW'
         WHEN price_stars > 10000 THEN '❌ TOO HIGH'
         ELSE '✅ OK'
       END as status
FROM pricing_packages
WHERE is_active = true;
```

**Ожидаемый результат:**
- ✅ Все активные пакеты имеют `price_stars` в диапазоне 1-10000

---

### 2. Cryptomus Payment

**Edge Function:** `cryptomus-payment`

#### Тест 2.1: Создание платежа
```bash
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/cryptomus-payment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_UUID",
    "catalog_key": "coins_pack_100"
  }'
```

**Ожидаемый результат:**
- ✅ HTTP 200
- ✅ JSON с `success: true`, `url`, `orderId`
- ✅ Запись в `purchases` со статусом `pending`, `cryptomus_order_id` заполнен

#### Тест 2.2: Проверка webhook (симуляция)
```bash
# Webhook вызывается автоматически Cryptomus после оплаты
# Проверить вручную через Dashboard → Edge Functions → Logs
```

**Ожидаемый результат:**
- ✅ Запись в `purchases` обновлена: `status = 'completed'`
- ✅ Монеты начислены (если `item_type = 'coins_pack'`)
- ✅ Premium начислен (если `item_type = 'premium'`)

#### Тест 2.3: Проверка Revenue Recovery
```bash
# Запустить check-pending-transactions вручную
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/check-pending-transactions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Ожидаемый результат:**
- ✅ HTTP 200
- ✅ JSON с `results.cryptomus.checked > 0` (если есть pending)
- ✅ Зависшие платежи обработаны

---

### 3. Paddle Payment

**Edge Function:** (нужно найти или создать)

#### Тест 3.1: Проверка конфигурации
```sql
-- Проверить, что есть поля для Paddle
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchases'
  AND column_name LIKE '%paddle%';
```

**Ожидаемый результат:**
- ✅ `paddle_transaction_id` существует
- ✅ `paddle_subscription_id` существует

#### Тест 3.2: Проверка Revenue Recovery
```bash
# Запустить check-pending-transactions
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/check-pending-transactions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Ожидаемый результат:**
- ✅ HTTP 200
- ✅ JSON с `results.paddle.checked >= 0` (нет ошибок)

---

## 🔍 Проверка начислений

### Тест 4.1: Проверка монет
```sql
-- Проверить начисление монет после платежа
SELECT 
  t.user_id,
  t.transaction_type,
  t.amount,
  t.created_at,
  p.coins as current_balance
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.transaction_type LIKE '%purchase%'
  AND t.created_at > NOW() - INTERVAL '1 hour'
ORDER BY t.created_at DESC
LIMIT 10;
```

**Ожидаемый результат:**
- ✅ Транзакции созданы с правильным `amount`
- ✅ Баланс `coins` обновлен корректно

### Тест 4.2: Проверка Premium
```sql
-- Проверить начисление Premium
SELECT 
  p.id,
  p.premium_until,
  p.duel_pass_premium,
  t.transaction_type,
  t.created_at
FROM profiles p
JOIN transactions t ON t.user_id = p.id
WHERE t.transaction_type LIKE '%premium%'
  AND t.created_at > NOW() - INTERVAL '1 hour'
ORDER BY t.created_at DESC
LIMIT 10;
```

**Ожидаемый результат:**
- ✅ `premium_until` обновлен (для подписок)
- ✅ `duel_pass_premium = true` (для Premium)

---

## ⚠️ Тестовые данные

### Для Telegram Stars:
- **Минимальная сумма:** 1 Star
- **Максимальная сумма:** 10000 Stars
- **Тестовый пакет:** Создать пакет с `price_stars = 1` для тестирования

### Для Cryptomus:
- **Тестовый режим:** Использовать Sandbox (если доступен)
- **Или:** Создать инвойс и не оплачивать, проверить статус `pending` → `expired`

### Для Paddle:
- **Тестовый режим:** Использовать Paddle Sandbox
- **Тестовая карта:** `4242 4242 4242 4242`

---

## 📝 Чеклист тестирования

### Telegram Stars:
- [ ] Создание invoice работает
- [ ] `price_stars` заполнено для всех пакетов
- [ ] Webhook обрабатывается корректно
- [ ] Награды начисляются автоматически
- [ ] Статусы обновляются в БД

### Cryptomus:
- [ ] Создание платежа работает
- [ ] Webhook обрабатывается корректно
- [ ] Награды начисляются автоматически
- [ ] Revenue Recovery обрабатывает зависшие платежи

### Paddle:
- [ ] Поля в БД существуют
- [ ] Revenue Recovery работает (нет ошибок)
- [ ] (Если есть Edge Function) Создание платежа работает

### Общее:
- [ ] Монеты начисляются корректно
- [ ] Premium начисляется корректно
- [ ] Транзакции записываются в `transactions`
- [ ] Логи доступны и читаемы

---

## 🚨 Известные ограничения

1. **Telegram Stars:** Работает только в Telegram Mini App
2. **Stripe:** Отключен до оформления autónomo
3. **Paddle:** Проходит проверку (verification), может быть недоступен

---

## 📊 Ожидаемые результаты

После тестирования:
- ✅ Все платежные системы работают
- ✅ Награды начисляются автоматически
- ✅ Revenue Recovery обрабатывает зависшие платежи
- ✅ Нет ошибок в логах

---

**Готово к тестированию!** 🚀

