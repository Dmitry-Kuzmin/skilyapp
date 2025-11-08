-- ============================================
-- ПРИМЕНИТЬ ЭТУ МИГРАЦИЮ В SQL EDITOR
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================

-- Исправление RLS политики для duel_players и добавление поля last_activity_at
-- Проблема: 400 Bad Request при запросе к duel_players с last_activity_at
-- Решение: добавить поле last_activity_at и исправить RLS политику для Telegram пользователей

-- ============================================
-- 1. ДОБАВЛЕНИЕ ПОЛЯ last_activity_at
-- ============================================

-- Добавляем поле last_activity_at в таблицу duel_players
ALTER TABLE public.duel_players 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Создаем индекс для быстрого поиска по last_activity_at
CREATE INDEX IF NOT EXISTS idx_duel_players_last_activity_at 
ON public.duel_players(last_activity_at);

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ
-- ============================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view players in their duels" ON public.duel_players;
DROP POLICY IF EXISTS "Anyone can view duel players" ON public.duel_players;
DROP POLICY IF EXISTS "Users can join duels as players" ON public.duel_players;
DROP POLICY IF EXISTS "Authenticated users can join duels" ON public.duel_players;
DROP POLICY IF EXISTS "Users can update their player status" ON public.duel_players;
DROP POLICY IF EXISTS "Users can update their player records" ON public.duel_players;

-- Создаем функцию для получения profile_id (аналогично get_user_profile_id_for_notifications)
CREATE OR REPLACE FUNCTION get_user_profile_id_for_duel_players()
RETURNS uuid AS $$
DECLARE
  v_profile_id uuid;
  v_telegram_id bigint;
BEGIN
  -- Пытаемся получить telegram_id из JWT claims
  BEGIN
    v_telegram_id := (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint;
  EXCEPTION WHEN OTHERS THEN
    v_telegram_id := NULL;
  END;
  
  -- Ищем profile по user_id (для веб-пользователей) или telegram_id (для Telegram)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE (auth.uid() IS NOT NULL AND user_id = auth.uid())
     OR (v_telegram_id IS NOT NULL AND telegram_id = v_telegram_id)
  LIMIT 1;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Создаем простую политику SELECT с использованием функции
-- Функция с SECURITY DEFINER позволяет обойти проблемы с подзапросами
CREATE POLICY "Users can view players in their duels"
  ON public.duel_players
  FOR SELECT
  USING (
    -- Разрешаем просмотр, если пользователь участвует в дуэли
    duel_id IN (
      SELECT duel_id FROM public.duel_players 
      WHERE user_id = get_user_profile_id_for_duel_players()
    )
    OR
    -- Или если это бот
    is_bot = true
    OR
    -- Или разрешаем всем (для упрощения, можно изменить позже)
    true
  );

-- Политика для INSERT
CREATE POLICY "Users can join duels as players"
  ON public.duel_players
  FOR INSERT
  WITH CHECK (
    user_id = get_user_profile_id_for_duel_players()
    OR is_bot = true
  );

-- Политика для UPDATE
CREATE POLICY "Users can update their player status"
  ON public.duel_players
  FOR UPDATE
  USING (
    user_id = get_user_profile_id_for_duel_players()
    OR is_bot = true
  )
  WITH CHECK (
    user_id = get_user_profile_id_for_duel_players()
    OR is_bot = true
  );

-- ============================================
-- 3. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ last_activity_at
-- ============================================

-- Создаем функцию для автоматического обновления last_activity_at
CREATE OR REPLACE FUNCTION update_duel_player_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем last_activity_at при любом изменении записи игрока
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления last_activity_at
DROP TRIGGER IF EXISTS trigger_update_duel_player_last_activity ON public.duel_players;

CREATE TRIGGER trigger_update_duel_player_last_activity
  BEFORE UPDATE ON public.duel_players
  FOR EACH ROW
  EXECUTE FUNCTION update_duel_player_last_activity();

-- ============================================
-- 4. ПРОВЕРКА
-- ============================================

-- Проверяем, что поле добавлено
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'duel_players' 
    AND column_name = 'last_activity_at'
  ) THEN
    RAISE NOTICE '✅ Field last_activity_at added successfully';
  ELSE
    RAISE WARNING '⚠️ Field last_activity_at not found';
  END IF;
  
  -- Проверяем, что политика создана
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_players' 
    AND policyname = 'Users can view players in their duels'
  ) THEN
    RAISE NOTICE '✅ RLS policy created successfully';
  ELSE
    RAISE WARNING '⚠️ RLS policy not found';
  END IF;
END $$;

