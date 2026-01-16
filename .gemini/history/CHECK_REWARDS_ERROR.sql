-- ============================================
-- ДИАГНОСТИКА: Проверка почему Edge Function падает
-- ============================================
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

-- 1. Проверка существования таблиц
SELECT 
  'Проверка таблиц' as check_type,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_results') as test_results_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_config') as reward_config_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as profiles_exists;

-- 2. Проверка данных в reward_config
SELECT 
  'Конфигурация наград' as check_type,
  key,
  is_active,
  value::text as config_preview
FROM public.reward_config
WHERE key = 'test_rewards'
ORDER BY revision DESC
LIMIT 1;

-- 3. Проверка функции get_active_reward_config
SELECT 
  'Тест функции get_active_reward_config' as check_type,
  CASE 
    WHEN public.get_active_reward_config('test_rewards', NULL) IS NOT NULL 
    THEN 'РАБОТАЕТ ✅'
    ELSE 'НЕ РАБОТАЕТ ❌'
  END as status;

-- 4. Проверка функции increment_profile_value
SELECT 
  'Проверка функции increment_profile_value' as check_type,
  EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'increment_profile_value'
  ) as function_exists;

-- 5. Проверка RLS политик test_results
SELECT 
  'RLS политики test_results' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'test_results';

-- 6. Проверка RLS политик reward_config
SELECT 
  'RLS политики reward_config' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'reward_config';

-- 7. Попытка ручного вызова get_active_reward_config
DO $$
DECLARE
  v_config JSONB;
BEGIN
  v_config := public.get_active_reward_config('test_rewards', NULL);
  
  IF v_config IS NULL THEN
    RAISE NOTICE 'ОШИБКА: Функция вернула NULL!';
  ELSE
    RAISE NOTICE 'УСПЕХ: Конфигурация загружена';
    RAISE NOTICE 'baseCoins: %', v_config->>'baseCoins';
    RAISE NOTICE 'baseSP: %', v_config->>'baseSP';
  END IF;
END $$;

-- 8. Проверка последних ошибок в test_results (если есть записи)
SELECT 
  'Последние тесты' as check_type,
  COUNT(*) as total_tests,
  MAX(created_at) as last_test_at
FROM public.test_results;

-- 9. Проверка search_path функции
SELECT 
  'Search path функций' as check_type,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NOT NULL THEN array_to_string(p.proconfig, ', ')
    ELSE 'not set'
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_active_reward_config', 'increment_profile_value');

-- 10. Финальный вердикт
SELECT 
  '=== ФИНАЛЬНЫЙ ВЕРДИКТ ===' as check_type,
  CASE 
    WHEN NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_config')
    THEN '❌ Таблица reward_config не существует - нужно применить миграцию!'
    
    WHEN NOT EXISTS(SELECT 1 FROM public.reward_config WHERE key = 'test_rewards' AND is_active = true)
    THEN '❌ Нет активной конфигурации test_rewards - нужно выполнить FIX_REWARDS_SYSTEM.sql'
    
    WHEN public.get_active_reward_config('test_rewards', NULL) IS NULL
    THEN '❌ Функция get_active_reward_config возвращает NULL - проверить search_path'
    
    ELSE '✅ Все проверки пройдены - система должна работать'
  END as verdict;

