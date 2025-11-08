-- ============================================
-- ПРОВЕРКА СТАТУСА МИГРАЦИИ (ВЫПОЛНИТЕ В SQL EDITOR)
-- ============================================
-- Скопируйте этот запрос и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================

-- 1. ПРОВЕРКА ФУНКЦИЙ
SELECT 
  'Функции' as "Проверка",
  proname as "Имя функции",
  CASE 
    WHEN proname IN ('get_user_profile_id_for_notifications', 'get_user_profile_id_for_duels', 'get_user_profile_id_for_duel_players')
    THEN '✅ Найдена'
    ELSE '❌ Не найдена'
  END as "Статус"
FROM pg_proc 
WHERE proname IN ('get_user_profile_id_for_notifications', 'get_user_profile_id_for_duels', 'get_user_profile_id_for_duel_players')
ORDER BY proname;

-- 2. ПРОВЕРКА RLS ПОЛИТИК
SELECT 
  'RLS Политики' as "Проверка",
  tablename || '.' || policyname as "Политика",
  '✅ Найдена' as "Статус"
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
  (tablename = 'duel_notifications' AND policyname = 'Users can view their own notifications')
  OR (tablename = 'duels' AND policyname = 'Players can view their duels')
  OR (tablename = 'duel_players' AND policyname = 'Users can update their player status')
)
ORDER BY tablename, policyname;

-- 3. ПРОВЕРКА REALTIME PUBLICATION
SELECT 
  'Realtime Publication' as "Проверка",
  tablename as "Таблица",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'duel_notifications'
    ) THEN '✅ В publication'
    ELSE '❌ НЕ в publication'
  END as "Статус"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'duel_notifications';

-- 4. ПРОВЕРКА ПОЛЯ last_activity_at
SELECT 
  'Структура таблиц' as "Проверка",
  column_name as "Поле",
  CASE 
    WHEN column_name = 'last_activity_at' THEN '✅ Найдено'
    ELSE '❌ Не найдено'
  END as "Статус"
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'duel_players' 
AND column_name = 'last_activity_at';

-- 5. ИТОГОВАЯ ПРОВЕРКА (все вместе)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_profile_id_for_notifications')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_profile_id_for_duels')
      AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'duel_notifications' AND policyname = 'Users can view their own notifications')
      AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'duels' AND policyname = 'Players can view their duels')
      AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'duel_players' AND policyname = 'Users can update their player status')
      AND EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'duel_notifications')
    THEN '✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ - миграция применена успешно!'
    ELSE '❌ НЕКОТОРЫЕ ПРОВЕРКИ НЕ ПРОЙДЕНЫ - миграция применена частично или не применена'
  END as "ИТОГОВЫЙ СТАТУС";

