-- ============================================
-- ДИАГНОСТИКА ПРОИЗВОДИТЕЛЬНОСТИ SUPABASE
-- ============================================
-- Этот скрипт проверяет состояние базы данных и выявляет проблемы производительности
-- Выполните в Supabase SQL Editor

-- ============================================
-- 1. ПРОВЕРКА РАЗМЕРОВ ТАБЛИЦ
-- ============================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================
-- 2. ПРОВЕРКА ИНДЕКСОВ (отсутствующие или неиспользуемые)
-- ============================================
-- Таблицы без индексов (кроме системных)
SELECT 
  t.tablename,
  COUNT(i.indexname) AS index_count
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_realtime%'
GROUP BY t.tablename
HAVING COUNT(i.indexname) = 0
ORDER BY t.tablename;

-- ============================================
-- 3. ПРОВЕРКА МЕДЛЕННЫХ ЗАПРОСОВ (если включен pg_stat_statements)
-- ============================================
-- Проверяем, включен ли pg_stat_statements
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') 
    THEN '✅ pg_stat_statements включен'
    ELSE '❌ pg_stat_statements НЕ включен (включите для мониторинга)'
  END AS status;

-- Если включен, показываем медленные запросы
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE NOTICE 'Медленные запросы (топ 10):';
  END IF;
END $$;

-- ============================================
-- 4. ПРОВЕРКА RLS ПОЛИТИК (много политик = медленнее)
-- ============================================
SELECT 
  tablename,
  COUNT(*) AS policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC;

-- ============================================
-- 5. ПРОВЕРКА БЛОКИРОВОК И АКТИВНЫХ СОЕДИНЕНИЙ
-- ============================================
SELECT 
  COUNT(*) AS total_connections,
  COUNT(*) FILTER (WHERE state = 'active') AS active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') AS idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
  COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL) AS waiting_connections
FROM pg_stat_activity
WHERE datname = current_database();

-- ============================================
-- 6. ПРОВЕРКА РАЗМЕРА БАЗЫ ДАННЫХ
-- ============================================
SELECT 
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  pg_database_size(current_database()) AS database_size_bytes;

-- ============================================
-- 7. ПРОВЕРКА ТАБЛИЦ БЕЗ АНАЛИЗА (VACUUM)
-- ============================================
SELECT 
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  n_dead_tup AS dead_tuples,
  CASE 
    WHEN n_live_tup > 0 
    THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0
  END AS dead_tuple_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;

-- ============================================
-- 8. ПРОВЕРКА МИГРАЦИЙ (supabase_migrations)
-- ============================================
SELECT 
  COUNT(*) AS total_migrations,
  MAX(version) AS latest_migration,
  MAX(inserted_at) AS last_migration_time
FROM supabase_migrations.schema_migrations;

-- Список последних 10 миграций
SELECT 
  version,
  name,
  inserted_at,
  EXTRACT(EPOCH FROM (NOW() - inserted_at)) / 60 AS minutes_ago
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC
LIMIT 10;

-- ============================================
-- 9. ПРОВЕРКА ИНДЕКСОВ С НИЗКОЙ ЭФФЕКТИВНОСТЬЮ
-- ============================================
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Индексы, которые никогда не использовались
  AND pg_relation_size(indexrelid) > 1024 * 1024  -- Больше 1MB
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- ============================================
-- 10. ПРОВЕРКА ФУНКЦИЙ И ТРИГГЕРОВ
-- ============================================
SELECT 
  COUNT(*) AS total_functions,
  COUNT(*) FILTER (WHERE prosrc LIKE '%SECURITY DEFINER%') AS security_definer_functions
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
  COUNT(*) AS total_triggers
FROM pg_trigger
WHERE tgrelid IN (
  SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
)
AND tgisinternal = false;

-- ============================================
-- 11. РЕКОМЕНДАЦИИ
-- ============================================
SELECT 
  'Рекомендации по оптимизации:' AS recommendation,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_stat_user_tables WHERE n_dead_tup > 10000) > 0 
    THEN '⚠️ Выполните VACUUM ANALYZE на таблицах с большим количеством мертвых строк'
    ELSE '✅ Мертвых строк немного'
  END AS vacuum_recommendation,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND pg_relation_size(indexrelid) > 1024 * 1024) > 5
    THEN '⚠️ Есть неиспользуемые индексы - рассмотрите возможность их удаления'
    ELSE '✅ Индексы используются эффективно'
  END AS index_recommendation,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction') > 5
    THEN '⚠️ Есть соединения в состоянии "idle in transaction" - проверьте код приложения'
    ELSE '✅ Нет проблемных соединений'
  END AS connection_recommendation;













