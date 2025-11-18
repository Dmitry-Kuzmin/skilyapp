# 🔍 Диагностика проблемы с начислением монет на странице успеха

## ✅ Что исправлено

1. **Улучшено логирование** - теперь все шаги обработки логируются в консоль
2. **Проверка транзакций** - если покупка completed, но транзакции нет, пытаемся обработать вручную
3. **Детальные сообщения об ошибках** - пользователь видит конкретную причину проблемы
4. **Проверка баланса** - проверяем что монеты действительно начислены

## 🔍 Как диагностировать проблему

### Шаг 1: Откройте консоль браузера

1. Откройте страницу успеха после покупки
2. Нажмите F12 (или Cmd+Option+I на Mac)
3. Перейдите на вкладку **Console**

### Шаг 2: Проверьте логи

Ищите сообщения с префиксом `[PaymentSuccess]`:

**✅ Успешная обработка:**
```
[PaymentSuccess] Page loaded: { sessionId: "...", profileId: "...", ... }
[PaymentSuccess] Processing payment for session: ...
[PaymentSuccess] Purchase found: { status: "completed", ... }
[PaymentSuccess] ✅ Transaction found, coins should be added
```

**⚠️ Проблемы:**
```
[PaymentSuccess] ⚠️ No session_id in URL
[PaymentSuccess] ⚠️ Purchase not found in database
[PaymentSuccess] ⚠️ Transaction not found, but purchase is completed
[PaymentSuccess] ❌ Error processing purchase: ...
```

### Шаг 3: Проверьте URL

URL должен содержать `session_id`:
```
https://skilyapp.com/success?session_id=cs_test_...
```

Если `session_id` отсутствует:
- Проверьте настройки `STRIPE_SUCCESS_URL` в Supabase
- Убедитесь, что используется `{CHECKOUT_SESSION_ID}` в URL

### Шаг 4: Проверьте базу данных

Выполните SQL запрос в Supabase SQL Editor:

```sql
-- Найти покупку по session_id
SELECT 
  p.*,
  pr.coins as user_coins,
  (SELECT COUNT(*) FROM transactions t 
   WHERE t.user_id = p.user_id 
   AND t.transaction_type = 'coins_purchase_stripe'
   AND t.metadata->>'session_id' = p.stripe_session_id) as transaction_count
FROM purchases p
LEFT JOIN profiles pr ON pr.id = p.user_id
WHERE p.stripe_session_id = 'SESSION_ID_HERE'  -- Замените на реальный session_id
ORDER BY p.created_at DESC;
```

### Шаг 5: Проверьте Edge Functions логи

1. Supabase Dashboard → Edge Functions → Logs
2. Найдите функцию `process-purchase`
3. Проверьте логи на наличие ошибок

## 🛠️ Возможные проблемы и решения

### Проблема 1: session_id отсутствует в URL

**Причина:** Stripe не передает session_id в success URL

**Решение:**
1. Проверьте настройки `STRIPE_SUCCESS_URL` в Supabase Secrets
2. Должно быть: `https://skilyapp.com/success?session_id={CHECKOUT_SESSION_ID}`
3. Убедитесь, что используется `{CHECKOUT_SESSION_ID}` (фигурные скобки!)

### Проблема 2: Покупка не найдена в БД

**Причина:** Покупка еще не создана или session_id не совпадает

**Решение:**
1. Проверьте что покупка создана в таблице `purchases`
2. Проверьте что `stripe_session_id` совпадает с session_id из URL
3. Подождите несколько секунд и обновите страницу

### Проблема 3: Покупка completed, но монеты не начислены

**Причина:** Webhook обработал покупку, но не начислил монеты

**Решение:**
1. Страница автоматически попытается обработать покупку вручную
2. Если это не помогло, используйте SQL скрипт из `CHECK_AND_FIX_PURCHASES.sql`
3. Проверьте логи webhook в Supabase

### Проблема 4: profileId не загружен

**Причина:** Пользователь не авторизован или данные не загружены

**Решение:**
1. Убедитесь, что пользователь авторизован
2. Обновите страницу
3. Проверьте что UserContext работает правильно

## 📋 Чеклист для проверки

- [ ] URL содержит `session_id`
- [ ] `profileId` загружен (проверьте консоль)
- [ ] Покупка найдена в БД (статус `pending` или `completed`)
- [ ] Если `completed` - проверьте наличие транзакции
- [ ] Если транзакции нет - страница попытается обработать вручную
- [ ] Проверьте логи Edge Functions на наличие ошибок

## 🔧 Ручная обработка покупки

Если автоматическая обработка не работает, используйте SQL скрипт:

1. Откройте `CHECK_AND_FIX_PURCHASES.sql`
2. Найдите блок с комментарием "Ручная обработка конкретной покупки"
3. Замените `SESSION_ID_HERE` на реальный session_id
4. Раскомментируйте блок `DO $$ ... END $$;`
5. Выполните в Supabase SQL Editor

## 📞 Если ничего не помогло

Соберите следующую информацию:

1. **Session ID** из URL
2. **Логи из консоли браузера** (все сообщения с `[PaymentSuccess]`)
3. **Логи Edge Functions** (функция `process-purchase`)
4. **Результат SQL запроса** из шага 4

Отправьте эту информацию в поддержку для дальнейшей диагностики.


