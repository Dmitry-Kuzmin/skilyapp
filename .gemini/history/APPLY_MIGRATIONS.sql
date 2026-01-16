-- ============================================
-- ПРИМЕНИТЬ ЭТИ МИГРАЦИИ В SQL EDITOR
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new
-- ============================================

-- 1. Добавление типа 'reminder' для уведомлений
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder'));

-- 2. Исправление RLS политики для уведомлений
-- Удаляем старую политику SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- Создаем упрощенную политику SELECT
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- 3. Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS duel_notifications;

