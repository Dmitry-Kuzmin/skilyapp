# 🔍 Проверка секретов Stripe

## Проблема:
Edge Function возвращает ошибку 500 (non-2xx status code)

## Что проверить:

### 1. Проверьте логи Edge Function

Откройте в браузере:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/purchase-create/logs
```

Найдите последнюю ошибку и посмотрите, что именно не так.

### 2. Проверьте секреты в Supabase Dashboard

Откройте:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions
```

Убедитесь, что ВСЕ 4 секрета присутствуют:

- ✅ `STRIPE_SECRET_KEY` - должен начинаться с `sk_test_...`
- ✅ `STRIPE_WEBHOOK_SECRET` - должен начинаться с `whsec_...`
- ✅ `STRIPE_SUCCESS_URL` - должен быть валидный URL (НЕ localhost!)
- ✅ `STRIPE_CANCEL_URL` - должен быть валидный URL (НЕ localhost!)

### 3. Важно про URL:

Stripe НЕ МОЖЕТ использовать `localhost` в URL для success/cancel.

**Неправильно:**
- ❌ `http://localhost:8080/success`
- ❌ `http://127.0.0.1:8080/success`

**Правильно:**
- ✅ `https://example.com/success` (любой публичный URL для теста)
- ✅ `https://yourdomain.com/success` (ваш домен)
- ✅ `https://abc123.ngrok-free.app/success` (через ngrok)

### 4. Быстрое решение для теста:

Добавьте в Supabase секреты:
- `STRIPE_SUCCESS_URL` = `https://example.com/success`
- `STRIPE_CANCEL_URL` = `https://example.com/cancel`

Это позволит создать сессию Stripe Checkout. После оплаты Stripe перенаправит на example.com, но это нормально для теста.

### 5. После добавления секретов:

1. Подождите 10-15 секунд (секреты обновляются)
2. Попробуйте снова нажать кнопку покупки
3. Проверьте логи Edge Function снова



