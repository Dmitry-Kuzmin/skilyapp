-- ============================================================
-- КРИТИЧНО: Проверка и исправление политик для duel_players
-- ============================================================
-- ПРОБЛЕМА: RLS включен, но нет политик - данные недоступны!
-- РЕШЕНИЕ: Сначала выполните FIX_DUEL_PLAYERS_POLICIES.sql
-- ============================================================

-- 1. Проверьте последние созданные дуэли (за последние 30 минут)
SELECT 
  id, 
  code, 
  status, 
  host_user, 
  created_at, 
  expires_at,
  started_at,
  finished_at
FROM duels 
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Проверьте игроков для этих дуэлей
SELECT 
  dp.id,
  dp.duel_id,
  dp.user_id,
  dp.is_host,
  dp.score,
  dp.correct_count,
  dp.created_at,
  d.code as duel_code,
  d.status as duel_status,
  d.created_at as duel_created_at
FROM duel_players dp
JOIN duels d ON d.id = dp.duel_id
WHERE d.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY d.created_at DESC, dp.created_at DESC;

-- 3. Проверьте, есть ли дуэли без игроков
SELECT 
  d.id,
  d.code,
  d.status,
  d.created_at,
  COUNT(dp.id) as player_count
FROM duels d
LEFT JOIN duel_players dp ON dp.duel_id = d.id
WHERE d.created_at > NOW() - INTERVAL '30 minutes'
GROUP BY d.id, d.code, d.status, d.created_at
HAVING COUNT(dp.id) = 0
ORDER BY d.created_at DESC;

-- 4. Проверьте RLS политики для duel_players
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
WHERE tablename = 'duel_players';

-- 5. Проверьте, включен ли Realtime для duel_players
SELECT 
  pubname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'duel_players';

