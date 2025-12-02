# 🐛 Отладка Edge Function: claim-daily-bonus
## Почему возвращает 400

---

## 🔴 ПРОБЛЕМА

Из логов видно:
```
[Error] Failed to load resource: the server responded with a status of 400
[Warning] Edge Function error: FunctionsHttpError
[Log] Using fallback (legacy) method
[Error] Error updating daily_bonus (RLS блокирует)
```

**Что происходит:**
1. Edge Function возвращает 400 (ошибка)
2. Fallback пытается UPDATE → RLS блокирует (это правильно!)
3. Бонус не получается

**Причина 400:** Нужно проверить что именно возвращает функция

---

## 🔍 ШАГ 1: Проверить Edge Function логи

### Вариант A: Supabase Dashboard

1. Открыть https://supabase.com/dashboard
2. Выбрать проект
3. **Edge Functions** → `claim-daily-bonus` → **Logs**
4. Найти последний вызов
5. Посмотреть что вернула функция

**Ищи:**
```json
{
  "success": false,
  "error": "already_claimed_today",  // ← Возможная причина
  "message": "..."
}
```

---

### Вариант B: Прямой вызов (тест)

```bash
# В терминале
curl -X POST \
  https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/claim-daily-bonus \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "532aae3f-0282-469a-be1c-a073ef6c870b"}'
```

**Что ожидать:**

**Если уже получал сегодня:**
```json
{
  "success": false,
  "error": "already_claimed_today",
  "message": "Награда уже получена сегодня"
}
```

**Если можно получить:**
```json
{
  "success": true,
  "new_streak": 5,
  "week_day": 5,
  "new_xp": 220,
  "new_coins": 5727,
  ...
}
```

---

## 🔍 ШАГ 2: Проверить в SQL

```sql
-- Проверить текущий статус
SELECT 
  user_id,
  current_streak,
  last_claimed_date,
  freeze_available,
  total_claims
FROM user_daily_bonus
WHERE user_id = '532aae3f-0282-469a-be1c-a073ef6c870b'::UUID;
```

**Если `last_claimed_date = сегодня`:**
→ Это нормально! Функция правильно возвращает "уже получено"

**Если `last_claimed_date < сегодня` но всё равно 400:**
→ Проблема в Edge Function, нужно смотреть детальные логи

---

## 🔍 ШАГ 3: Проверить RLS Policy

```sql
-- Проверить что RLS правильно настроен
SELECT 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_daily_bonus';
```

**Ожидаем:**
```
policyname: "Only service role can update daily bonus"
cmd: UPDATE
```

Это правильно - блокирует client UPDATE ✅

---

## ⚡ БЫСТРАЯ ПРОВЕРКА

### Вручную вызовем SQL функцию:

```sql
-- Попробовать получить бонус через SQL напрямую
SELECT * FROM claim_daily_bonus_atomic(
  '532aae3f-0282-469a-be1c-a073ef6c870b'::UUID,
  CURRENT_DATE,
  CURRENT_DATE - 1
);
```

**Результаты:**

1. **Если `success = false, error = 'already_claimed_today'`:**
   - ✅ Всё работает правильно!
   - Просто уже получил бонус сегодня
   - Попробуй завтра

2. **Если `success = true`:**
   - ✅ SQL функция работает
   - ❓ Но почему Edge Function возвращает 400?
   - Проверь логи в Dashboard

3. **Если ошибка SQL:**
   - 🔴 Проблема в функции
   - Нужно смотреть детали ошибки

---

## 💡 ВЕРОЯТНЫЕ ПРИЧИНЫ 400

### Причина 1: Уже получал сегодня (нормально)
```
last_claimed_date = 2025-12-02  (сегодня)
→ Функция правильно возвращает "already_claimed_today"
→ HTTP 400 = корректная ошибка бизнес-логики
```

**Решение:** Ждать до завтра или изменить дату в тесте

---

### Причина 2: Edge Function не видит данные
```
Edge Function не может прочитать user_daily_bonus
→ Возможно проблема с RLS для SELECT
```

**Решение:**
```sql
-- Проверить SELECT policy
CREATE POLICY "Users can view their own daily bonus"
  ON user_daily_bonus FOR SELECT
  USING (can_access_daily_bonus(user_id));
```

---

### Причина 3: Параметры неправильные
```
Edge Function ожидает user_id
Клиент отправляет что-то другое
```

**Проверь в консоли:**
```
[handleClaimBonus] Called { 
  profileId: "532aae3f-0282-469a-be1c-a073ef6c870b"
}
```

---

## 🎯 ЧТО ДЕЛАТЬ СЕЙЧАС

### 1. Проверь в Supabase SQL Editor:

```sql
SELECT * FROM claim_daily_bonus_atomic(
  '532aae3f-0282-469a-be1c-a073ef6c870b'::UUID,
  CURRENT_DATE,
  CURRENT_DATE - 1
);
```

### 2. Если возвращает `already_claimed_today`:
→ **Всё работает!** Просто сегодня уже получал ✅

### 3. Если возвращает `success = true`:
→ Проблема в Edge Function, смотри логи в Dashboard

---

## 💰 ПРО СТОИМОСТЬ ЗАПРОСОВ

**Supabase Free Tier:**
- ✅ SELECT queries - **бесплатно** (unlimited)
- ✅ Database size < 500MB - **бесплатно**
- ⚠️ CPU time - **ограничен**
- ⚠️ Edge Function calls - **500k/месяц**

**Виджет админки (СТАРАЯ версия):**
```
Автообновление каждые 5 минут:
= 12 раз/час × 24 часа = 288 запросов/день
= ~8,640 запросов/месяц
```

**Виджет админки (НОВАЯ версия):**
```
Обновление только при заходе:
= ~10-20 раз/день (когда заходишь в админку)
= ~300-600 запросов/месяц
```

**Экономия: -95%** 🎉

---

**ТЫ ПРАВ:** Автообновление было избыточно!

Теперь виджет обновляется ТОЛЬКО:
- При заходе в админку
- При клике "🔄 Обновить вручную"

**Экономия:** ~8,000 запросов/месяц ✅



