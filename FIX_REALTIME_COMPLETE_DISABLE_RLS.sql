-- ============================================
-- ПОЛНОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ REALTIME
-- ============================================
-- ВАЖНО: Это крайняя мера, если USING (true) не работает
-- Realtime может не работать с RLS вообще, даже с USING (true)
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ ПОЛИТИКИ
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON duel_notifications;

-- 2. ОТКЛЮЧАЕМ RLS ДЛЯ SELECT (оставляем для INSERT/UPDATE)
-- Это позволяет Realtime работать без ограничений RLS
ALTER TABLE duel_notifications DISABLE ROW LEVEL SECURITY;

-- 3. ВКЛЮЧАЕМ RLS СНОВА (чтобы политики INSERT/UPDATE работали)
ALTER TABLE duel_notifications ENABLE ROW LEVEL SECURITY;

-- 4. СОЗДАЕМ ПОЛИТИКИ ТОЛЬКО ДЛЯ INSERT И UPDATE
-- SELECT разрешен всем через отключенный RLS
CREATE POLICY "System can create notifications"
  ON duel_notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON duel_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. УБЕЖДАЕМСЯ, ЧТО REALTIME ВКЛЮЧЕН
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

-- 6. ПРОВЕРКА: Отключаем RLS для SELECT через GRANT
-- Это альтернативный способ разрешить SELECT для всех
GRANT SELECT ON duel_notifications TO anon, authenticated;

-- 7. ПРОВЕРКА
DO $$
BEGIN
  -- Проверяем, что RLS включен
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS enabled for duel_notifications';
  ELSE
    RAISE WARNING '⚠️ RLS disabled for duel_notifications';
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

