# 🔧 Исправление ошибки 500 в cryptomus-payment

## ❌ Проблема

При попытке создать платеж через Cryptomus получаете ошибку:
```
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (cryptomus-payment)
[Error] [BoostShop] Cryptomus error: Edge Function returned a non-2xx status code
```

---

## 🔍 Шаг 1: Проверить логи в Supabase

1. Откройте **Supabase Dashboard**
2. Перейдите в **Edge Functions** → **cryptomus-payment**
3. Откройте вкладку **Logs**
4. Найдите последние ошибки (красные записи)
5. Скопируйте текст ошибки

---

## ✅ Наиболее частые причины

### Причина 1: Не добавлены секреты

**Ошибка в логах:**
```
[cryptomus-payment] Missing Cryptomus configuration
```

**Решение:**
1. Откройте **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Добавьте секреты:
   ```
   CRYPTOMUS_MERCHANT_ID=4d822fef-9ba5-4840-a770-b168291864bc
   CRYPTOMUS_PAYMENT_KEY=ваш_полный_ключ
   CRYPTOMUS_SUCCESS_URL=https://skilyapp.com/success
   CRYPTOMUS_CANCEL_URL=https://skilyapp.com/cancel
   ```
3. Сохраните и подождите 1-2 минуты
4. Попробуйте снова

---

### Причина 2: Неправильный формат ключа

**Ошибка в логах:**
```
[cryptomus-payment] Cryptomus API error: Invalid signature
```

**Решение:**
1. Убедитесь, что скопировали **полный** Payment Key (не частично скрытый)
2. Проверьте, что нет лишних пробелов в начале/конце
3. Пересоздайте ключ в Cryptomus, если нужно

---

### Причина 3: Ошибка API Cryptomus

**Ошибка в логах:**
```
[cryptomus-payment] Cryptomus API error: ...
```

**Решение:**
1. Проверьте, что Merchant ID правильный
2. Проверьте, что Payment Key правильный
3. Убедитесь, что мерчант активен в Cryptomus

---

## 📋 Что сделать сейчас

1. **Откройте логи** в Supabase Dashboard → Edge Functions → cryptomus-payment → Logs
2. **Найдите последнюю ошибку** (красная запись)
3. **Скопируйте текст ошибки** и пришлите мне

Или просто скажите, какая ошибка в логах, и я помогу исправить!

---

## 🔍 Быстрая проверка секретов

Проверьте, что все секреты добавлены:

1. **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Должны быть:
   - ✅ `CRYPTOMUS_MERCHANT_ID`
   - ✅ `CRYPTOMUS_PAYMENT_KEY`
   - ✅ `CRYPTOMUS_SUCCESS_URL`
   - ✅ `CRYPTOMUS_CANCEL_URL`

Если какого-то нет — добавьте!

---

**Пришлите логи, и я помогу исправить!** 🎉

