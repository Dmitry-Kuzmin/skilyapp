# ✅ Проверка секретов Stripe

## Секреты, которые должны быть в Supabase:

### ✅ 1. STRIPE_SECRET_KEY
- **Должен начинаться с:** `sk_test_` (для теста) или `sk_live_` (для продакшена)
- **Ваше значение:** `YOUR_STRIPE_SECRET_KEY_HERE` (начинается с `sk_test_...` или `sk_live_...`)
- **Проверка:** В Supabase Dashboard → Edge Functions → Secrets должно быть значение, начинающееся с `sk_test_...` или `sk_live_...`

### ✅ 2. STRIPE_WEBHOOK_SECRET
- **Должен начинаться с:** `whsec_`
- **Ваше значение:** `YOUR_WEBHOOK_SECRET_HERE` (начинается с `whsec_...`)
- **Проверка:** В Supabase Dashboard → Edge Functions → Secrets должно быть значение, начинающееся с `whsec_...`

### ✅ 3. STRIPE_SUCCESS_URL
- **Формат:** `https://yourdomain.com/success`
- **Проверка:** Должен быть валидный URL

### ✅ 4. STRIPE_CANCEL_URL
- **Формат:** `https://yourdomain.com/cancel`
- **Проверка:** Должен быть валидный URL

---

## 🔍 Как проверить значения в Supabase:

1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/functions
2. Найдите секрет в списке
3. Нажмите на секрет, чтобы увидеть первые/последние символы
4. Сравните с ожидаемыми значениями выше

---

## ✅ Финальная проверка:

Все секреты должны быть:
- ✅ Добавлены в Supabase Edge Functions Secrets
- ✅ Иметь правильные имена (точно как указано выше)
- ✅ Иметь правильные значения (начинаются с нужных префиксов)

---

## 🚀 После проверки:

Если все секреты правильные, система монетизации готова к работе!

Можно протестировать:
1. Создание покупки через `purchase-create`
2. Обработку webhook через `purchase-webhook`
