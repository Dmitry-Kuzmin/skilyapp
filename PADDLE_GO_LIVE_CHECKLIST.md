# ✅ Paddle Go-Live Checklist

Полный чеклист для перехода на live продакшен согласно [официальной документации Paddle](https://developer.paddle.com/build/onboarding/go-live-checklist).

---

## 1️⃣ Complete Initial Configuration

### Mirror from Sandbox:

- [x] **Set default payment link**
  - Go to **Paddle > Checkout > Checkout settings**
  - Expand **Default payment link**
  - Add: `https://skilyapp.com/purchase` (страница с Paddle.js или checkout)
  - ⚠️ **ВАЖНО:** Должен быть реальный домен (не localhost) и пройти верификацию

- [ ] **Set up payment methods**
  - Go to **Paddle > Checkout > Checkout settings**
  - Expand **Payment methods**
  - Выберите методы оплаты (Card всегда включен)
  - Рекомендуется: Card, PayPal (если доступно)

- [ ] **Set sales tax settings**
  - Go to **Paddle > Checkout > Sales tax settings**
  - Выберите: **Prices exclusive of tax** (для B2B) или **Prices inclusive of tax** (для B2C)
  - Для Испании обычно: **Prices exclusive of tax**

- [ ] **Set balance currency**
  - Go to **Paddle > Business account > Currencies**
  - Выберите: **EUR** (евро) - соответствует банковскому счету в Испании

### New Steps:

- [ ] **Set dunning and recovery settings**
  - Go to **Paddle > Retain**
  - Настройте автоматические повторные попытки платежей
  - Настройте напоминания клиентам

- [ ] **Provide payout details**
  - Go to **Paddle > Business account > Payouts > Payout settings**
  - Введите банковские реквизиты для выплат
  - Установите минимальный порог для выплаты
  - Выберите способ выплаты: Bank transfer, PayPal, или Payoneer

---

## 2️⃣ Add Products to Your Product Catalog

### Copy from Sandbox:

- [x] **Create products and prices**
  - ✅ См. `PADDLE_PRODUCTS_GUIDE.md` для детальных инструкций
  - Создайте 7 продуктов в live аккаунте:
    - Premium Monthly (€9.99/месяц)
    - Premium Yearly (€59.99/год)
    - Duel Pass (€4.99)
    - 100 Coins (€2.99)
    - 500 Coins (€9.99)
    - 1200 Coins (€19.99)
    - 3000 Coins (€39.99)
  - ⚠️ **ВАЖНО:** Скопируйте Price IDs из live аккаунта (НЕ из sandbox!)

- [ ] **Create discounts** (опционально)
  - Go to **Paddle > Catalog > Discounts**
  - Создайте скидки, если планируете промо-акции

- [ ] **Request approval for taxable categories**
  - Go to **Paddle > Catalog > Taxable categories**
  - "Standard Digital Goods" доступен по умолчанию
  - Запросите другие категории, если нужны

---

## 3️⃣ Update Your Integration

### New Steps:

- [x] **Update base URLs for API endpoints**
  - ✅ Используется `https://api.paddle.com` (live)
  - ✅ НЕ используется `sandbox-api.paddle.com`
  - Файл: `supabase/functions/paddle-payment/index.ts`

- [ ] **Generate live API keys and swap them**
  - Go to **Paddle > Developer tools > Authentication**
  - Создайте **Live API key** (НЕ Sandbox!)
  - Обновите `PADDLE_API_KEY` в Supabase Secrets
  - ⚠️ **ВАЖНО:** Используйте Live ключ для продакшена!

- [ ] **Update client-side tokens in your frontend**
  - ⚠️ **ПРИМЕЧАНИЕ:** Мы используем только Edge Functions (серверная интеграция)
  - Paddle.js на фронтенде НЕ используется
  - Если в будущем добавите Paddle.js:
    - Go to **Paddle > Developer tools > Authentication**
    - Создайте **Live client-side token**
    - Обновите в коде фронтенда

- [ ] **Pass `pwCustomer` to `Paddle.Initialize()`**
  - ⚠️ **ПРИМЕЧАНИЕ:** Не применимо, так как Paddle.js не используется
  - Если добавите Paddle.js в будущем - обязательно передавайте `pwCustomer`

- [ ] **Remove sandbox environment setting**
  - ⚠️ **ПРИМЕЧАНИЕ:** Не применимо, так как Paddle.js не используется
  - Если добавите Paddle.js - убедитесь, что нет `Paddle.Environment.set("sandbox")`

- [x] **Swap Paddle IDs in your frontend**
  - ⚠️ **ПРИМЕЧАНИЕ:** Paddle.js не используется на фронтенде
  - Price IDs используются только в Edge Function
  - ✅ Обновлены в `supabase/functions/paddle-payment/index.ts` (после создания продуктов)

- [ ] **Swap Paddle IDs in subscription lifecycle logic**
  - Проверьте логику обновления подписок
  - Замените sandbox Price IDs на live Price IDs
  - Файлы для проверки: Edge Functions, которые обрабатывают подписки

---

## 4️⃣ Create Notification Destinations

### Copy from Sandbox:

- [x] **Create notification destinations**
  - ✅ Webhook создан: `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/paddle-webhook`
  - Go to **Paddle > Developer tools > Notifications**
  - Создайте webhook destination для live аккаунта
  - Выберите события:
    - `transaction.completed`
    - `transaction.payment_failed`
    - `subscription.created`
    - `subscription.updated`
    - `subscription.cancelled`

### New Steps:

- [x] **Allowlist Paddle IP addresses**
  - ✅ Проверка IP адресов реализована
  - Paddle IP адреса для live:
    - `34.232.58.13`
    - `34.195.105.136`
    - `34.237.3.244`
  - Файл: `supabase/functions/paddle-webhook/index.ts`
  - ⚠️ **ВАЖНО:** Проверка работает только в live режиме (когда API key начинается с `live_`)

- [x] **Verify webhook signatures**
  - ✅ Верификация подписи реализована
  - Использует HMAC-SHA256 с форматом `ts=timestamp;h1=signature`
  - Файл: `supabase/functions/paddle-webhook/index.ts`

---

## 5️⃣ Post-Integration

- [ ] **Sign up for developer changelog updates**
  - Перейдите на [Paddle Developer Changelog](https://developer.paddle.com/changelog)
  - Подпишитесь на email уведомления

- [ ] **Sign up for Paddle status page updates**
  - Перейдите на [Paddle Status](https://status.paddle.com)
  - Подпишитесь на обновления (email, webhook, RSS, Slack)

- [ ] **Refresh API keys regularly**
  - Периодически обновляйте API ключи
  - Go to **Paddle > Developer tools > Authentication**
  - Создайте новые ключи, замените старые, отзовите неиспользуемые

---

## ✅ Критические проблемы исправлены

1. ✅ **Webhook signature verification** - Реализована (HMAC-SHA256)
2. ✅ **IP allowlist** - Реализована (проверка IP адресов Paddle)
3. ⚠️ **Live API keys** - Нужно создать Live ключи (не Sandbox) - **ТРЕБУЕТ ДЕЙСТВИЙ**
4. ⚠️ **Price IDs** - Нужно обновить после создания продуктов в live - **ТРЕБУЕТ ДЕЙСТВИЙ**

---

## ✅ Что уже сделано

- [x] API endpoints используют `api.paddle.com` (live)
- [x] Edge Functions созданы (`paddle-payment`, `paddle-webhook`)
- [x] Миграция БД для полей Paddle
- [x] Конфигурация payment-config.ts
- [x] Документация создана
- [x] Страницы Terms, Privacy, Pricing, Refund Policy обновлены

---

**Следующие шаги:** Исправить критические проблемы (webhook signature, IP allowlist) и создать продукты в live аккаунте.

