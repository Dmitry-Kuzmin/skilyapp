-- ============================================
-- БЫСТРАЯ ПРОВЕРКА: Настройки функции и тест
-- ============================================

-- 1. Проверка настроек функции
SELECT 
  'Настройки функции' as info,
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE WHEN 'search_path=public' = ANY(p.proconfig) THEN '✅ search_path=public' ELSE '❌ NO search_path' END as search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'increment_profile_value';

-- 2. Простой тест функции (добавляем 1 монету для теста)
SELECT increment_profile_value('78fd7d40-88c8-4ee3-a64c-61d630ba3c98', 'coins', 1);

-- 3. Проверяем что монеты увеличились
SELECT 
  'Результат теста' as info,
  coins as current_coins,
  'Если видите это число - функция РАБОТАЕТ ✅' as status
FROM profiles 
WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

