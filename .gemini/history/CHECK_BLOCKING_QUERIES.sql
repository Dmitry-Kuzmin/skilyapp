-- ============================================
-- ПРОВЕРКА БЛОКИРОВОК И ЗАВИСШИХ ЗАПРОСОВ
-- ============================================
-- Этот скрипт поможет найти, что блокирует выполнение миграций
-- Выполните в Supabase SQL Editor

-- 1. Активные запросы, которые выполняются долго
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.client_addr,
  a.state,
  a.wait_event_type,
  a.wait_event,
  a.query_start,
  a.state_change,
  NOW() - a.query_start AS duration,
  LEFT(a.query, 100) AS query_preview
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.state != 'idle'
  AND a.pid != pg_backend_pid()
ORDER BY a.query_start
LIMIT 20;

-- 2. Запросы, которые блокируют другие запросы
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_application,
  blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 3. Все активные блокировки
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass,
  l.mode,
  l.granted,
  l.pid,
  a.usename,
  a.application_name,
  a.query_start,
  a.state,
  LEFT(a.query, 100) AS query_preview
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE a.datname = current_database()
ORDER BY a.query_start;

-- 4. Долгие транзакции (могут блокировать миграции)
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.xact_start,
  NOW() - a.xact_start AS transaction_duration,
  a.state,
  LEFT(a.query, 100) AS query_preview
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.xact_start IS NOT NULL
  AND NOW() - a.xact_start > INTERVAL '1 minute'
ORDER BY a.xact_start;

-- 5. Зависшие запросы (idle in transaction)
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.state,
  a.xact_start,
  NOW() - a.xact_start AS idle_duration,
  LEFT(a.query, 100) AS query_preview
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.state = 'idle in transaction'
  AND NOW() - a.xact_start > INTERVAL '1 minute'
ORDER BY a.xact_start;

-- 6. КРИТИЧНО: Если нужно убить зависший запрос
-- ВНИМАНИЕ: Используйте только если уверены!
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
-- WHERE pid = <PID> AND datname = current_database();


