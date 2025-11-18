# 🔄 Обновление URL переадресации Stripe для нового домена

## ✅ Что уже готово

- ✅ Страница успешной оплаты: `/success` (PaymentSuccess.tsx)
- ✅ Страница отмены оплаты: `/cancel` (PaymentCancel.tsx)
- ✅ Обе страницы обрабатывают покупки и начисляют монеты
- ✅ Маршруты настроены в App.tsx

## 📋 Что нужно сделать

### 1. Обновить секреты в Supabase Edge Functions

Нужно обновить два секрета в Supabase Dashboard:

#### Шаг 1: Откройте Supabase Dashboard
1. Перейдите на https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **Edge Functions** → **Settings** → **Secrets**

#### Шаг 2: Обновите секреты

**STRIPE_SUCCESS_URL:**
```
https://skilyapp.com/success
```

**STRIPE_CANCEL_URL:**
```
https://skilyapp.com/cancel
```

#### Шаг 3: Сохраните изменения
- Нажмите **Save** или **Update** для каждого секрета
- Убедитесь, что секреты сохранены (должны появиться в списке)

### 2. Проверка работы

После обновления секретов:

1. **Тестовая покупка:**
   - Создайте тестовую покупку через Stripe (используйте тестовую карту)
   - После оплаты вы должны быть перенаправлены на `https://skilyapp.com/success?session_id=...`
   - Монеты должны начислиться автоматически

2. **Проверка отмены:**
   - Начните покупку и отмените её
   - Должны быть перенаправлены на `https://skilyapp.com/cancel`

### 3. Важные моменты

⚠️ **ВАЖНО:**
- URL должны быть **полными** (с `https://`)
- **НЕ используйте** `localhost` или `127.0.0.1` в production
- Убедитесь, что домен `skilyapp.com` доступен и настроен правильно
- После обновления секретов новые покупки будут использовать новые URL

### 4. Если используете поддомен или другой путь

Если ваше приложение находится на поддомене или в подпапке:

**Пример для поддомена:**
```
STRIPE_SUCCESS_URL: https://app.skilyapp.com/success
STRIPE_CANCEL_URL: https://app.skilyapp.com/cancel
```

**Пример для подпапки:**
```
STRIPE_SUCCESS_URL: https://skilyapp.com/app/success
STRIPE_CANCEL_URL: https://skilyapp.com/app/cancel
```

### 5. Проверка текущих настроек

Чтобы проверить текущие настройки, можно временно добавить логирование в `purchase-create`:

```typescript
console.log("[purchase-create] Success URL:", successUrl);
console.log("[purchase-create] Cancel URL:", cancelUrl);
```

Затем проверьте логи Edge Functions после создания покупки.

## 🔍 Диагностика проблем

Если переадресация не работает:

1. **Проверьте секреты:**
   - Убедитесь, что секреты сохранены в Supabase
   - Проверьте, что URL правильные (без опечаток)

2. **Проверьте логи:**
   - Supabase Dashboard → Edge Functions → Logs
   - Ищите ошибки в `purchase-create`

3. **Проверьте домен:**
   - Убедитесь, что `https://skilyapp.com` доступен
   - Проверьте SSL сертификат

4. **Проверьте маршруты:**
   - Убедитесь, что `/success` и `/cancel` доступны на сайте
   - Проверьте, что React Router настроен правильно

## 📝 Чеклист

- [ ] Обновлен `STRIPE_SUCCESS_URL` в Supabase Secrets
- [ ] Обновлен `STRIPE_CANCEL_URL` в Supabase Secrets
- [ ] Проверена доступность `https://skilyapp.com/success`
- [ ] Проверена доступность `https://skilyapp.com/cancel`
- [ ] Выполнена тестовая покупка
- [ ] Проверено начисление монет после покупки
- [ ] Проверена отмена покупки

## 🎯 Итоговые URL для вашего домена

```
STRIPE_SUCCESS_URL: https://skilyapp.com/success
STRIPE_CANCEL_URL: https://skilyapp.com/cancel
```

После обновления этих секретов все новые покупки будут перенаправляться на правильные страницы!


