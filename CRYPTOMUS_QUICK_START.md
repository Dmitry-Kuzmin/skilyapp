# 🚀 Быстрый старт: Cryptomus

## ✅ Что уже готово

- ✅ Edge Functions созданы (`cryptomus-payment`, `cryptomus-webhook`)
- ✅ Миграция БД создана
- ✅ Компоненты готовы (PaywallModal, BoostShopModal)
- ✅ Страницы редиректа готовы (`/success`, `/cancel`)
- ✅ Домен подтвержден в Cryptomus

---

## 📋 Шаги для запуска

### 1. Применить миграцию БД

```bash
supabase db push
```

Или через Supabase Dashboard → Database → Migrations → Apply

---

### 2. Добавить секреты в Supabase

**Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**

Добавьте:
```
CRYPTOMUS_MERCHANT_ID=ваш_merchant_id
CRYPTOMUS_PAYMENT_KEY=ваш_payment_key
CRYPTOMUS_SUCCESS_URL=https://skilyapp.com/success
CRYPTOMUS_CANCEL_URL=https://skilyapp.com/cancel
```

**Где взять:**
- Cryptomus Dashboard → Настройки → API → Merchant ID и Payment Key

---

### 3. Задеплоить Edge Functions

```bash
supabase functions deploy cryptomus-payment --project-ref yffjnqegeiorunyvcxkn
supabase functions deploy cryptomus-webhook --project-ref yffjnqegeiorunyvcxkn
```

✅ **Уже задеплоено!** Функции готовы к работе.

---

### 4. Настроить Webhook в Cryptomus

**Cryptomus Dashboard** → **Настройки** → **Webhooks**

- **URL**: `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/cryptomus-webhook`
- **Метод**: POST
- **События**: `payment.paid`
- **Статус**: Включен

---

### 5. Проверить конфигурацию

Убедитесь, что в `src/lib/payment-config.ts`:
```typescript
cryptomusEnabled: true
```

---

## ✅ Готово!

Теперь можно принимать криптоплатежи через Cryptomus.

**Подробная инструкция:** см. `CRYPTOMUS_INTEGRATION_COMPLETE.md`
