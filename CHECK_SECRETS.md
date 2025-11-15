# 🔍 Проверка секретов Stripe

## Проблема:
В логах видна ошибка: `[purchase-create] Missing STRIPE_SECRET_KEY`

## Решение:

### 1. Откройте настройки секретов

Откройте в браузере:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions
```

### 2. Проверьте наличие ВСЕХ секретов

Убедитесь, что в списке есть ВСЕ 4 секрета:

- ✅ `STRIPE_SECRET_KEY` - должен начинаться с `sk_test_...`
- ✅ `STRIPE_WEBHOOK_SECRET` - должен начинаться с `whsec_...`
- ✅ `STRIPE_SUCCESS_URL` - должен быть публичный URL (НЕ localhost!)
- ✅ `STRIPE_CANCEL_URL` - должен быть публичный URL (НЕ localhost!)

### 3. Если секрета нет - добавьте его

Нажмите **"Add new secret"** и добавьте:

**STRIPE_SECRET_KEY:**
- Name: `STRIPE_SECRET_KEY`
- Value: `YOUR_STRIPE_SECRET_KEY_HERE` (начинается с `sk_test_...` или `sk_live_...`)
- (Это ваш Secret key из Stripe Dashboard → Developers → API keys)

**STRIPE_SUCCESS_URL:**
- Name: `STRIPE_SUCCESS_URL`
- Value: `https://example.com/success`

**STRIPE_CANCEL_URL:**
- Name: `STRIPE_CANCEL_URL`
- Value: `https://example.com/cancel`

### 4. Важно:

- **НЕ используйте `localhost`** в URL - Stripe не может на него перенаправлять
- После добавления секретов подождите **10-15 секунд** для обновления
- Секреты применяются ко ВСЕМ Edge Functions автоматически

### 5. Проверка после добавления

1. Подождите 10-15 секунд
2. Обновите страницу приложения (F5)
3. Попробуйте снова нажать кнопку покупки
4. Проверьте логи Edge Function снова:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/purchase-create/logs
   ```

### 6. Если все еще не работает

Проверьте логи - теперь там будет видно, какие именно секреты отсутствуют:
- `hasStripeSecret: false` - значит STRIPE_SECRET_KEY не найден
- `hasSuccessUrl: false` - значит STRIPE_SUCCESS_URL не найден
- `hasCancelUrl: false` - значит STRIPE_CANCEL_URL не найден



