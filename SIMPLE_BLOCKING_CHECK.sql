-- ============================================
-- ПРОСТАЯ ПРОВЕРКА БЛОКИРОВОК
-- ============================================
-- Упрощенная версия для быстрой диагностики
-- Выполните в Supabase SQL Editor

-- 1. Активные долгие запросы (более 1 минуты)
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
  AND NOW() - a.query_start > INTERVAL '1 minute'
ORDER BY a.query_start;

-- 2. Зависшие транзакции (idle in transaction)
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  NOW() - a.xact_start AS idle_duration,
  LEFT(a.query, 150) AS query
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.state = 'idle in transaction'
  AND a.xact_start IS NOT NULL
  AND NOW() - a.xact_start > INTERVAL '1 minute'
ORDER BY a.xact_start;

-- 3. Блокировки (упрощенная версия)
SELECT 
  blocked.pid AS blocked_pid,
  blocking.pid AS blocking_pid,
  LEFT(blocked.query, 100) AS blocked_query,
  LEFT(blocking.query, 100) AS blocking_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND blocked.datname = current_database();

-- 4. Если нужно прервать зависший запрос (замените <PID> на реальный PID из запроса выше)
-- SELECT pg_cancel_backend(<PID>);  -- Мягкое прерывание
-- SELECT pg_terminate_backend(<PID>);  -- Жесткое прерывание



