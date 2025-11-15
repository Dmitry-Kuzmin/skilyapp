# ⚡ Быстрое исправление ошибки покупки

## Проблема:
Edge Function возвращает ошибку 500 при попытке создать покупку.

## Решение (3 шага):

### Шаг 1: Откройте настройки секретов

Откройте в браузере:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions
```

### Шаг 2: Добавьте недостающие секреты

Нажмите **"Add new secret"** и добавьте:

#### 1. STRIPE_SUCCESS_URL
- **Name:** `STRIPE_SUCCESS_URL`
- **Value:** `https://example.com/success`

#### 2. STRIPE_CANCEL_URL  
- **Name:** `STRIPE_CANCEL_URL`
- **Value:** `https://example.com/cancel`

**Важно:** НЕ используйте `localhost` - Stripe не может на него перенаправлять!

### Шаг 3: Подождите и попробуйте снова

1. Подождите **10-15 секунд** после добавления секретов
2. Обновите страницу приложения (F5)
3. Попробуйте снова нажать кнопку покупки

---

## Проверка:

После добавления секретов проверьте логи Edge Function:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/purchase-create/logs
```

Если видите ошибку "Missing STRIPE_SUCCESS_URL" или "Missing STRIPE_CANCEL_URL" - значит секреты еще не обновились, подождите еще немного.

---

## Если все еще не работает:

Проверьте, что ВСЕ 4 секрета присутствуют:
- ✅ `STRIPE_SECRET_KEY` (должен быть `sk_test_...`)
- ✅ `STRIPE_WEBHOOK_SECRET` (должен быть `whsec_...`)
- ✅ `STRIPE_SUCCESS_URL` (должен быть публичный URL)
- ✅ `STRIPE_CANCEL_URL` (должен быть публичный URL)

---

## Альтернатива для разработки:

Если хотите использовать реальный redirect на ваше приложение:

1. Установите ngrok: https://ngrok.com/download
2. Запустите: `ngrok http 8080`
3. Скопируйте URL (например: `https://abc123.ngrok-free.app`)
4. Используйте этот URL в секретах:
   - `STRIPE_SUCCESS_URL` = `https://abc123.ngrok-free.app/success`
   - `STRIPE_CANCEL_URL` = `https://abc123.ngrok-free.app/cancel`



