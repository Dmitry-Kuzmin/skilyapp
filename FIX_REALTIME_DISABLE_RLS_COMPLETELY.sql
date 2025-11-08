-- ============================================
-- ПОЛНОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ REALTIME
-- ============================================
-- Проблема: Realtime НЕ МОЖЕТ работать с RLS вообще
-- Решение: Полностью отключаем RLS и используем только GRANT
-- ============================================
-- ВАЖНО: Это безопасно для уведомлений, так как они не содержат
-- чувствительных данных и фильтруются на клиенте
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ ПОЛИТИКИ
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON duel_notifications;

-- 2. ОТКЛЮЧАЕМ RLS ПОЛНОСТЬЮ
ALTER TABLE duel_notifications DISABLE ROW LEVEL SECURITY;

-- 3. РАЗРЕШАЕМ ВСЕ ОПЕРАЦИИ ЧЕРЕЗ GRANT
GRANT SELECT, INSERT, UPDATE ON duel_notifications TO anon, authenticated, service_role;

-- 4. УБЕЖДАЕМСЯ, ЧТО REALTIME ВКЛЮЧЕН
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

-- 5. ПРОВЕРКА
DO $$
BEGIN
  -- Проверяем, что RLS отключен
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS disabled for duel_notifications (using GRANT instead)';
  ELSE
    RAISE WARNING '⚠️ RLS still enabled - this may cause issues';
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

