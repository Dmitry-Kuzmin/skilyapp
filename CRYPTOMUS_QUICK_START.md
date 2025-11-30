# 🚀 Быстрый старт: Cryptomus

## ✅ Что уже готово

Все файлы созданы и настроены:
- ✅ Конфигурация платежей обновлена
- ✅ Edge Functions созданы (`cryptomus-payment`, `cryptomus-webhook`)
- ✅ Миграция БД создана
- ✅ UI компоненты обновлены (PaywallModal, BoostShopModal)
- ✅ Документация создана

---

## 📋 Что нужно сделать ВАМ

### 1. Регистрация в Cryptomus (5-10 минут)

1. Зайдите на [cryptomus.com](https://cryptomus.com)
2. Зарегистрируйтесь и создайте аккаунт
3. Создайте мерчанта в разделе "Мерчанты"
4. **Подтвердите домен** (если требуется):
   - **Способ 1 (проще)**: Загрузите HTML файл в `public/` и задеплойте
   - **Способ 2**: Добавьте TXT запись в DNS: `cryptomus=ваш_код`
   - Подробнее: см. `CRYPTOMUS_DOMAIN_VERIFICATION.md`
5. Пройдите модерацию (отправьте запрос в "Настройки")
6. Дождитесь одобрения (обычно 1-3 дня)

### 2. Получить API ключи (2 минуты)

После модерации:
1. Откройте "Настройки" → "API"
2. Скопируйте:
   - **Merchant ID** → это будет `CRYPTOMUS_MERCHANT_ID`
   - **Payment Key** → это будет `CRYPTOMUS_PAYMENT_KEY`

### 3. Применить миграцию БД (1 минута)

```bash
supabase db push
```

Или через Supabase Dashboard:
- Database → Migrations → Apply `20250127000000_add_cryptomus_fields.sql`

### 4. Добавить секреты в Supabase (3 минуты)

Supabase Dashboard → Edge Functions → Settings → Secrets:

```
CRYPTOMUS_MERCHANT_ID=ваш_merchant_id
CRYPTOMUS_PAYMENT_KEY=ваш_payment_key
CRYPTOMUS_SUCCESS_URL=https://ваш-домен.com/payment-success
CRYPTOMUS_CANCEL_URL=https://ваш-домен.com/payment-cancel
```

⚠️ **ВАЖНО**: Замените `ваш-домен.com` на реальный домен! Не используйте `localhost`.

### 5. Задеплоить Edge Functions (2 минуты)

```bash
supabase functions deploy cryptomus-payment
supabase functions deploy cryptomus-webhook
```

Или через Supabase Dashboard:
- Edge Functions → Deploy function

### 6. Настроить Webhook в Cryptomus (3 минуты)

1. Откройте Cryptomus Dashboard → "Настройки" → "Webhooks"
2. Создайте новый webhook:
   - **URL**: `https://ваш-project-id.supabase.co/functions/v1/cryptomus-webhook`
     - Найти project ID: Supabase Dashboard → Settings → API → Project URL
   - **Метод**: POST
   - **События**: `payment.paid`

### 7. Протестировать (5 минут)

1. Откройте приложение
2. Попробуйте купить Premium или монеты
3. Должна появиться кнопка "Оплатить криптовалютой"
4. Создайте тестовый платеж
5. Проверьте начисление Premium/монет

---

## ⏱️ Общее время: ~20-30 минут

(Плюс время ожидания модерации Cryptomus: 1-3 дня)

---

## 📚 Подробная документация

Смотрите `CRYPTOMUS_SETUP.md` для детальных инструкций.

---

## ❓ Проблемы?

1. Проверьте логи в Supabase Dashboard → Edge Functions → Logs
2. Убедитесь, что все секреты добавлены правильно
3. Проверьте, что webhook URL правильный
4. Смотрите раздел "Устранение неполадок" в `CRYPTOMUS_SETUP.md`

---

**Готово!** После выполнения всех шагов Cryptomus будет работать. 🎉

