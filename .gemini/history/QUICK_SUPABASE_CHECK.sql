-- ============================================
-- БЫСТРАЯ ПРОВЕРКА SUPABASE
-- ============================================
-- Быстрая диагностика основных проблем производительности
-- Выполните в Supabase SQL Editor

-- 1. Размер базы данных
SELECT 
  'Database Size' AS metric,
  pg_size_pretty(pg_database_size(current_database())) AS value;

-- 2. Активные соединения
SELECT 
  'Active Connections' AS metric,
  COUNT(*) FILTER (WHERE state = 'active')::TEXT AS value
FROM pg_stat_activity
WHERE datname = current_database();

-- 3. Проблемные соединения (idle in transaction)
SELECT 
  'Idle in Transaction' AS metric,
  COUNT(*) FILTER (WHERE state = 'idle in transaction')::TEXT AS value
FROM pg_stat_activity
WHERE datname = current_database();

-- 4. Топ-5 самых больших таблиц
SELECT 
  'Top 5 Largest Tables' AS metric,
  tablename || ' (' || pg_size_pretty(pg_total_relation_size('public.'||tablename)) || ')' AS value
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 5;

-- 5. Таблицы с большим количеством мертвых строк
SELECT 
  'Tables with Dead Tuples' AS metric,
  schemaname || '.' || relname || ' (' || n_dead_tup || ' dead)' AS value
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 5;

-- 6. Количество миграций
SELECT 
  'Total Migrations' AS metric,
  COUNT(*)::TEXT AS value
FROM supabase_migrations.schema_migrations;

-- 7. Последняя миграция
SELECT 
  'Last Migration' AS metric,
  MAX(version)::TEXT AS value
FROM supabase_migrations.schema_migrations;

-- 8. Рекомендация
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_stat_user_tables WHERE n_dead_tup > 10000) > 0 
    THEN '⚠️ Выполните VACUUM ANALYZE'
    WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction' AND datname = current_database()) > 5
    THEN '⚠️ Проверьте код на "idle in transaction"'
    WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state != 'idle' AND datname = current_database() AND NOW() - query_start > INTERVAL '5 minutes') > 0
    THEN '⚠️ Есть долгие запросы - проверьте CHECK_BLOCKING_QUERIES.sql'
    ELSE '✅ Все в порядке'
  END AS recommendation;

