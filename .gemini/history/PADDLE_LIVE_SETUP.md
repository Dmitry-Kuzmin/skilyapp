# 🚀 Paddle Live Setup - Финальная настройка

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Переход на Live

Перед переходом на live убедитесь, что:

1. ✅ Все тесты в Sandbox пройдены
2. ✅ Webhook работает корректно
3. ✅ Все продукты созданы в Live аккаунте
4. ✅ Live API ключи созданы и добавлены в Secrets

---

## 🔑 Шаг 1: Создать Live API ключи

### ⚠️ НЕ используйте Sandbox ключи в продакшене!

1. **Войдите в Paddle Dashboard:**
   - [vendors.paddle.com](https://vendors.paddle.com)

2. **Создайте Live API key:**
   - Go to **Developer Tools** → **Authentication**
   - Нажмите **"Create API key"**
   - ⚠️ **ВАЖНО:** Выберите **Live** (НЕ Sandbox!)
   - Скопируйте API key (начинается с `live_`)

3. **Обновите Supabase Secrets:**
   - Замените `PADDLE_API_KEY` на Live ключ
   - Формат: `PADDLE_API_KEY=live_xxxxxxxxxxxxx`

---

## 📦 Шаг 2: Создать продукты в Live аккаунте

**⚠️ КРИТИЧЕСКИ ВАЖНО:** Создайте продукты в **Live** аккаунте, НЕ копируйте из Sandbox!

1. Переключитесь на Live аккаунт в Paddle Dashboard
2. Следуйте инструкциям из `PADDLE_PRODUCTS_GUIDE.md`
3. Создайте все 7 продуктов
4. Скопируйте **Live Price IDs** (начинаются с `pri_...`)
5. Обновите `PADDLE_PRICE_IDS` в `supabase/functions/paddle-payment/index.ts`

---

## 🔐 Шаг 3: Настроить Webhook для Live

1. **Создайте новый webhook destination:**
   - Go to **Developer Tools** → **Notifications**
   - Создайте новый destination для Live
   - URL: `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/paddle-webhook`
   - Выберите события (те же, что в Sandbox)

2. **Скопируйте Live Signature Key:**
   - После создания webhook скопируйте **Signature Key**
   - Обновите `PADDLE_SIGNATURE_KEY` в Supabase Secrets

---

## 🛡️ Шаг 4: Безопасность Webhook

### IP Allowlist

Paddle отправляет webhook с следующих IP адресов (live):
- `34.232.58.13`
- `34.195.105.136`
- `34.237.3.244`

**Статус:** ✅ Проверка IP реализована в `paddle-webhook/index.ts`

### Signature Verification

**Статус:** ✅ Верификация подписи реализована в `paddle-webhook/index.ts`

---

## ✅ Шаг 5: Проверка перед запуском

### Чеклист:

- [ ] Live API key создан и добавлен в Supabase Secrets
- [ ] Live Signature Key добавлен в Supabase Secrets
- [ ] Все продукты созданы в Live аккаунте
- [ ] Live Price IDs обновлены в `paddle-payment/index.ts`
- [ ] Webhook destination создан для Live
- [ ] Проверка IP адресов работает
- [ ] Верификация подписи работает
- [ ] Тестовый платеж в Live успешен

---

## 🧪 Шаг 6: Тестирование в Live

### Тестовые карты Paddle (Live):

**⚠️ ВАЖНО:** В Live аккаунте используйте реальные тестовые карты:

- Успешный платеж: `4242 4242 4242 4242`
- Неудачный платеж: `4000 0000 0000 0002`
- CVV: любой 3-значный код
- Дата: любая будущая дата

### Проверка:

1. Создайте тестовую транзакцию
2. Проверьте, что webhook получил событие
3. Проверьте, что подпись верифицируется
4. Проверьте, что покупка обработана в БД

---

## 📋 Финальный чеклист

См. полный чеклист в `PADDLE_GO_LIVE_CHECKLIST.md`

---

**Готово!** После выполнения всех шагов вы готовы принимать реальные платежи через Paddle. 🎉

