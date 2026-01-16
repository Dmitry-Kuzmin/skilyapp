# 💳 Настройка Cryptomus для приема криптоплатежей

## 📋 Обзор

Cryptomus — это платформа для приема криптовалютных платежей, которая:
- ✅ Не требует регистрации autónomo в Испании
- ✅ Поддерживает 15+ криптовалют (BTC, ETH, USDT и др.)
- ✅ Автоматически конвертирует в USDT (стейблкоин)
- ✅ Комиссия: ~2% за транзакцию
- ✅ Полноценный API для интеграции

---

## 🚀 Шаг 1: Регистрация в Cryptomus

1. **Зарегистрируйтесь на [cryptomus.com](https://cryptomus.com)**
   - Создайте аккаунт
   - Подтвердите email

2. **Создайте мерчанта**
   - Перейдите в раздел "Мерчанты"
   - Создайте нового мерчанта
   - Заполните информацию о бизнесе

3. **Подтвердите домен** (если требуется)
   - Cryptomus может попросить подтвердить домен для безопасности
   - **Способ 1 (РЕКОМЕНДУЕТСЯ)**: Загрузите HTML файл
     - Скачайте файл из Cryptomus (например: `cryptomus_4d822fef.html`)
     - Поместите в папку `public/` вашего проекта
     - Задеплойте проект
     - Файл должен быть доступен по адресу: `https://ваш-домен.com/cryptomus_4d822fef.html`
     - Нажмите "Проверить" в Cryptomus
   - **Способ 2**: Добавьте TXT запись в DNS
     - Добавьте TXT запись: `cryptomus=ваш_код`
     - Подождите 5-30 минут для распространения DNS
     - Нажмите "Проверить" в Cryptomus
   - Подробнее: см. `CRYPTOMUS_DOMAIN_VERIFICATION.md`

4. **Пройдите модерацию**
   - Перейдите в "Мерчант" → "Настройки"
   - Отправьте запрос на модерацию
   - Дождитесь одобрения (обычно 1-3 дня)
   - Статусы: "Модерация" → "Активный"

5. **Получите API ключи**
   - После модерации перейдите в "Настройки" → "API"
   - Скопируйте:
     - **Merchant ID** (CRYPTOMUS_MERCHANT_ID)
     - **Payment Key** (CRYPTOMUS_PAYMENT_KEY) — для подписи платежей

---

## 🔧 Шаг 2: Применить миграцию БД

Миграция уже создана: `supabase/migrations/20250127000000_add_cryptomus_fields.sql`

Примените через Supabase CLI:
```bash
supabase db push
```

Или через Supabase Dashboard:
- Database → Migrations → Apply migration

Миграция добавит поля:
- `cryptomus_order_id` — ID заказа из Cryptomus
- `cryptomus_payment_id` — ID платежа из Cryptomus

---

## 🔑 Шаг 3: Настроить секреты в Supabase

В Supabase Dashboard → Edge Functions → Settings → Secrets добавьте:

### Обязательные секреты:

```
CRYPTOMUS_MERCHANT_ID=your_merchant_id_here
CRYPTOMUS_PAYMENT_KEY=your_payment_key_here
CRYPTOMUS_SUCCESS_URL=https://yourdomain.com/payment-success
CRYPTOMUS_CANCEL_URL=https://yourdomain.com/payment-cancel
```

### Где взять:

- **CRYPTOMUS_MERCHANT_ID**: Из личного кабинета Cryptomus → Настройки → API → Merchant ID
- **CRYPTOMUS_PAYMENT_KEY**: Из личного кабинета Cryptomus → Настройки → API → Payment Key
- **CRYPTOMUS_SUCCESS_URL**: URL вашей страницы успешной оплаты (например, `https://yourdomain.com/payment-success`)
- **CRYPTOMUS_CANCEL_URL**: URL вашей страницы отмены (например, `https://yourdomain.com/payment-cancel`)

⚠️ **ВАЖНО**: Не используйте `localhost` для URL! Используйте реальный домен.

---

## 📡 Шаг 4: Задеплоить Edge Functions

Функции уже созданы:
- `supabase/functions/cryptomus-payment/index.ts` — создание платежа
- `supabase/functions/cryptomus-webhook/index.ts` — обработка webhook

Задеплойте через Supabase CLI:
```bash
supabase functions deploy cryptomus-payment
supabase functions deploy cryptomus-webhook
```

Или через Supabase Dashboard:
- Edge Functions → Deploy function

---

## 🔔 Шаг 5: Настроить Webhook в Cryptomus

1. **Откройте личный кабинет Cryptomus**
   - Перейдите в "Настройки" → "Webhooks"

2. **Создайте новый webhook:**
   - **URL**: `https://your-project-id.supabase.co/functions/v1/cryptomus-webhook`
     - Замените `your-project-id` на ваш Supabase project ID
     - Найти можно в Supabase Dashboard → Settings → API → Project URL
   - **Метод**: POST
   - **События**: Выберите `payment.paid` (успешный платеж)

3. **Сохраните webhook**

⚠️ **ВАЖНО**: Webhook URL должен быть доступен из интернета (не localhost).

---

## ✅ Шаг 6: Проверить интеграцию

1. **Проверьте конфигурацию:**
   - Откройте `src/lib/payment-config.ts`
   - Убедитесь, что `cryptomusEnabled: true`

2. **Протестируйте создание платежа:**
   - Откройте приложение
   - Попробуйте купить Premium или монеты
   - Должна появиться кнопка "Оплатить криптовалютой"

3. **Проверьте webhook:**
   - После успешной оплаты проверьте логи в Supabase Dashboard
   - Edge Functions → cryptomus-webhook → Logs
   - Должны увидеть успешную обработку платежа

---

## 🧪 Тестирование

### Тестовый платеж:

1. Создайте тестовый платеж через UI
2. Перейдите на страницу оплаты Cryptomus
3. Используйте тестовые данные (если доступны) или реальную криптовалюту
4. После оплаты проверьте:
   - Начисление Premium/монет
   - Запись в таблице `purchases` со статусом `completed`
   - Запись в таблице `transactions`

### Проверка логов:

```bash
# Логи создания платежа
supabase functions logs cryptomus-payment

# Логи webhook
supabase functions logs cryptomus-webhook
```

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

**Решение**: Проверьте, что все секреты добавлены в Supabase Dashboard → Edge Functions → Settings → Secrets

### Ошибка: "Invalid signature" в webhook

**Решение**: 
- Проверьте, что `CRYPTOMUS_PAYMENT_KEY` правильный
- Убедитесь, что webhook URL правильный в Cryptomus

### Платеж создан, но не обрабатывается

**Решение**:
- Проверьте логи webhook в Supabase Dashboard
- Убедитесь, что webhook настроен в Cryptomus
- Проверьте, что URL webhook доступен из интернета

### Premium/монеты не начисляются

**Решение**:
- Проверьте логи webhook на ошибки
- Проверьте, что `additional_data` содержит правильные `user_id`, `db_type`, `db_item_id`
- Проверьте, что RPC функция `increment_profile_value` работает

---

## 📚 Дополнительные ресурсы

- [Cryptomus Documentation](https://doc.cryptomus.com/ru)
- [Cryptomus API Reference](https://doc.cryptomus.com/ru/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Чеклист настройки

- [ ] Зарегистрирован аккаунт в Cryptomus
- [ ] Создан мерчант и пройдена модерация
- [ ] Получены API ключи (Merchant ID, Payment Key)
- [ ] Применена миграция БД
- [ ] Добавлены секреты в Supabase Dashboard
- [ ] Задеплоены Edge Functions
- [ ] Настроен webhook в Cryptomus
- [ ] Протестирован тестовый платеж
- [ ] Проверены логи и начисление Premium/монет

---

**Готово!** Теперь вы можете принимать криптоплатежи через Cryptomus. 🎉

