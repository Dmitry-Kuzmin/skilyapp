-- ============================================
-- ОПТИМИЗАЦИЯ SUPABASE
-- ============================================
-- Этот скрипт выполняет базовые оптимизации для улучшения производительности
-- ВНИМАНИЕ: Выполняйте осторожно, некоторые операции могут занять время
--
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR!

-- ============================================
-- 1. VACUUM ANALYZE (очистка и обновление статистики)
-- ============================================
-- Это безопасная операция, которая:
-- - Удаляет мертвые строки
-- - Обновляет статистику для оптимизатора запросов
-- - Может занять время на больших таблицах

-- VACUUM для всех таблиц (автоматический режим)
VACUUM ANALYZE;

-- Если нужно принудительно обновить статистику для конкретных таблиц:
-- VACUUM ANALYZE public.partners;
-- VACUUM ANALYZE public.profiles;
-- VACUUM ANALYZE public.partner_link_activations;

-- ============================================
-- 2. ПРОВЕРКА И УДАЛЕНИЕ ДУБЛИКАТОВ ИНДЕКСОВ
-- ============================================
-- Находим потенциально дублирующиеся индексы
SELECT 
  t.tablename,
  array_agg(i.indexname ORDER BY i.indexname) AS indexes,
  COUNT(*) AS index_count
FROM pg_tables t
JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC;

-- ============================================
-- 3. ПРОВЕРКА МЕДЛЕННЫХ ЗАПРОСОВ (если включен pg_stat_statements)
-- ============================================
-- Включение pg_stat_statements (если еще не включен)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Просмотр медленных запросов (если расширение включено)
-- SELECT 
--   query,
--   calls,
--   total_exec_time,
--   mean_exec_time,
--   max_exec_time
-- FROM pg_stat_statements
-- WHERE mean_exec_time > 100  -- Запросы, которые выполняются дольше 100ms в среднем
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- ============================================
-- 4. ОПТИМИЗАЦИЯ RLS ПОЛИТИК
-- ============================================
-- Проверяем, нет ли избыточных политик
-- Если политики слишком сложные, это может замедлять запросы

-- Пример: упрощение политик (если нужно)
-- Убедитесь, что политики используют индексы
-- Например, для partners по partner_code должен быть индекс:
-- CREATE INDEX IF NOT EXISTS idx_partners_partner_code ON public.partners(partner_code) WHERE partner_code IS NOT NULL;

-- ============================================
-- 5. ПРОВЕРКА КОНФИГУРАЦИИ
-- ============================================
-- Проверяем настройки PostgreSQL
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW maintenance_work_mem;

-- ============================================
-- 6. РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ
-- ============================================
-- 1. Регулярно выполняйте VACUUM ANALYZE (можно настроить автовакуум)
-- 2. Удалите неиспользуемые индексы
-- 3. Упростите сложные RLS политики
-- 4. Используйте индексы для часто используемых запросов
-- 5. Рассмотрите возможность партиционирования больших таблиц
-- 6. Проверьте, нет ли N+1 запросов в коде приложения

-- ============================================
-- 7. МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================
-- Создайте представление для мониторинга (опционально)
CREATE OR REPLACE VIEW public.db_performance_stats AS
SELECT 
  'Database Size' AS metric,
  pg_size_pretty(pg_database_size(current_database())) AS value
UNION ALL
SELECT 
  'Total Connections',
  COUNT(*)::TEXT
FROM pg_stat_activity
WHERE datname = current_database()
UNION ALL
SELECT 
  'Active Connections',
  COUNT(*) FILTER (WHERE state = 'active')::TEXT
FROM pg_stat_activity
WHERE datname = current_database()
UNION ALL
SELECT 
  'Idle in Transaction',
  COUNT(*) FILTER (WHERE state = 'idle in transaction')::TEXT
FROM pg_stat_activity
WHERE datname = current_database();

-- Просмотр статистики
-- SELECT * FROM public.db_performance_stats;





