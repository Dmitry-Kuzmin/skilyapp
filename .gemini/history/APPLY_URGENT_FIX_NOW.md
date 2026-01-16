# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ - Применить НЕМЕДЛЕННО!

## ✅ Service Role Key получен!

Теперь нужно применить миграцию `URGENT_FIX.sql` для восстановления работоспособности игры.

---

## 📋 Способ 1: Через SQL Editor (РЕКОМЕНДУЕТСЯ - 2 минуты)

### Шаг 1: Откройте SQL Editor

Откройте в браузере:
```
https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
```

### Шаг 2: Скопируйте SQL

Откройте файл `URGENT_FIX.sql` и скопируйте **ВСЁ** содержимое:

```sql
-- ============================================
-- СРОЧНОЕ ИСПРАВЛЕНИЕ: Восстановление работоспособности
-- Применить НЕМЕДЛЕННО в Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. ВОССТАНОВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- ============================================

-- Удаляем все политики profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================
-- Используем ФУНКЦИЮ вместо подзапроса - это критично для Realtime!

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем старые функции
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем функцию для получения profile_id
-- Важно: функция используется в USING, а не подзапрос!
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Политика с использованием функции (БЕЗ подзапроса в USING)
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- ============================================
-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

-- Удаляем из publication, если есть
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE duel_notifications;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Добавляем в publication
  ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
END $$;
```

### Шаг 3: Вставьте и выполните

1. Вставьте SQL в редактор
2. Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)
3. Проверьте, что нет ошибок
4. Должно появиться сообщение "Success"

---

## 📋 Способ 2: Через Supabase CLI (если установлен)

Если у вас установлен Supabase CLI:

```bash
# Установите Service Role Key
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaWpjcnVjcXFubmpia2NscWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxMTU2MSwiZXhwIjoyMDc2OTg3NTYxfQ.lvySjbh9dH89sgx0LxIF0PeBPRQse27jZwuXFqVzCeM"

# Используйте db_url для подключения
supabase db push --db-url "postgres://postgres:ZfNtylh28w-b7-KlZih-Ama7H6vtJJiN@db.ijijcrucqqnnjbkclqhb.supabase.co:5432/postgres?sslmode=prefer" < URGENT_FIX.sql
```

---

## ✅ После применения миграции

1. **Удалите функцию `get-service-key`**:
   - Dashboard → Edge Functions → `get-service-key` → Delete
   - Или удалите папку: `rm -rf supabase/functions/get-service-key/`

2. **Сохраните Service Role Key** в `.env.local` (не коммитьте в Git!):
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaWpjcnVjcXFubmpia2NscWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxMTU2MSwiZXhwIjoyMDc2OTg3NTYxfQ.lvySjbh9dH89sgx0LxIF0PeBPRQse27jZwuXFqVzCeM
   ```

3. **Перезагрузите страницу** в браузере (F5)

4. **Проверьте**, что:
   - ✅ Игра запускается без ошибки 500
   - ✅ Ошибки "mismatch" исчезли
   - ✅ Имя соперника отображается
   - ✅ Уведомления работают

---

## 🔗 Прямые ссылки

- **SQL Editor**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
- **Edge Functions**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions


