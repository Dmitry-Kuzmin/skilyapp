-- Проверка статуса миграции системы наград

-- 1. Проверка таблиц
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('test_results', 'reward_config', 'reward_config_history')
ORDER BY table_name;

-- 2. Проверка функции
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_active_reward_config';

-- 3. Проверка индексов
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('test_results', 'reward_config')
ORDER BY tablename, indexname;

-- 4. Проверка конфигурации (должна быть только одна активная)
SELECT id, key, revision, effective_from, is_active,
       value->>'baseCoins' as base_coins,
       value->>'baseSP' as base_sp
FROM reward_config 
WHERE key = 'test_rewards' 
ORDER BY effective_from DESC;
