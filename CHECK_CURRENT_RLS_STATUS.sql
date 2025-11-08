-- ============================================
-- ПРОВЕРКА ТЕКУЩЕГО СТАТУСА RLS
-- ============================================
-- Выполните этот запрос, чтобы увидеть текущую RLS политику
-- ============================================

-- 1. ПРОВЕРКА RLS СТАТУСА ТАБЛИЦЫ
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'duel_notifications';

-- 2. ПРОВЕРКА ВСЕХ ПОЛИТИК ДЛЯ ТАБЛИЦЫ
SELECT 
  policyname,
  permissive,
  roles,
  cmd as "Command",
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'duel_notifications'
ORDER BY policyname;

-- 3. ПРОВЕРКА REALTIME PUBLICATION
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'duel_notifications';

-- 4. ПРОВЕРКА ПРАВ ДОСТУПА (GRANTS)
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'duel_notifications'
ORDER BY grantee, privilege_type;

