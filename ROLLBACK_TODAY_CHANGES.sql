-- ============================================
-- ОТКАТ ВСЕХ ИЗМЕНЕНИЙ ЗА СЕГОДНЯ
-- ============================================
-- Этот скрипт откатывает все изменения RLS политик и функций,
-- которые были сделаны сегодня для исправления Realtime
-- ============================================
-- ВАЖНО: Это вернет RLS политики к исходному состоянию
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ СЕГОДНЯШНИЕ ПОЛИТИКИ
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON duel_notifications;

-- 2. УДАЛЯЕМ ВСЕ СЕГОДНЯШНИЕ ФУНКЦИИ
DROP FUNCTION IF EXISTS get_user_profile_id_for_notifications() CASCADE;
DROP FUNCTION IF EXISTS get_user_profile_id_for_duels() CASCADE;
DROP FUNCTION IF EXISTS get_user_profile_id_for_duel_players() CASCADE;

-- 3. УДАЛЯЕМ ПОЛИТИКИ ДЛЯ DUELS
DROP POLICY IF EXISTS "Players can view their duels" ON duels;
DROP POLICY IF EXISTS "Users can view duels they participate in" ON duels;
DROP POLICY IF EXISTS "Anyone authenticated can view waiting duels" ON duels;

-- 4. УДАЛЯЕМ ПОЛИТИКИ ДЛЯ DUEL_PLAYERS
DROP POLICY IF EXISTS "Users can update their player status" ON duel_players;
DROP POLICY IF EXISTS "Users can update their player records" ON duel_players;

-- 5. ВОССТАНАВЛИВАЕМ ИСХОДНУЮ RLS ПОЛИТИКУ ДЛЯ УВЕДОМЛЕНИЙ
-- (из оригинальной миграции 20251102132724)
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- 6. ВОССТАНАВЛИВАЕМ ПОЛИТИКУ ДЛЯ INSERT
CREATE POLICY "System can create notifications"
  ON duel_notifications
  FOR INSERT
  WITH CHECK (true);

-- 7. ВОССТАНАВЛИВАЕМ ПОЛИТИКУ ДЛЯ UPDATE
CREATE POLICY "Users can update their own notifications"
  ON duel_notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- 8. ОТКАТ ИЗМЕНЕНИЙ ДЛЯ DUEL_PLAYERS (удаляем поле last_activity_at, если оно было добавлено сегодня)
-- ВАЖНО: Не удаляем, если оно было в оригинальной схеме
-- ALTER TABLE duel_players DROP COLUMN IF EXISTS last_activity_at;

-- 9. УБЕЖДАЕМСЯ, ЧТО REALTIME ВКЛЮЧЕН (это должно было быть изначально)
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

-- 10. ПРОВЕРКА
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    RAISE NOTICE '✅ Original RLS policy restored';
  ELSE
    RAISE WARNING '⚠️ RLS policy not found';
  END IF;
END $$;

