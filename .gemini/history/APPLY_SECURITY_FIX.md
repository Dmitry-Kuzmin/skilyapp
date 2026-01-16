# 🔒 Применение исправления безопасности для test_sessions

## ⚠️ Важно

Если вы уже применили миграцию `20250101000000_create_test_sessions_table.sql`, нужно применить исправление.

## 📋 Что делать

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла `supabase/migrations/20250101000002_fix_test_sessions_security.sql`
3. Вставьте в SQL Editor
4. Нажмите "Run"

### Вариант 2: Через Supabase CLI

```bash
supabase db push
```

Это применит новую миграцию `20250101000002_fix_test_sessions_security.sql`

## ✅ Что исправляется

1. **Удаляются опасные политики:**
   - `System can insert test sessions` ❌
   - `System can update test sessions` ❌

2. **Добавляется поле `finished_at`** (если еще нет)

3. **Обновляется SELECT политика:**
   - Оптимизированная версия без подзапроса
   - Использует `EXISTS` для лучшей производительности

4. **Оптимизируются индексы:**
   - Удаляются старые индексы
   - Создаются новые оптимизированные индексы

5. **Делается `mode` NOT NULL:**
   - Обновляются существующие NULL значения на 'practice'
   - Устанавливается NOT NULL constraint

## 🧪 Проверка после применения

### 1. Проверка политик

```sql
-- Должна быть только одна политика (SELECT)
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'test_sessions';
```

**Ожидаемый результат:** Только `Users can view own test sessions` с `cmd = 'SELECT'`

### 2. Проверка безопасности (клиент не может писать)

В браузерной консоли (DevTools):

```javascript
const { supabase } = await import('@/integrations/supabase/client');

// Это должно вернуть ошибку 403
const { error } = await supabase
  .from('test_sessions')
  .insert({
    session_id: 'test-hack',
    user_id: 'ваш-user-id',
    questions_count: 10,
    mode: 'practice'
  });

console.log('Error:', error);
// error.code должен быть '42501' (insufficient_privilege)
```

### 3. Проверка поля finished_at

```sql
-- Проверяем что поле существует
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'test_sessions' 
AND column_name = 'finished_at';
```

**Ожидаемый результат:** `finished_at | timestamp with time zone | YES`

### 4. Проверка индексов

```sql
-- Проверяем индексы
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'test_sessions'
ORDER BY indexname;
```

**Ожидаемые индексы:**
- `idx_test_sessions_lookup` (на `session_id`)
- `idx_test_sessions_user` (на `user_id`)
- `idx_test_sessions_cleanup` (на `status, started_at`)

## ⚠️ Важные замечания

1. **Безопасность:** После применения исправления клиенты не смогут создавать/обновлять записи напрямую. Это правильно и безопасно.

2. **Edge Functions:** Edge Functions используют Service Role Key и автоматически обходят RLS. Они продолжат работать нормально.

3. **Существующие данные:** Миграция безопасна для существующих данных. Она только:
   - Удаляет политики
   - Добавляет поле (если нет)
   - Обновляет индексы
   - Обновляет NULL значения в `mode`

## 🚨 Если что-то пошло не так

Если после применения миграции что-то сломалось, можно откатить изменения:

```sql
-- Восстановление политик (НЕ РЕКОМЕНДУЕТСЯ, только для отката)
CREATE POLICY "System can insert test sessions"
  ON test_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update test sessions"
  ON test_sessions FOR UPDATE
  USING (true);
```

**НО:** Это вернет уязвимость! Используйте только для временного отката.

## ✅ После успешного применения

После применения миграции:
1. ✅ Клиенты не смогут создавать/обновлять записи напрямую
2. ✅ Edge Functions продолжат работать нормально
3. ✅ Пользователи смогут видеть только свои сессии
4. ✅ Индексы оптимизированы для производительности

