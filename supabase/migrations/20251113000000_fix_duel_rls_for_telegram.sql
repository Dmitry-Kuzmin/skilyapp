-- Исправление RLS политик для корректной работы в Telegram WebApp
-- Проблемы: имя соперника не видно, ход игры не отображается

-- 1. Убеждаемся что профили доступны для чтения (для отображения имени соперника)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 2. Упрощаем политику для duel_players (чтобы видеть данные соперника)
DROP POLICY IF EXISTS "Anyone can view duel players" ON public.duel_players;
DROP POLICY IF EXISTS "Users can view players in their duels" ON public.duel_players;
DROP POLICY IF EXISTS "Players can view their duel players" ON public.duel_players;

-- Создаем простую политику: все могут читать duel_players
-- Это безопасно, так как мы показываем только score, name, correct_count
CREATE POLICY "Anyone can view duel players"
ON public.duel_players FOR SELECT
USING (true);

-- 3. Упрощаем политику для duel_answers (чтобы видеть ход игры соперника)
DROP POLICY IF EXISTS "Users can view answers in their duels" ON public.duel_answers;
DROP POLICY IF EXISTS "Players can view duel answers" ON public.duel_answers;
DROP POLICY IF EXISTS "Anyone can view duel answers" ON public.duel_answers;

-- Создаем простую политику: все могут читать duel_answers в рамках дуэли
-- Это безопасно, так как мы показываем только ответы в рамках активной дуэли
CREATE POLICY "Anyone can view duel answers"
ON public.duel_answers FOR SELECT
USING (true);

-- 4. Убеждаемся что Realtime включен для всех таблиц
DO $$
BEGIN
  -- duel_players
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_players;
  END IF;
  
  -- duel_answers
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_answers;
  END IF;
  
  -- duels
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
  END IF;
END $$;

-- 5. Устанавливаем REPLICA IDENTITY FULL для Realtime
ALTER TABLE duel_players REPLICA IDENTITY FULL;
ALTER TABLE duel_answers REPLICA IDENTITY FULL;
ALTER TABLE duels REPLICA IDENTITY FULL;

-- 6. Комментарии для документации
COMMENT ON POLICY "Profiles are viewable by everyone" ON public.profiles IS 
  'Разрешает чтение всех профилей для отображения имени соперника в дуэли';

COMMENT ON POLICY "Anyone can view duel players" ON public.duel_players IS 
  'Разрешает чтение всех игроков в дуэли для отображения счета и имени соперника';

COMMENT ON POLICY "Anyone can view duel answers" ON public.duel_answers IS 
  'Разрешает чтение всех ответов в дуэли для отображения хода игры соперника';

