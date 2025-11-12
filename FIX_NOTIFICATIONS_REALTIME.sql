-- ИСПРАВЛЕНИЕ: Realtime подписки для уведомлений
-- Проблема: "mismatch between server and client bindings" из-за сложной RLS политики
-- Решение: Упростить RLS политику для совместимости с Realtime

-- 1. Удаляем все существующие политики SELECT для duel_notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- 2. Создаем упрощенную функцию для получения profile_id
-- Эта функция будет использоваться в RLS политике
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Пробуем получить через auth.uid()
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Если не найдено, пробуем через telegram_id
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE telegram_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
      0
    )
    LIMIT 1;
  END IF;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Создаем упрощенную RLS политику с использованием функции
-- Это должно работать лучше с Realtime, так как функция стабильна (STABLE)
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_current_profile_id());

-- 4. Убеждаемся что Realtime включен для таблицы
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

-- 5. Устанавливаем REPLICA IDENTITY FULL для Realtime
ALTER TABLE duel_notifications REPLICA IDENTITY FULL;

-- 6. Комментарии для документации
COMMENT ON FUNCTION get_current_profile_id() IS 
  'Возвращает profile_id текущего пользователя для использования в RLS политиках. STABLE функция для совместимости с Realtime.';

COMMENT ON POLICY "Users can view their own notifications" ON duel_notifications IS 
  'Упрощенная RLS политика для совместимости с Realtime подписками. Использует STABLE функцию для стабильной работы.';

-- 7. Проверка: показываем текущие политики
SELECT 
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'duel_notifications'
ORDER BY cmd, policyname;

