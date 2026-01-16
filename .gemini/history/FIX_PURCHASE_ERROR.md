# 🔧 Исправление ошибки покупки

## Проблема:
Edge Function `purchase-create` возвращает ошибку 500 при попытке создать покупку.

## Причина:
Скорее всего не настроены или неправильно настроены секреты:
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

## Решение:

### 1. Проверьте секреты в Supabase Dashboard

Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions

Проверьте наличие секретов:
- ✅ `STRIPE_SECRET_KEY` - должен быть `sk_test_...`
- ✅ `STRIPE_WEBHOOK_SECRET` - должен быть `whsec_...`
- ❌ `STRIPE_SUCCESS_URL` - **ПРОБЛЕМА!**
- ❌ `STRIPE_CANCEL_URL` - **ПРОБЛЕМА!**

### 2. Настройте правильные URL

**Важно:** Stripe не может использовать `localhost` в production. Нужно использовать публичный URL.

#### Вариант А: Используйте ngrok (для разработки)

1. Установите ngrok: https://ngrok.com/download
2. Запустите: `ngrok http 8080`
3. Скопируйте URL (например: `https://abc123.ngrok-free.app`)
4. Добавьте секреты:
   - `STRIPE_SUCCESS_URL` = `https://abc123.ngrok-free.app/success`
   - `STRIPE_CANCEL_URL` = `https://abc123.ngrok-free.app/cancel`

#### Вариант Б: Используйте ваш домен (для продакшена)

Если у вас есть домен:
- `STRIPE_SUCCESS_URL` = `https://yourdomain.com/success`
- `STRIPE_CANCEL_URL` = `https://yourdomain.com/cancel`

#### Вариант В: Временное решение для теста

Можно использовать любой публичный URL для теста:
- `STRIPE_SUCCESS_URL` = `https://example.com/success`
- `STRIPE_CANCEL_URL` = `https://example.com/cancel`

(После оплаты Stripe перенаправит на этот URL, но это нормально для теста)

### 3. Проверьте логи Edge Function

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/purchase-create/logs
2. Найдите последнюю ошибку
3. Проверьте, что именно вызывает проблему

### 4. Тест после настройки

После добавления секретов:
1. Перезапустите Edge Function (или подождите несколько секунд)
2. Попробуйте снова нажать кнопку покупки
3. Должно открыться окно Stripe Checkout

---

## Быстрая проверка:

Выполните в консоли браузера:

```javascript
// Проверка вызова функции
const { data, error } = await supabase.functions.invoke('purchase-create', {
  body: { 
    user_id: 'ВАШ_PROFILE_ID',
    catalog_key: 'premium_monthly'
  }
});

if (error) {
  console.error('❌ Ошибка:', error);
} else {
  console.log('✅ Успешно! URL:', data?.url);
}
```

Если видите ошибку "Stripe configuration missing" - значит секреты не настроены.



