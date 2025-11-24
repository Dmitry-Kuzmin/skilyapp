-- Упрощение RLS политики для уведомлений для корректной работы realtime
-- Политика SELECT должна быть простой для работы realtime

-- Удаляем старую политику SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- Создаем упрощенную политику SELECT
-- Используем прямой доступ к user_id для совместимости с realtime
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

-- Проверяем, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS duel_notifications;

