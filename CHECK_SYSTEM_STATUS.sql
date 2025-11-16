-- Финальная проверка системы наград

-- 1. Проверка таблиц
SELECT 
  'Таблицы созданы' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('test_results', 'reward_config', 'reward_config_history');

-- 2. Проверка функции
SELECT 
  'Функция создана' as check_type,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_active_reward_config';

-- 3. Проверка конфигурации (должна быть только одна)
SELECT 
  'Активная конфигурация' as check_type,
  COUNT(*) as count
FROM reward_config
WHERE key = 'test_rewards' AND is_active = true;

-- 4. Проверка индексов
SELECT 
  'Индексы созданы' as check_type,
  COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('test_results', 'reward_config')
  AND indexname LIKE '%test_results%' OR indexname LIKE '%reward_config%';
