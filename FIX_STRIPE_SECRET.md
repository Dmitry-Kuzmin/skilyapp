# 🔧 Исправление проблемы с STRIPE_SECRET_KEY

## Проблема:
В логах видно: `hasStripeSecret: false` - функция не видит `STRIPE_SECRET_KEY`

## Решение:

### Шаг 1: Проверьте имя секрета

В Supabase Dashboard → Edge Functions → Secrets проверьте:

1. Найдите секрет `STRIPE_SECRET_KEY` в списке
2. Убедитесь, что имя **ТОЧНО** такое: `STRIPE_SECRET_KEY`
   - Не `stripe_secret_key`
   - Не `Stripe_Secret_Key`
   - Не `STRIPE_SECRET_KEY ` (с пробелом в конце)
   - Не ` STRIPE_SECRET_KEY` (с пробелом в начале)

### Шаг 2: Проверьте значение секрета

Нажмите на секрет `STRIPE_SECRET_KEY` и проверьте:
- Должен начинаться с `sk_test_...` (для теста) или `sk_live_...` (для продакшена)
- Не должен быть пустым
- Не должно быть пробелов в начале или конце

### Шаг 3: Пересоздайте секрет (если не помогает)

1. **Удалите** существующий `STRIPE_SECRET_KEY`:
   - Нажмите на три точки рядом с секретом
   - Выберите "Delete"
   - Подтвердите удаление

2. **Подождите 10 секунд**

3. **Добавьте заново**:
   - Нажмите "Add new secret"
   - **Name:** `STRIPE_SECRET_KEY` (точно так, без пробелов)
   - **Value:** `YOUR_STRIPE_SECRET_KEY_HERE` (начинается с `sk_test_...` или `sk_live_...`)
   - Нажмите "Save"

4. **Подождите 30-60 секунд** (секреты обновляются)

5. **Попробуйте снова** нажать кнопку покупки

### Шаг 4: Проверьте логи после обновления

После следующего вызова функции проверьте логи:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/purchase-create/logs
```

Найдите строку:
```
[purchase-create] Environment check: {
  hasStripeSecret: ...,
  allStripeKeys: [...],
  ...
}
```

Если `allStripeKeys` содержит `["STRIPE_SECRET_KEY", "STRIPE_SUCCESS_URL", "STRIPE_CANCEL_URL", "STRIPE_WEBHOOK_SECRET"]` - значит секреты доступны.

Если `allStripeKeys` пустой `[]` или не содержит `STRIPE_SECRET_KEY` - значит секрет не доступен функции.

---

## Альтернативное решение:

Если проблема не решается, попробуйте:

1. Удалить ВСЕ Stripe секреты
2. Подождать 30 секунд
3. Добавить их заново в правильном порядке:
   - Сначала `STRIPE_SECRET_KEY`
   - Потом `STRIPE_SUCCESS_URL`
   - Потом `STRIPE_CANCEL_URL`
   - Потом `STRIPE_WEBHOOK_SECRET`
4. Подождать 60 секунд
5. Попробовать снова



