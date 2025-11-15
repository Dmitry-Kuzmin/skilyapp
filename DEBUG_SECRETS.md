# 🔍 Отладка проблемы с секретами

## Проблема:
Секреты добавлены в Supabase Dashboard, но Edge Function все еще говорит "STRIPE_SECRET_KEY not configured"

## Возможные причины:

### 1. Секреты еще не обновились
- Подождите **30-60 секунд** после добавления секретов
- Секреты применяются не мгновенно

### 2. Неправильное имя секрета
- Проверьте, что имя секрета **ТОЧНО** совпадает: `STRIPE_SECRET_KEY`
- Регистр важен! Не `stripe_secret_key` или `Stripe_Secret_Key`
- Не должно быть пробелов в начале или конце

### 3. Секреты не применены к функции
- В Supabase секреты применяются ко ВСЕМ функциям автоматически
- Но иногда нужно перезапустить функцию

### 4. Проблема с чтением секретов
- Проверьте логи Edge Function - там должно быть видно `Environment check`

## Решение:

### Шаг 1: Проверьте логи Edge Function

Откройте:
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/purchase-create/logs
```

Найдите последний вызов функции и посмотрите на строку:
```
[purchase-create] Environment check: {
  hasStripeSecret: true/false,
  hasSuccessUrl: true/false,
  hasCancelUrl: true/false,
  ...
}
```

Это покажет, какие секреты функция видит.

### Шаг 2: Проверьте имена секретов

Убедитесь, что имена секретов **ТОЧНО** такие:
- `STRIPE_SECRET_KEY` (не `stripe_secret_key` или другое)
- `STRIPE_SUCCESS_URL` (не `stripe_success_url` или другое)
- `STRIPE_CANCEL_URL` (не `stripe_cancel_url` или другое)

### Шаг 3: Пересоздайте секреты (если не помогает)

1. Удалите существующие секреты `STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
2. Подождите 10 секунд
3. Добавьте их заново с правильными именами
4. Подождите 30-60 секунд
5. Попробуйте снова

### Шаг 4: Проверьте значение секрета

Убедитесь, что `STRIPE_SECRET_KEY` начинается с `sk_test_...` или `sk_live_...`

Если секрет не начинается с этого - значит неправильный ключ.



