-- ============================================
-- ПРОВЕРКА ПРИМЕНЕНИЯ МИГРАЦИЙ
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- 1. Проверка политики для profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'Profiles are viewable by everyone';

-- 2. Проверка функции get_user_profile_id
SELECT 
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_user_profile_id';

-- 3. Проверка политики для duel_notifications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'duel_notifications' 
  AND policyname = 'Users can view their own notifications';

-- 4. Проверка Realtime для duel_notifications
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'duel_notifications';

-- 5. Итоговая проверка
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'profiles' 
      AND policyname = 'Profiles are viewable by everyone'
    ) THEN '✅ Политика profiles применена'
    ELSE '❌ Политика profiles НЕ применена'
  END as profiles_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_user_profile_id'
    ) THEN '✅ Функция get_user_profile_id создана'
    ELSE '❌ Функция get_user_profile_id НЕ создана'
  END as function_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'duel_notifications' 
      AND policyname = 'Users can view their own notifications'
    ) THEN '✅ Политика duel_notifications применена'
    ELSE '❌ Политика duel_notifications НЕ применена'
  END as notifications_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'duel_notifications'
    ) THEN '✅ Realtime включен для duel_notifications'
    ELSE '❌ Realtime НЕ включен для duel_notifications'
  END as realtime_check;
