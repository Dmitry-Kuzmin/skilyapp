-- ============================================
-- ПРОВЕРКА ТЕКУЩЕГО СТАТУСА RLS
-- ============================================
-- Выполните этот запрос, чтобы увидеть, какие политики сейчас активны
-- ============================================

-- 1. ПРОВЕРКА RLS СТАТУСА
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'duel_notifications';

-- 2. ВСЕ ПОЛИТИКИ ДЛЯ DUEL_NOTIFICATIONS
SELECT 
  policyname,
  cmd as "Command",
  qual as "USING clause"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'duel_notifications'
ORDER BY cmd, policyname;

-- 3. ПРАВА ДОСТУПА (GRANTS)
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'duel_notifications'
ORDER BY grantee, privilege_type;

-- 4. REALTIME PUBLICATION
SELECT 
  pubname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'duel_notifications';

