-- ФИНАЛЬНАЯ МИГРАЦИЯ: Исправление RLS политик для уведомлений и профилей
-- Применяет все необходимые исправления для работы уведомлений и отображения имен

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

-- Создаем простую политику, которая работает напрямую с user_id
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Используем подзапрос для получения текущего profile_id пользователя
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

-- ============================================
-- 4. ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================

-- Проверяем, что политики созданы
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    RAISE NOTICE '✅ Profiles policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Profiles policy not found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    RAISE NOTICE '✅ Notifications policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Notifications policy not found';
  END IF;
END $$;


