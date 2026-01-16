-- ============================================
-- ТЕСТ: Проверка работы функций сезонов
-- ============================================
-- Выполните этот файл в SQL Editor для проверки

-- 1. Проверить, что функции существуют
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_active_season', 'get_or_create_season_progress')
ORDER BY routine_name;

-- 2. Проверить права доступа к функциям
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  array_to_string(p.proacl, ', ') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_active_season', 'get_or_create_season_progress');

-- 3. Тест функции get_active_season
SELECT * FROM public.get_active_season();

-- 4. Проверить активный сезон напрямую
SELECT * FROM public.duel_pass_seasons WHERE is_active = true;

-- 5. Если функция не работает, применить права:
-- GRANT EXECUTE ON FUNCTION public.get_active_season() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_or_create_season_progress(UUID, INTEGER) TO anon, authenticated;

