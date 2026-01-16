-- ============================================
-- ИСПРАВЛЕНИЕ БЛОКИРОВКИ МИГРАЦИЙ
-- ============================================
-- Если миграция зависла, выполните эти шаги

-- ШАГ 1: Проверяем, что именно блокирует миграцию
-- Выполните этот запрос, чтобы найти блокирующие запросы
SELECT 
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  blocked.application_name AS blocked_app,
  LEFT(blocked.query, 100) AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.usename AS blocking_user,
  blocking.application_name AS blocking_app,
  LEFT(blocking.query, 100) AS blocking_query,
  blocking.state AS blocking_state,
  NOW() - blocking.query_start AS blocking_duration
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND blocked.datname = current_database()
ORDER BY blocking.query_start;

-- ШАГ 2: Если нашли блокирующий запрос (НЕ Realtime), можно его прервать
-- ВНИМАНИЕ: НЕ прерывайте Realtime репликацию! Это системный процесс.
-- Замените <BLOCKING_PID> на PID из результата выше (только если это НЕ realtime)
-- SELECT pg_cancel_backend(<BLOCKING_PID>);  -- Мягкое прерывание
-- SELECT pg_terminate_backend(<BLOCKING_PID>);  -- Жесткое прерывание

-- ШАГ 3: Проверяем долгие транзакции (могут блокировать миграции)
SELECT 
  a.pid,
  a.usename,
  a.application_name,
  a.state,
  a.xact_start,
  NOW() - a.xact_start AS transaction_duration,
  LEFT(a.query, 150) AS query
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.xact_start IS NOT NULL
  AND NOW() - a.xact_start > INTERVAL '5 minutes'
  AND a.application_name NOT LIKE '%realtime%'
ORDER BY a.xact_start;

-- ШАГ 4: Если миграция все еще зависла после проверки блокировок:
-- 1. Отмените выполнение миграции в SQL Editor (кнопка Stop)
-- 2. Проверьте логи Supabase Dashboard → Logs
-- 3. Попробуйте выполнить миграцию снова
-- 4. Если проблема повторяется, возможно, миграция слишком тяжелая
--    - Разбейте миграцию на несколько частей
--    - Выполняйте миграцию в нерабочее время
--    - Используйте CONCURRENTLY для создания индексов

-- ШАГ 5: Проверяем состояние миграций
-- Сначала проверьте структуру таблицы с помощью CHECK_MIGRATIONS_TABLE.sql
-- Затем используйте правильное название колонки времени
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;

