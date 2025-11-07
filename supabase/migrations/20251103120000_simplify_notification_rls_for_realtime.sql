-- Упрощение RLS политики для уведомлений для корректной работы realtime
-- Realtime требует простые условия

-- Удаляем существующую политику SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- Создаем функцию для получения profile_id текущего пользователя
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Создаем упрощенную политику с использованием функции
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- Включаем realtime для таблицы (только если еще не добавлена)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  END IF;
END $$;

