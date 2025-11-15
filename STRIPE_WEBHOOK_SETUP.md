# 📋 Пошаговая инструкция: Настройка Stripe Webhook

## 🎯 Цель: Настроить webhook для обработки платежей

---

## Шаг 1: Откройте раздел Webhooks

### Вариант А: Через меню
1. В **левом меню** Stripe Dashboard найдите **"Developers"** (в самом низу)
2. Нажмите на **"Developers"**
3. В подменю выберите **"Webhooks"** (НЕ "API keys")

### Вариант Б: Прямая ссылка
Просто откройте в браузере:
```
https://dashboard.stripe.com/test/webhooks
```

---

## Шаг 2: Создайте новый Webhook Endpoint

1. На странице Webhooks нажмите кнопку:
   - **"Add endpoint"** (или "Add webhook endpoint")
   - Кнопка обычно находится в правом верхнем углу или в центре страницы

2. Заполните форму:

   **Endpoint URL:**
   ```
   https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/purchase-webhook
   ```
   
   **Description (опционально):**
   ```
   Supabase Purchase Webhook
   ```

3. **Выберите события (Events to send):**
   
   Найдите раздел "Select events to listen to" или "Events to send"
   
   Выберите:
   - ✅ **`checkout.session.completed`** (обязательно!)
   
   Опционально (можно добавить позже):
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

4. Нажмите **"Add endpoint"** (внизу формы)

---

## Шаг 3: Скопируйте Signing Secret

После создания webhook:

1. Вы увидите страницу с деталями webhook
2. Найдите раздел **"Signing secret"**
3. Нажмите кнопку **"Reveal"** или **"Click to reveal"** рядом с секретом
4. Скопируйте секрет (он начинается с `whsec_...`)
   ```
   Пример: whsec_1234567890abcdef...
   ```

⚠️ **ВАЖНО:** Сохраните этот секрет! Он понадобится в следующем шаге.

---

## Шаг 4: Добавьте секрет в Supabase

1. Откройте **Supabase Dashboard**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn

2. Перейдите в раздел:
   - **Edge Functions** → **Settings** (или **Secrets**)

3. Нажмите **"Add new secret"** или **"New secret"**

4. Добавьте секрет:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** вставьте скопированный `whsec_...` секрет

5. Нажмите **"Save"** или **"Add secret"**

---

## Шаг 5: Также добавьте другие секреты Stripe

Пока вы в разделе Secrets, добавьте также:

1. **STRIPE_SECRET_KEY**
   - **Value:** `YOUR_STRIPE_SECRET_KEY_HERE` (начинается с `sk_test_...` или `sk_live_...`)
   - (Это ваш Secret key из раздела API keys)

2. **STRIPE_SUCCESS_URL**
   - **Value:** `https://yourdomain.com/success`
   - (Замените на ваш реальный домен)

3. **STRIPE_CANCEL_URL**
   - **Value:** `https://yourdomain.com/cancel`
   - (Замените на ваш реальный домен)

---

## ✅ Проверка

После настройки:

1. В Stripe Dashboard → Webhooks вы должны увидеть ваш webhook в списке
2. Статус должен быть **"Enabled"** (включен)
3. В Supabase Dashboard → Edge Functions → Settings должны быть все 4 секрета

---

## 🆘 Если что-то не работает

### Не вижу кнопку "Add endpoint"
- Убедитесь, что вы в разделе **Webhooks**, а не API keys
- Попробуйте прямую ссылку: https://dashboard.stripe.com/test/webhooks

### Не могу найти Signing secret
- После создания webhook, нажмите на название webhook в списке
- Signing secret находится на странице деталей webhook
- Иногда нужно нажать "Reveal" чтобы увидеть секрет

### Не могу найти Secrets в Supabase
- Перейдите: Edge Functions → Settings
- Или: Project Settings → Edge Functions → Secrets
- В зависимости от версии интерфейса может быть в разных местах

---

## 📞 Нужна помощь?

Если что-то не получается, опишите:
1. На какой странице вы находитесь
2. Что именно вы видите
3. Какая ошибка (если есть)



