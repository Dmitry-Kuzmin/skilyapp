-- Исправление ошибки "mismatch between server and client bindings"
-- Проблема: фильтр в клиенте (user_id=eq.${profileId}) не совпадает с RLS политикой на сервере
-- Решение: использовать RLS политику, которая работает с прямым сравнением user_id

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем старые функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем функцию для получения profile_id текущего пользователя
-- Эта функция будет использоваться в RLS политике
CREATE OR REPLACE FUNCTION get_current_profile_id()
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

-- Создаем политику, которая использует функцию для прямого сравнения
-- Это должно работать с фильтром user_id=eq.${profileId} на клиенте
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_current_profile_id());

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;

-- Проверяем, что таблица в publication
DO $$
DECLARE
  table_in_publication boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'duel_notifications'
  ) INTO table_in_publication;
  
  IF NOT table_in_publication THEN
    RAISE EXCEPTION 'Table duel_notifications is not in supabase_realtime publication';
  ELSE
    RAISE NOTICE 'Table duel_notifications is in supabase_realtime publication';
  END IF;
END $$;

