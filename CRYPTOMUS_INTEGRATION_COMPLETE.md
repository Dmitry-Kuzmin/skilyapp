# ✅ Полная интеграция Cryptomus — Инструкция

## 📋 Текущий статус

✅ **Домен подтвержден** — Cryptomus подтвердил верификацию приложения  
✅ **Edge Functions созданы** — `cryptomus-payment` и `cryptomus-webhook`  
✅ **Миграция БД создана** — поля для Cryptomus в таблице `purchases`  
✅ **Компоненты готовы** — PaywallModal и BoostShopModal используют Cryptomus  
✅ **Страницы редиректа готовы** — `/success` и `/cancel` существуют  

---

## 🚀 Шаг 1: Применить миграцию БД

Миграция уже создана: `supabase/migrations/20250127000000_add_cryptomus_fields.sql`

### Через Supabase CLI:
```bash
supabase db push
```

### Через Supabase Dashboard:
1. Откройте **Database** → **Migrations**
2. Найдите миграцию `20250127000000_add_cryptomus_fields.sql`
3. Нажмите **Apply** или выполните SQL вручную через **SQL Editor**

Миграция добавит:
- `cryptomus_order_id` — ID заказа из Cryptomus
- `cryptomus_payment_id` — ID платежа из Cryptomus
- Индекс для быстрого поиска

---

## 🔑 Шаг 2: Настроить секреты в Supabase

В **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets** добавьте:

### Обязательные секреты:

```
CRYPTOMUS_MERCHANT_ID=ваш_merchant_id
CRYPTOMUS_PAYMENT_KEY=ваш_payment_key
CRYPTOMUS_SUCCESS_URL=https://skilyapp.com/success
CRYPTOMUS_CANCEL_URL=https://skilyapp.com/cancel
```

### Где взять:

1. **CRYPTOMUS_MERCHANT_ID:**
   - Откройте личный кабинет Cryptomus
   - Перейдите в **Настройки** → **API**
   - Скопируйте **Merchant ID**

2. **CRYPTOMUS_PAYMENT_KEY:**
   - В том же разделе **Настройки** → **API**
   - Скопируйте **Payment Key** (используется для подписи запросов)

3. **CRYPTOMUS_SUCCESS_URL:**
   - URL страницы успешной оплаты: `https://skilyapp.com/success`
   - Пользователь будет перенаправлен сюда после успешной оплаты

4. **CRYPTOMUS_CANCEL_URL:**
   - URL страницы отмены: `https://skilyapp.com/cancel`
   - Пользователь будет перенаправлен сюда при отмене оплаты

⚠️ **ВАЖНО:** Используйте реальный домен, не `localhost`!

---

## 📡 Шаг 3: Задеплоить Edge Functions

### Через Supabase CLI:

```bash
# Задеплоить функцию создания платежа
supabase functions deploy cryptomus-payment --project-ref yffjnqegeiorunyvcxkn

# Задеплоить функцию обработки webhook
supabase functions deploy cryptomus-webhook --project-ref yffjnqegeiorunyvcxkn
```

### Через Supabase Dashboard:

1. Откройте **Edge Functions**
2. Найдите функцию `cryptomus-payment`
3. Нажмите **Deploy** (или **Redeploy**)
4. Повторите для `cryptomus-webhook`

---

## 🔔 Шаг 4: Настроить Webhook в Cryptomus

1. **Откройте личный кабинет Cryptomus**
   - Перейдите в **Настройки** → **Webhooks**

2. **Создайте новый webhook:**
   - **URL**: `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/cryptomus-webhook`
   - **Метод**: POST
   - **События**: Выберите `payment.paid` (успешный платеж)
   - **Статус**: Включен

3. **Сохраните webhook**

⚠️ **ВАЖНО:** Webhook URL должен быть доступен из интернета (не localhost).

---

## ✅ Шаг 5: Проверить конфигурацию

### Проверка payment-config.ts:

Откройте `src/lib/payment-config.ts` и убедитесь:

```typescript
export const PAYMENT_CONFIG: PaymentConfig = {
  // ...
  cryptomusEnabled: true, // ✅ Должно быть true
  // ...
};
```

### Проверка компонентов:

- ✅ `PaywallModal.tsx` — использует `cryptomus-payment` для Premium
- ✅ `BoostShopModal.tsx` — использует `cryptomus-payment` для монет

---

## 🧪 Шаг 6: Тестирование

### Тестовый платеж:

1. **Откройте приложение**
2. **Попробуйте купить Premium или монеты**
3. **Выберите метод оплаты "Крипто" (Cryptomus)**
4. **Должна открыться страница оплаты Cryptomus**
5. **После оплаты вы будете перенаправлены на `/success`**
6. **Premium/монеты должны начислиться автоматически**

### Проверка логов:

```bash
# Логи создания платежа
supabase functions logs cryptomus-payment --project-ref yffjnqegeiorunyvcxkn

# Логи webhook
supabase functions logs cryptomus-webhook --project-ref yffjnqegeiorunyvcxkn
```

Или через **Supabase Dashboard** → **Edge Functions** → **Logs**

---

## 📊 Мониторинг

### В Supabase Dashboard:

1. **Edge Functions → Logs**
   - Проверяйте логи `cryptomus-payment` и `cryptomus-webhook`
   - Ищите ошибки и предупреждения

2. **Database → Table Editor → purchases**
   - Проверяйте статусы платежей
   - Ищите записи с `cryptomus_order_id`

3. **Database → Table Editor → transactions**
   - Проверяйте начисление Premium/монет

### В Cryptomus Dashboard:

1. **Платежи**
   - Просматривайте все платежи
   - Проверяйте статусы

2. **Webhooks**
   - Проверяйте доставку webhook
   - Смотрите историю запросов

---

## ⚠️ Важные замечания

### Налоги в Испании:

- Криптодоходы нужно декларировать в налоговой
- Налог на прирост капитала: 19-26% (в зависимости от суммы)
- Доход от бизнеса: до 47%
- **Рекомендуется проконсультироваться с налоговым консультантом**

### Безопасность:

- Никогда не коммитьте секреты в Git
- Используйте только секреты в Supabase Dashboard
- Регулярно проверяйте логи на подозрительную активность

### Волатильность:

- Cryptomus автоматически конвертирует в USDT (стейблкоин)
- Это снижает риск волатильности
- Но курс EUR/USD может меняться

---

## 🔧 Устранение неполадок

### Ошибка: "Missing Cryptomus configuration"

**Решение:** Проверьте, что все секреты добавлены в Supabase Dashboard → Edge Functions → Settings → Secrets

### Ошибка: "Invalid signature" в webhook

**Решение:**
- Проверьте, что `CRYPTOMUS_PAYMENT_KEY` правильный
- Убедитесь, что webhook URL правильный в Cryptomus

### Платеж создан, но не обрабатывается

**Решение:**
- Проверьте логи webhook в Supabase Dashboard
- Убедитесь, что webhook настроен в Cryptomus
- Проверьте, что URL webhook доступен из интернета

### Premium/монеты не начисляются

**Решение:**
- Проверьте логи webhook на ошибки
- Проверьте, что `additional_data` содержит правильные `user_id`, `db_type`, `db_item_id`
- Проверьте, что RPC функция `increment_profile_value` работает

---

## 📚 Дополнительные ресурсы

- [Cryptomus Documentation](https://doc.cryptomus.com/ru)
- [Cryptomus API Reference](https://doc.cryptomus.com/ru/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Финальный чеклист

- [ ] Миграция БД применена
- [ ] Секреты добавлены в Supabase Dashboard
- [ ] Edge Functions задеплоены
- [ ] Webhook настроен в Cryptomus
- [ ] Протестирован тестовый платеж
- [ ] Проверены логи и начисление Premium/монет
- [ ] Конфигурация `cryptomusEnabled: true` проверена

---

**Готово!** Теперь вы можете принимать криптоплатежи через Cryptomus. 🎉

