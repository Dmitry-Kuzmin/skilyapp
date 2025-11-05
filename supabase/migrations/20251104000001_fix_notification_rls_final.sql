-- Финальное исправление RLS политики для уведомлений
-- Упрощаем политику для максимальной совместимости с Realtime

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функцию, если она есть (может мешать)
DROP FUNCTION IF EXISTS get_user_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id в duel_notifications
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Нужно сравнить с текущим profile_id пользователя
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
    )
  );

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;

-- Проверяем, что таблица в publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'duel_notifications';


