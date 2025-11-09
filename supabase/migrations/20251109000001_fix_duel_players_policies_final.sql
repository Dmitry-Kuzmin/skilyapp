-- КРИТИЧНО: Создание политик для duel_players (исправленная версия)
-- Проблема: Политики могли не примениться или были удалены

-- 1. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Anyone can view duel players" ON public.duel_players;
DROP POLICY IF EXISTS "Authenticated users can join duels" ON public.duel_players;
DROP POLICY IF EXISTS "Users can update their player records" ON public.duel_players;
DROP POLICY IF EXISTS "Users can view players in their duels" ON public.duel_players;
DROP POLICY IF EXISTS "Users can join duels as players" ON public.duel_players;
DROP POLICY IF EXISTS "Users can update their player status" ON public.duel_players;

-- 2. Создаем политику для чтения (SELECT) - ВСЕ могут читать
CREATE POLICY "Anyone can view duel players"
ON public.duel_players FOR SELECT
USING (true);

-- 3. Создаем политику для вставки (INSERT) - разрешаем всем (Edge Function создает от имени системы)
CREATE POLICY "Authenticated users can join duels"
ON public.duel_players FOR INSERT
WITH CHECK (true);

-- 4. Создаем политику для обновления (UPDATE) - пользователи могут обновлять свои записи
CREATE POLICY "Users can update their player records"
ON public.duel_players FOR UPDATE
USING (
  -- Пользователь может обновлять если user_id соответствует его profile.id
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
  OR is_bot = true
)
WITH CHECK (
  -- Тот же проверка для WITH CHECK
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
  OR is_bot = true
);

-- 5. Убеждаемся что Realtime включен
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_players;
  END IF;
END $$;

-- 6. Устанавливаем REPLICA IDENTITY FULL (если еще не установлено)
ALTER TABLE duel_players REPLICA IDENTITY FULL;

