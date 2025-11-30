# 📋 Оставшиеся задачи для подключения Paddle

## 🚨 Критические задачи (обязательно)

### 1. Создать продукты в Paddle Live аккаунте
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🔴 Высокий

Нужно создать **7 продуктов** в Paddle Dashboard → Catalog → Products:

1. **Premium Monthly** - €9.99/месяц (Subscription)
2. **Premium Yearly** - €59.99/год (Subscription)
3. **Duel Pass** - €4.99 (One-time)
4. **100 Coins** - €2.99 (One-time)
5. **500 Coins + Bonus** - €9.99 (One-time)
6. **1200 Coins + Bonus** - €19.99 (One-time)
7. **3000 Coins + Bonus** - €39.99 (One-time)

📖 **Инструкция:** См. `PADDLE_PRODUCTS_GUIDE.md`

**После создания:**
- Скопируйте **Price IDs** (начинаются с `pri_`)
- Обновите `PADDLE_PRICE_IDS` в `supabase/functions/paddle-payment/index.ts`

---

### 2. Создать Live API ключи и обновить секреты
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🔴 Высокий

1. Перейдите в **Paddle Dashboard → Developer tools → Authentication**
2. Создайте **Live API key** (НЕ Sandbox!)
3. Скопируйте ключ
4. Обновите секреты в **Supabase Dashboard → Edge Functions → Settings → Secrets**:
   - `PADDLE_API_KEY` - Live API key
   - `PADDLE_VENDOR_ID` - Уже есть (268857)
   - `PADDLE_SECRET_KEY` - Live Secret Key (для webhook)

⚠️ **ВАЖНО:** Используйте Live ключи, НЕ Sandbox!

---

### 3. Настроить Webhook в Paddle Dashboard
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🔴 Высокий

1. Перейдите в **Paddle Dashboard → Developer tools → Notifications**
2. Создайте новый **Notification Destination** для Live аккаунта
3. URL: `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/paddle-webhook`
4. Выберите события:
   - ✅ `transaction.completed`
   - ✅ `transaction.payment_failed`
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.cancelled`
5. Скопируйте **Signature Key** и обновите `PADDLE_SECRET_KEY` в Supabase Secrets

---

### 4. Обновить Price IDs в коде
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🔴 Высокий

После создания продуктов в Paddle:

1. Откройте `supabase/functions/paddle-payment/index.ts`
2. Найдите `PADDLE_PRICE_IDS` (строки 21-29)
3. Замените `pri_xxxxxxxxxxxxx` на реальные Price IDs из Paddle Dashboard

```typescript
const PADDLE_PRICE_IDS: Record<string, string> = {
  premium_monthly: 'pri_01HXXXXX...', // ← Заменить
  premium_yearly: 'pri_01HXXXXX...', // ← Заменить
  duel_pass_season: 'pri_01HXXXXX...', // ← Заменить
  coins_pack_100: 'pri_01HXXXXX...', // ← Заменить
  coins_pack_500: 'pri_01HXXXXX...', // ← Заменить
  coins_pack_1200: 'pri_01HXXXXX...', // ← Заменить
  coins_pack_3000: 'pri_01HXXXXX...', // ← Заменить
};
```

---

## 🟡 Важные задачи (для полной интеграции)

### 5. Создать компонент PaddlePaymentButton
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🟡 Средний

Создать компонент `src/components/monetization/PaddlePaymentButton.tsx`:

- Аналогично `StarsPaymentButton`
- Вызывает Edge Function `paddle-payment`
- Обрабатывает redirect на Paddle checkout
- Показывает loading состояние

**Пример структуры:**
```typescript
export function PaddlePaymentButton({ 
  catalogKey, 
  price, 
  onSuccess 
}: PaddlePaymentButtonProps) {
  // Вызов paddle-payment Edge Function
  // Redirect на Paddle checkout URL
}
```

---

### 6. Обновить PaywallModal для показа Paddle
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🟡 Средний

В `src/components/monetization/PaywallModal.tsx`:

1. Импортировать `PaddlePaymentButton`
2. Добавить проверку `isPaymentMethodAvailable('paddle')`
3. Показывать кнопку Paddle рядом с Telegram Stars
4. Использовать приоритет из `payment-config.ts`

---

### 7. Обновить BoostShopModal для показа Paddle
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🟡 Средний

В `src/components/shop/BoostShopModal.tsx`:

1. Импортировать `PaddlePaymentButton`
2. Добавить кнопки Paddle для покупки монет
3. Показывать Paddle как альтернативу Telegram Stars

---

## 🟢 Опциональные задачи (можно сделать позже)

### 8. Настроить настройки Checkout в Paddle
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🟢 Низкий

1. **Default payment link:** `https://skilyapp.com/purchase`
2. **Payment methods:** Card, PayPal (если доступно)
3. **Sales tax settings:** Prices exclusive of tax (для Испании)
4. **Balance currency:** EUR

---

### 9. Настроить Retain (dunning и recovery)
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🟢 Низкий

1. Перейдите в **Paddle → Retain**
2. Настройте автоматические повторные попытки платежей
3. Настройте напоминания клиентам

---

### 10. Настроить Payout settings
**Статус:** ⏳ Не выполнено  
**Приоритет:** 🟢 Низкий

1. Перейдите в **Paddle → Business account → Payouts → Payout settings**
2. Введите банковские реквизиты для выплат
3. Установите минимальный порог для выплаты
4. Выберите способ выплаты (Bank transfer, PayPal, Payoneer)

---

## ✅ Что уже сделано

- [x] Edge Functions созданы (`paddle-payment`, `paddle-webhook`)
- [x] Миграция БД для полей Paddle (`paddle_transaction_id`, `paddle_subscription_id`)
- [x] Конфигурация `payment-config.ts` с Paddle
- [x] Webhook security (signature verification, IP allowlist)
- [x] API endpoints используют `api.paddle.com` (live)
- [x] Страницы Terms, Privacy, Pricing, Refund Policy обновлены
- [x] Документация создана

---

## 📊 Прогресс

**Критические задачи:** 0/4 (0%)  
**Важные задачи:** 0/3 (0%)  
**Опциональные задачи:** 0/3 (0%)

**Общий прогресс:** 7/17 (41%)

---

## 🎯 Следующие шаги (в порядке приоритета)

1. ✅ Создать продукты в Paddle Live аккаунте
2. ✅ Создать Live API ключи и обновить секреты
3. ✅ Настроить Webhook в Paddle Dashboard
4. ✅ Обновить Price IDs в коде
5. ✅ Создать компонент PaddlePaymentButton
6. ✅ Обновить PaywallModal и BoostShopModal

После выполнения этих 6 шагов Paddle будет полностью подключен и готов к использованию! 🚀

