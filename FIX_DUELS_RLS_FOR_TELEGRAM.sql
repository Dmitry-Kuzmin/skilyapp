-- ИСПРАВЛЕНИЕ: RLS политика для duels таблицы для Telegram WebApp
-- Проблема: 406 ошибки при запросах к duels таблице в Telegram WebApp
-- Решение: Упростить RLS политику используя функцию get_current_profile_id()

-- 1. Удаляем все существующие политики SELECT для duels
DROP POLICY IF EXISTS "Users can view duels they participate in" ON duels;
DROP POLICY IF EXISTS "Players can view their duels" ON duels;
DROP POLICY IF EXISTS "Anyone authenticated can view waiting duels" ON duels;

-- 2. Используем функцию get_current_profile_id() если она существует, иначе создаем упрощенную версию
DO $$
BEGIN
  -- Проверяем существует ли функция
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_current_profile_id'
  ) THEN
    -- Создаем функцию если не существует
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
  END IF;
END $$;

-- 3. Создаем упрощенную RLS политику для SELECT
CREATE POLICY "Players can view their duels"
ON duels
FOR SELECT
USING (
  -- Host can view
  host_user = get_current_profile_id()
  OR
  -- Player can view if they participate
  EXISTS (
    SELECT 1 FROM duel_players
    WHERE duel_players.duel_id = duels.id
    AND duel_players.user_id = get_current_profile_id()
  )
  OR
  -- Anyone can view waiting duels (for joining)
  status = 'waiting'
);

-- 4. Комментарий для документации
COMMENT ON POLICY "Players can view their duels" ON duels IS 
  'Упрощенная RLS политика для совместимости с Telegram WebApp. Использует STABLE функцию для стабильной работы.';

-- 5. Проверка: показываем текущие политики
SELECT 
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'duels'
  AND cmd = 'SELECT'
ORDER BY policyname;

