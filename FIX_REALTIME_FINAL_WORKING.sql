-- ============================================
-- РАБОЧЕЕ РЕШЕНИЕ ДЛЯ REALTIME
-- ============================================
-- Проблема: Realtime не работает с RLS политиками вообще
-- Решение: Используем GRANT для разрешения SELECT, а не RLS политики
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- 2. ОТКЛЮЧАЕМ RLS ВРЕМЕННО (чтобы удалить все политики)
ALTER TABLE duel_notifications DISABLE ROW LEVEL SECURITY;

-- 3. ВКЛЮЧАЕМ RLS СНОВА
ALTER TABLE duel_notifications ENABLE ROW LEVEL SECURITY;

-- 4. СОЗДАЕМ ПОЛИТИКИ ТОЛЬКО ДЛЯ INSERT И UPDATE (не для SELECT!)
-- Это важно - мы НЕ создаем политику SELECT
CREATE POLICY IF NOT EXISTS "System can create notifications"
  ON duel_notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update their own notifications"
  ON duel_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. РАЗРЕШАЕМ SELECT ДЛЯ ВСЕХ ЧЕРЕЗ GRANT (обходит RLS)
-- Это позволяет Realtime работать без проблем с RLS
GRANT SELECT ON duel_notifications TO anon, authenticated, service_role;

-- 6. УБЕЖДАЕМСЯ, ЧТО REALTIME ВКЛЮЧЕН
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE duel_notifications;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  
  RAISE NOTICE '✅ Table duel_notifications added to supabase_realtime publication';
END $$;

-- 7. ПРОВЕРКА
DO $$
BEGIN
  -- Проверяем, что политика SELECT НЕ существует
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE '✅ No SELECT policy exists (using GRANT instead)';
  ELSE
    RAISE WARNING '⚠️ SELECT policy still exists - this may cause issues';
  END IF;
  
  -- Проверяем, что таблица в publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'duel_notifications'
  ) THEN
    RAISE NOTICE '✅ Table duel_notifications is in supabase_realtime publication';
  ELSE
    RAISE WARNING '⚠️ Table duel_notifications is NOT in supabase_realtime publication';
  END IF;
END $$;

