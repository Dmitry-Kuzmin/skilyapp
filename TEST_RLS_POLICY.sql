-- ============================================
-- ТЕСТИРОВАНИЕ RLS ПОЛИТИКИ ДЛЯ REALTIME
-- ============================================
-- Проверяем, какая политика сейчас активна
-- ============================================

-- 1. ПРОВЕРКА ТЕКУЩЕЙ ПОЛИТИКИ
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
WHERE schemaname = 'public' 
AND tablename = 'duel_notifications'
AND policyname = 'Users can view their own notifications';

-- 2. ПРОВЕРКА ФУНКЦИЙ
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname LIKE '%notification%'
ORDER BY proname;

-- 3. ПРОВЕРКА REALTIME PUBLICATION
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'duel_notifications';

-- 4. ПРОВЕРКА ТЕКУЩЕЙ RLS ПОЛИТИКИ (ДЕТАЛЬНО)
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_user_profile_id_for_notifications';

