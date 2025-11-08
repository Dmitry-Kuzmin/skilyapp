-- ============================================
-- ПРОВЕРКА СТАТУСА МИГРАЦИЙ
-- ============================================
-- Скопируйте этот запрос и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================

-- ============================================
-- 1. ПРОВЕРКА ФУНКЦИЙ
-- ============================================

SELECT 
  'Функции' as "Проверка",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_user_profile_id_for_notifications'
    ) THEN '✅ get_user_profile_id_for_notifications существует'
    ELSE '❌ get_user_profile_id_for_notifications НЕ найдена'
  END as "Статус"
UNION ALL
SELECT 
  'Функции',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_user_profile_id_for_duels'
    ) THEN '✅ get_user_profile_id_for_duels существует'
    ELSE '❌ get_user_profile_id_for_duels НЕ найдена'
  END
UNION ALL
SELECT 
  'Функции',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_user_profile_id_for_duel_players'
    ) THEN '✅ get_user_profile_id_for_duel_players существует'
    ELSE '❌ get_user_profile_id_for_duel_players НЕ найдена'
  END;

-- ============================================
-- 2. ПРОВЕРКА RLS ПОЛИТИК ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

SELECT 
  'RLS Политики' as "Проверка",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'duel_notifications' 
      AND policyname = 'Users can view their own notifications'
    ) THEN '✅ Политика для duel_notifications существует'
    ELSE '❌ Политика для duel_notifications НЕ найдена'
  END as "Статус"
UNION ALL
SELECT 
  'RLS Политики',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'duels' 
      AND policyname = 'Players can view their duels'
    ) THEN '✅ Политика для duels существует'
    ELSE '❌ Политика для duels НЕ найдена'
  END
UNION ALL
SELECT 
  'RLS Политики',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'duel_players' 
      AND policyname = 'Users can update their player status'
    ) THEN '✅ Политика UPDATE для duel_players существует'
    ELSE '❌ Политика UPDATE для duel_players НЕ найдена'
  END;

-- ============================================
-- 3. ПРОВЕРКА REALTIME PUBLICATION
-- ============================================

SELECT 
  'Realtime Publication' as "Проверка",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'duel_notifications'
    ) THEN '✅ duel_notifications в supabase_realtime publication'
    ELSE '❌ duel_notifications НЕ в supabase_realtime publication'
  END as "Статус";

-- ============================================
-- 4. ПРОВЕРКА ПОЛЯ last_activity_at В DUEL_PLAYERS
-- ============================================

SELECT 
  'Структура таблиц' as "Проверка",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'duel_players' 
      AND column_name = 'last_activity_at'
    ) THEN '✅ Поле last_activity_at существует в duel_players'
    ELSE '❌ Поле last_activity_at НЕ найдено в duel_players'
  END as "Статус";

-- ============================================
-- 5. ДЕТАЛЬНАЯ ПРОВЕРКА ВСЕХ ПОЛИТИК
-- ============================================

SELECT 
  'Детальная проверка' as "Проверка",
  tablename || ': ' || policyname as "Статус"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('duel_notifications', 'duels', 'duel_players')
ORDER BY tablename, policyname;

