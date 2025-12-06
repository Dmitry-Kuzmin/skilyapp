-- ============================================
-- ПРОВЕРКА БЛОКИРОВОК ОТ REALTIME
-- ============================================
-- Проверяем, блокирует ли Realtime репликация миграции

-- 1. Проверяем блокировки от Realtime процесса
SELECT 
  l.locktype,
  l.mode,
  l.granted,
  l.pid AS lock_pid,
  a.usename,
  a.application_name,
  a.state,
  LEFT(a.query, 150) AS query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE a.application_name LIKE '%realtime%'
  AND a.datname = current_database()
ORDER BY l.granted, l.pid;

-- 2. Проверяем, блокирует ли Realtime другие запросы
SELECT 
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  blocked.application_name AS blocked_app,
  LEFT(blocked.query, 100) AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.usename AS blocking_user,
  blocking.application_name AS blocking_app,
  LEFT(blocking.query, 100) AS blocking_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND blocked.datname = current_database()
  AND (blocking.application_name LIKE '%realtime%' OR blocked.application_name LIKE '%realtime%');

-- 3. Проверяем все активные Realtime соединения
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.state,
  a.query_start,
  NOW() - a.query_start AS duration,
  LEFT(a.query, 150) AS query
FROM pg_stat_activity a
WHERE a.application_name LIKE '%realtime%'
  AND a.datname = current_database()
ORDER BY a.query_start;

-- 4. Проверяем, есть ли другие долгие запросы (не Realtime)
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.state,
  NOW() - a.query_start AS duration,
  LEFT(a.query, 150) AS query
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.state != 'idle'
  AND a.pid != pg_backend_pid()
  AND a.application_name NOT LIKE '%realtime%'
  AND NOW() - a.query_start > INTERVAL '1 minute'
ORDER BY a.query_start;

-- 5. ВАЖНО: Realtime репликация обычно НЕ блокирует миграции
-- Если миграция зависла, скорее всего проблема в другом месте
-- Проверьте другие долгие запросы из запроса #4












