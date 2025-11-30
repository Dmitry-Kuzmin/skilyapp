# 🛒 Настройка Paddle для приема платежей

## 📋 Обзор

Paddle — это Merchant of Record (MoR) платформа, которая:
- ✅ Не требует регистрации бизнеса (autónomo) в Испании
- ✅ Обрабатывает налоги и compliance автоматически
- ✅ Поддерживает SaaS и цифровые продукты
- ✅ Работает как альтернатива Stripe для веб-версии

---

## 🔑 Шаг 1: Получить API ключи

1. **Войдите в Paddle Dashboard:**
   - Перейдите на [vendors.paddle.com](https://vendors.paddle.com)
   - Войдите в аккаунт

2. **Перейдите в Developer Tools:**
   - В боковом меню выберите **Developer Tools** → **Authentication**
   - Или перейдите напрямую: [vendors.paddle.com/authentication](https://vendors.paddle.com/authentication)

3. **Создайте API ключ:**
   - Нажмите **"Create API key"**
   - Выберите **Sandbox** (для тестирования) или **Live** (для продакшена)
   - Скопируйте:
     - **API Key** (начинается с `test_` или `live_`)
     - **Paddle Signature Key** (для верификации webhook)

4. **Настройте Webhook:**
   - Перейдите в **Developer Tools** → **Notifications** (или **Webhooks**)
   - Добавьте webhook URL: `https://[YOUR_SUPABASE_URL]/functions/v1/paddle-webhook`
   - Выберите события:
     - `transaction.completed`
     - `transaction.payment_failed`
     - `subscription.created`
     - `subscription.updated`
     - `subscription.cancelled`

---

## 🔐 Шаг 2: Настроить Secrets в Supabase

1. **Откройте Supabase Dashboard:**
   - Перейдите в **Edge Functions** → **Settings** → **Secrets**

2. **Добавьте следующие секреты:**

   ```
   PADDLE_API_KEY=test_xxxxxxxxxxxxx (или live_xxxxxxxxxxxxx)
   PADDLE_SIGNATURE_KEY=xxxxxxxxxxxxx (для верификации webhook)
   PADDLE_VENDOR_ID=xxxxxxxxxxxxx (ID вашего аккаунта Paddle)
   ```

   **Где найти:**
   - `PADDLE_API_KEY` — в Developer Tools → Authentication
   - `PADDLE_SIGNATURE_KEY` — в Developer Tools → Notifications → Webhook settings
   - `PADDLE_VENDOR_ID` — в Settings → Account → Vendor ID

---

## 📦 Шаг 3: Создать продукты в Paddle

**📋 Подробная инструкция:** См. файл `PADDLE_PRODUCTS_GUIDE.md`

### Краткая версия:

1. **Перейдите в Catalog:**
   - В боковом меню выберите **Catalog**
   - Нажмите **"Create product"**

2. **Создайте 7 продуктов:**
   - Premium Monthly (€9.99/месяц, Subscription)
   - Premium Yearly (€59.99/год, Subscription)
   - Duel Pass (€4.99, One-time)
   - 100 Coins (€2.99, One-time)
   - 500 Coins (€9.99, One-time)
   - 1200 Coins (€19.99, One-time)
   - 3000 Coins (€39.99, One-time)

3. **Скопируйте Price IDs:**
   - После создания каждого продукта скопируйте **Price ID** (начинается с `pri_...`)
   - Запишите их в таблицу (см. `PADDLE_PRODUCTS_GUIDE.md`)
   - Обновите маппинг `PADDLE_PRICE_IDS` в `supabase/functions/paddle-payment/index.ts`

---

## 🔧 Шаг 4: Настроить Checkout

1. **Перейдите в Checkout:**
   - В боковом меню выберите **Checkout**
   - Настройте дизайн checkout страницы

2. **Настройте Success/Cancel URLs:**
   - Success URL: `https://skilyapp.com/purchase/success?transaction_id={transaction_id}`
   - Cancel URL: `https://skilyapp.com/purchase/cancel`

---

## 🚀 Шаг 5: Деплой Edge Functions

После создания Edge Functions (`paddle-payment` и `paddle-webhook`):

```bash
# Деплой функции создания платежей
supabase functions deploy paddle-payment

# Деплой функции обработки webhook
supabase functions deploy paddle-webhook
```

---

## ✅ Шаг 6: Проверка

1. **Тестовый платеж:**
   - Используйте тестовые карты Paddle:
     - Успешный платеж: `4242 4242 4242 4242`
     - Неудачный платеж: `4000 0000 0000 0002`
   - CVV: любой 3-значный код
   - Дата: любая будущая дата

2. **Проверьте webhook:**
   - В Paddle Dashboard → Developer Tools → Notifications
   - Проверьте, что события доходят до вашего webhook

---

## 📚 Полезные ссылки

- [Paddle API Documentation](https://developer.paddle.com/)
- [Paddle Checkout API](https://developer.paddle.com/api-reference/overview)
- [Paddle Webhooks](https://developer.paddle.com/webhook-reference/overview)
- [Paddle Test Cards](https://developer.paddle.com/concepts/payment-methods/test-cards)

---

## ⚠️ Важные замечания

1. **Sandbox vs Live:**
   - Используйте Sandbox для тестирования
   - Переключитесь на Live только после полной проверки

2. **Webhook Security:**
   - Всегда проверяйте подпись webhook через `PADDLE_SIGNATURE_KEY`
   - Используйте HTTPS для webhook URL

3. **Idempotency:**
   - Paddle поддерживает idempotency keys
   - Используйте их для предотвращения дубликатов платежей

---

**Готово!** После настройки Paddle станет доступен как метод оплаты в приложении. 🎉

