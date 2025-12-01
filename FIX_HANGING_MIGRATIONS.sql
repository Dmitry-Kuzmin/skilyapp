-- ============================================
-- ИСПРАВЛЕНИЕ ЗАВИСШИХ МИГРАЦИЙ
-- ============================================
-- Если миграции зависли, выполните эти команды
-- ВНИМАНИЕ: Будьте осторожны, некоторые команды могут прервать активные запросы!

-- 1. Проверяем, какие запросы выполняются
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.state,
  a.wait_event_type,
  a.wait_event,
  a.query_start,
  NOW() - a.query_start AS duration,
  LEFT(a.query, 200) AS query
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.state != 'idle'
  AND a.pid != pg_backend_pid()
ORDER BY a.query_start;

-- 2. Проверяем блокировки
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 3. Если нужно прервать зависший запрос (ЗАМЕНИТЕ <PID> на реальный PID)
-- SELECT pg_cancel_backend(<PID>);  -- Мягкое прерывание
-- SELECT pg_terminate_backend(<PID>);  -- Жесткое прерывание

-- 4. Проверяем состояние миграций
SELECT 
  version,
  name,
  inserted_at,
  EXTRACT(EPOCH FROM (NOW() - inserted_at)) / 60 AS minutes_ago
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC
LIMIT 10;

-- 5. Если миграция зависла, можно попробовать:
-- - Отменить выполнение (если возможно)
-- - Проверить логи Supabase
-- - Перезапустить миграцию после очистки блокировок



