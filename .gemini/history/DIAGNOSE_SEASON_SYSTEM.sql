-- ============================================
-- ДИАГНОСТИКА: Проверка системы сезонов
-- ============================================
-- Выполните этот файл в SQL Editor для полной диагностики

-- ШАГ 1: Проверить, что таблицы существуют
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'duel_pass_seasons',
  'duel_pass_season_rewards',
  'user_season_progress',
  'season_challenges',
  'user_challenge_progress',
  'user_season_history'
)
ORDER BY table_name;

-- ШАГ 2: Проверить активный сезон
SELECT 
  id,
  season_number,
  name_ru,
  start_date,
  end_date,
  is_active,
  CURRENT_TIMESTAMP as now_time,
  CASE 
    WHEN start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP THEN 'ACTIVE'
    WHEN start_date > CURRENT_TIMESTAMP THEN 'FUTURE'
    WHEN end_date < CURRENT_TIMESTAMP THEN 'EXPIRED'
    ELSE 'INACTIVE'
  END as status
FROM public.duel_pass_seasons
ORDER BY season_number DESC;

-- ШАГ 3: Проверить, что функции существуют
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_active_season', 'get_or_create_season_progress')
ORDER BY routine_name;

-- ШАГ 4: Проверить права доступа к функциям
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proacl IS NULL THEN 'No permissions'
    ELSE array_to_string(p.proacl, ', ')
  END as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_active_season', 'get_or_create_season_progress')
ORDER BY p.proname;

-- ШАГ 5: Тест функции get_active_season
SELECT 'Testing get_active_season...' as test;
SELECT * FROM public.get_active_season();

-- ШАГ 6: Проверить структуру таблицы user_season_progress
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_season_progress'
ORDER BY ordinal_position;

-- ШАГ 7: Проверить награды сезона (должно быть 30 уровней)
SELECT 
  COUNT(*) as total_rewards,
  MIN(level) as min_level,
  MAX(level) as max_level
FROM public.duel_pass_season_rewards
WHERE season_id = 1;

-- ШАГ 8: Проверить челленджи
SELECT 
  id,
  challenge_type,
  title_ru,
  target_type,
  target_value,
  reward_sp,
  reward_coins,
  is_active,
  start_date,
  end_date
FROM public.season_challenges
WHERE season_id = 1
ORDER BY challenge_type, created_at;

-- ШАГ 9: Проверить RLS политики
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
WHERE schemaname = 'public'
AND tablename IN (
  'duel_pass_seasons',
  'duel_pass_season_rewards',
  'user_season_progress',
  'season_challenges',
  'user_challenge_progress'
)
ORDER BY tablename, policyname;

-- ШАГ 10: Если функция get_or_create_season_progress не работает, 
-- проверить её определение на конфликты имен
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_or_create_season_progress';

