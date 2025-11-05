-- ============================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ: Исправление RLS политик
-- Применить в Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- ============================================
-- Разрешить чтение профилей для участников дуэли (для отображения имен)

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
-- Это необходимо для отображения имени соперника в дуэли
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Также создаем политику для чтения своего профиля (для обратной совместимости)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
  );

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================
-- Упрощенная политика для работы с Realtime (без фильтров на клиенте)

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем функцию для получения profile_id (БЕЗ подзапроса в USING)
-- Это критично для работы с Realtime - подзапросы вызывают binding mismatch
CREATE OR REPLACE FUNCTION get_user_profile_id()
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

-- Политика с использованием функции (БЕЗ подзапроса в USING)
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- ============================================
-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

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
    RAISE NOTICE '✅ Table duel_notifications is in supabase_realtime publication';
  END IF;
END $$;

