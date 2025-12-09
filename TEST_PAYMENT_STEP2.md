# 🧪 Шаг 2: Тестирование Telegram Stars Payment

## Быстрый тест создания invoice

### 1. Получи данные пользователя

```sql
-- Найди свой user_id и telegram_user_id
SELECT 
  p.id as user_id,
  p.telegram_id as telegram_user_id,
  p.coins as current_coins
FROM profiles p
WHERE p.telegram_id IS NOT NULL
LIMIT 1;
```

### 2. Создай invoice через curl

```bash
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-stars-payment \
  -H "Authorization: Bearer 75746143e9b093afa35dcbed5d243cfcf68b0e8f7735567588cd3326d76311ed" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_invoice",
    "user_id": "ТВОЙ_USER_ID",
    "package_key": "premium_monthly",
    "telegram_user_id": ТВОЙ_TELEGRAM_ID
  }'
```

**Замени:**
- `ТВОЙ_USER_ID` - UUID из шага 1
- `ТВОЙ_TELEGRAM_ID` - число из шага 1

### 3. Ожидаемый результат

```json
{
  "success": true,
  "invoice_link": "https://t.me/invoice/...",
  "payment_id": "...",
  "stars_amount": 3966
}
```

### 4. Проверь запись в БД

```sql
-- Проверь, что запись создана
SELECT 
  id,
  user_id,
  stars_amount,
  coins_equivalent,
  status,
  rewards_status,
  created_at
FROM stars_payments
WHERE user_id = 'ТВОЙ_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Ожидаемый результат:**
- ✅ `status = 'pending'`
- ✅ `rewards_status = 'pending'`
- ✅ `stars_amount` заполнено (например, 3966 для premium_monthly)

---

## ⚠️ Важно

- **НЕ оплачивай** invoice в тестовом режиме (если не хочешь потратить реальные Stars)
- Для полного теста нужно оплатить и проверить webhook
- Или используй тестовый пакет с `price_stars = 1` (минимум)

---

**Готово!** После проверки переходи к следующему шагу.

