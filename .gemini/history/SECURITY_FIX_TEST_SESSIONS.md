# 🔒 Исправление критической ошибки безопасности в test_sessions

## ❌ Проблема

В первоначальной миграции была критическая ошибка в RLS политиках:

```sql
-- ❌ ОПАСНО: Любой авторизованный пользователь может создать запись
CREATE POLICY "System can insert test sessions"
  ON test_sessions FOR INSERT
  WITH CHECK (true);
```

**Последствия:**
- Хакер может напрямую через JS-клиент создать сессию с `started_at = "вчера"`
- Затем сразу отправить запрос на завершение, обойдя Edge Function `start-test-session`
- Вся защита от читеров обходится

## ✅ Решение

### 1. Удалены политики на INSERT/UPDATE/DELETE

**Принцип:** Если нет политики на запись, Supabase API вернет 401/403 при попытке записи с клиента. Edge Functions (Service Role) автоматически обходят RLS.

### 2. Оптимизирована политика SELECT

**Было (медленный подзапрос):**
```sql
USING (auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = test_sessions.user_id LIMIT 1));
```

**Стало (оптимизированная версия):**
```sql
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = test_sessions.user_id 
    AND profiles.user_id = auth.uid()
  )
);
```

### 3. Добавлено поле `finished_at`

Для аналитики времени прохождения теста.

### 4. Оптимизированы индексы

- `idx_test_sessions_lookup` - для быстрого поиска по `session_id`
- `idx_test_sessions_user` - для поиска по пользователю
- `idx_test_sessions_cleanup` - составной индекс для Cron-очистки (`status, started_at`)

## 📋 Изменения в файлах

### `supabase/migrations/20250101000000_create_test_sessions_table.sql`
- ✅ Удалены политики `System can insert test sessions` и `System can update test sessions`
- ✅ Оптимизирована политика SELECT
- ✅ Добавлено поле `finished_at`
- ✅ Оптимизированы индексы
- ✅ Обновлены комментарии

### `supabase/functions/complete-test-and-award/index.ts`
- ✅ Добавлено обновление `finished_at` при завершении теста

### `supabase/migrations/20250101000001_setup_test_sessions_cleanup.sql`
- ✅ Переименована задача cron: `cleanup-old-test-sessions` → `cleanup-abandoned-sessions`

## 🚀 Применение исправлений

### Если миграция еще не применена:
Просто примените обновленную миграцию `20250101000000_create_test_sessions_table.sql`

### Если миграция уже применена:
Нужно вручную исправить политики:

```sql
-- Удаляем опасные политики
DROP POLICY IF EXISTS "System can insert test sessions" ON test_sessions;
DROP POLICY IF EXISTS "System can update test sessions" ON test_sessions;

-- Добавляем поле finished_at (если еще нет)
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- Обновляем политику SELECT (оптимизированная версия)
DROP POLICY IF EXISTS "Users can view own test sessions" ON test_sessions;
CREATE POLICY "Users can view own test sessions"
  ON test_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = test_sessions.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Обновляем индексы
DROP INDEX IF EXISTS idx_test_sessions_session_id;
DROP INDEX IF EXISTS idx_test_sessions_user_id;
DROP INDEX IF EXISTS idx_test_sessions_status;
DROP INDEX IF EXISTS idx_test_sessions_started_at;

CREATE INDEX IF NOT EXISTS idx_test_sessions_lookup ON test_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_cleanup ON test_sessions(status, started_at);
```

## ✅ Проверка безопасности

После применения исправлений проверьте:

1. **Клиент не может создать сессию:**
```javascript
// Это должно вернуть 403 Forbidden
const { error } = await supabase
  .from('test_sessions')
  .insert({ session_id: 'test', user_id: '...', questions_count: 10 });
// error.code должен быть '42501' (insufficient_privilege)
```

2. **Edge Function может создать сессию:**
```typescript
// В Edge Function (Service Role) это должно работать
const { data, error } = await supabase
  .from('test_sessions')
  .insert({ ... });
// error должен быть null
```

3. **Пользователь видит только свои сессии:**
```javascript
// Должны вернуться только сессии текущего пользователя
const { data } = await supabase
  .from('test_sessions')
  .select('*');
```

## 📝 Важные замечания

1. **Service Role обходит RLS:** Edge Functions используют Service Role Key, который автоматически обходит все RLS политики. Это нормально и безопасно.

2. **Нет политики = запрет:** Если нет политики на INSERT/UPDATE/DELETE, Supabase по умолчанию запрещает эти операции для обычных пользователей.

3. **SELECT политика нужна:** Пользователи должны видеть свои сессии для истории/дебага, но не могут их создавать или изменять.

## 🎯 Итог

Теперь таблица `test_sessions` полностью защищена:
- ✅ Только Edge Functions могут создавать/обновлять записи
- ✅ Клиенты не могут обойти защиту
- ✅ Пользователи видят только свои сессии
- ✅ Оптимизированные индексы для производительности

