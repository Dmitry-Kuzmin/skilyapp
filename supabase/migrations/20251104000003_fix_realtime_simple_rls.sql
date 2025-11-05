-- Финальное исправление: упрощенная RLS политика для Realtime
-- Проблема: функции в RLS политике могут не работать с Realtime фильтрами
-- Решение: использовать простую политику без функций, которая работает напрямую

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Мы сравниваем его с текущим profile_id пользователя через подзапрос
-- Это должно работать с Realtime, так как подзапрос вычисляется на сервере
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
      LIMIT 1
    )
  );

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;


