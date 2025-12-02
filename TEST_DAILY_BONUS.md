# 🧪 Тестирование Daily Bonus System
## Пошаговая проверка

---

## ✅ ПРОВЕРКА 1: База данных (2 минуты)

### В Supabase SQL Editor выполни:

```sql
-- 1. Таблицы созданы?
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_items', 'user_daily_bonus', 'user_events');
```
**Ожидаем:** 3 строки ✅

```sql
-- 2. Функции созданы?
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'claim_daily_bonus_atomic',
    'generate_mystery_box_reward',
    'buy_streak_freeze'
  );
```
**Ожидаем:** 3 строки ✅

```sql
-- 3. Views созданы?
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'admin_daily_pulse',
    'daily_bonus_metrics',
    'top_streakers'
  );
```
**Ожидаем:** 3+ строки ✅

```sql
-- 4. Triggers правильные?
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('user_daily_bonus', 'user_items')
ORDER BY trigger_name;
```
**Ожидаем:** 3 строки (daily_bonus_unified, sync_freeze_cache_on_change, sync_freeze_cache_on_delete) ✅

---

## ✅ ПРОВЕРКА 2: Analytics работают (1 минута)

```sql
-- Главный дашборд
SELECT * FROM admin_daily_pulse;
```

**Ожидаем примерно:**
```
claims_today | users_with_freeze | avg_streak | max_streak | ...
-------------|-------------------|------------|------------|
5            | 2                 | 4.2        | 12         | ...
```

Если все `0` или `NULL` - это нормально (еще нет данных после миграций)

```sql
-- Топ стрикеры
SELECT username, current_streak, tier 
FROM top_streakers 
LIMIT 5;
```

**Ожидаем:** Список пользователей с их streak

---

## ✅ ПРОВЕРКА 3: Функция claim работает (SQL тест)

```sql
-- Тестовый вызов (замени на свой user_id)
SELECT * FROM claim_daily_bonus_atomic(
  '560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4'::UUID,
  CURRENT_DATE,
  CURRENT_DATE - 1
);
```

**Если уже получал сегодня, ожидаем:**
```
success | error                  | message
--------|------------------------|------------------------
false   | already_claimed_today  | Награда уже получена...
```

**Если НЕ получал, ожидаем:**
```
success | new_streak | week_day | new_balance_xp | ...
--------|------------|----------|----------------|
true    | 5          | 5        | 240            | ...
```

---

## ✅ ПРОВЕРКА 4: Edge Function работает (3 минуты)

### Тест через Postman/Thunder Client:

```bash
POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/claim-daily-bonus

Headers:
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json

Body:
{
  "user_id": "560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4"
}
```

**Ожидаем:**
- Status: `200` или `400` (если уже получал)
- Response: `{"success": false, "error": "already_claimed_today"}`

---

## ✅ ПРОВЕРКА 5: UI работает (5 минут)

### На localhost:8080

1. **Открыть консоль браузера** (F12)

2. **Найти виджет Daily Bonus** (левая карточка внизу)

3. **Проверить визуал:**
   - ✅ Карточки дней (вместо dots)
   - ✅ Badges (Неделя 1, Осталось X дней)
   - ✅ Кнопка с правильным текстом

4. **Если можешь получить бонус:**
   - Нажать "ПОЛУЧИТЬ БОНУС"
   - Проверить что:
     - ✅ Streak увеличился
     - ✅ XP/Coins обновились
     - ✅ Анимация сработала
     - ✅ Нет ошибок в консоли

5. **Проверить консоль:**
   - Найти `[handleClaimBonus] Edge Function success:`
   - Проверить что `useNewMethod = true`

---

## ✅ ПРОВЕРКА 6: Freeze система (2 минуты)

```sql
-- Выдать себе freeze для теста
INSERT INTO user_items (user_id, item_type, quantity)
VALUES ('560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4'::UUID, 'streak_freeze', 3)
ON CONFLICT (user_id, item_type)
DO UPDATE SET quantity = 3;

-- Проверить что кеш обновился
SELECT 
  user_id, 
  current_streak, 
  freeze_available,
  last_claimed_date
FROM user_daily_bonus 
WHERE user_id = '560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4'::UUID;
```

**Ожидаем:**
```
freeze_available = 3  ✅ (триггер синхронизации сработал)
```

---

## ✅ ПРОВЕРКА 7: Mystery Box для дня 7 (SQL тест)

```sql
-- Симуляция дня 7
-- Временно установить streak = 6
UPDATE user_daily_bonus 
SET current_streak = 6,
    last_claimed_date = CURRENT_DATE - 1
WHERE user_id = '560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4'::UUID;

-- Теперь вызвать claim (будет день 7)
SELECT 
  success,
  new_streak,
  week_day,
  mystery_reward
FROM claim_daily_bonus_atomic(
  '560c5df8-b29a-45ad-b08c-4f9cbc1e7cb4'::UUID,
  CURRENT_DATE,
  CURRENT_DATE - 1
);
```

**Ожидаем:**
```
success | new_streak | week_day | mystery_reward
--------|------------|----------|------------------------------------------
true    | 7          | 7        | {"xp": 150, "coins": 100, "emoji": "💰"}
```

**✅ Mystery reward должна быть НЕ NULL для дня 7!**

---

## 📊 ПРОВЕРКА 8: Мониторинг (опционально)

### Supabase Dashboard:

1. **Functions** → `claim-daily-bonus` → Logs
   - Проверить что нет ошибок
   - Должны быть успешные вызовы

2. **Database** → Query Performance
   - CPU usage должен быть ~40-50%
   - Нет slow queries

---

## 🎯 ЧЕКЛИСТ ТЕСТОВ

- [ ] ✅ Таблицы созданы (3 шт)
- [ ] ✅ Функции созданы (3 шт)
- [ ] ✅ Views работают (6 шт)
- [ ] ✅ Triggers корректны (3 шт)
- [ ] ✅ Analytics возвращает данные
- [ ] ✅ SQL claim работает
- [ ] ✅ Edge Function отвечает
- [ ] ✅ UI работает на localhost
- [ ] ✅ Freeze синхронизируется
- [ ] ✅ Mystery Box для дня 7
- [ ] ✅ Консоль без ошибок

---

## 🐛 ТИПИЧНЫЕ ПРОБЛЕМЫ

### "already_claimed_today"
**Это нормально!** Значит уже получил бонус сегодня. Попробуй завтра.

### Edge Function timeout
```bash
# Проверить logs
supabase functions logs claim-daily-bonus

# Redeploy
supabase functions deploy claim-daily-bonus
```

### Freeze не синхронизируется
```sql
-- Проверить триггеры
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%freeze%';

-- Должно быть 2 триггера
```

---

## 🎉 ЕСЛИ ВСЁ ОК

**Миграции работают!** ✅

**Следующий шаг:**
1. Мониторить 2 часа
2. Если всё стабильно → можно коммитить
3. Настроить Telegram bot (см. `TELEGRAM_BOT_REMINDER_SETUP.md`)

---

**НАЧИНАЙ ТЕСТИРОВАТЬ!** 🚀

Выполни проверки 1-5 в Supabase SQL Editor.



