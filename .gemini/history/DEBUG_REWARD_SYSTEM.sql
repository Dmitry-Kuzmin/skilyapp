-- Диагностика системы наград
-- Выполни эти запросы в Supabase SQL Editor для проверки

-- 1. Проверка конфигурации
SELECT 
  'Конфигурация наград' as check_name,
  id,
  key,
  revision,
  is_active,
  effective_from,
  value->>'baseCoins' as base_coins,
  value->>'baseSP' as base_sp
FROM reward_config
WHERE key = 'test_rewards'
ORDER BY effective_from DESC;

-- 2. Проверка функции get_active_reward_config
SELECT get_active_reward_config('test_rewards', NULL) as config_result;

-- 3. Проверка таблицы test_results (последние записи)
SELECT 
  id,
  user_id,
  session_id,
  score,
  questions_count,
  coins_awarded,
  sp_awarded,
  abuse_penalty,
  diminishing_factor,
  created_at
FROM test_results
ORDER BY created_at DESC
LIMIT 5;

-- 4. Проверка RLS политик на test_results
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'test_results';

-- 5. Проверка функции increment_profile_value
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_profile_value';

-- 6. Проверка прав доступа (замени USER_ID на свой)
-- SELECT 
--   id,
--   coins,
--   premium_until,
--   trial_until
-- FROM profiles
-- WHERE id = 'USER_ID';

-- 7. Проверка Edge Function в логах
-- Зайди в Supabase Dashboard → Edge Functions → complete-test-and-award → Logs
-- Ищи ошибки с префиксом [complete-test-and-award]

