-- ============================================
-- ИСПРАВЛЕНИЕ: Добавить права доступа к RPC функциям
-- ============================================
-- Примените этот файл в SQL Editor если функции не работают

-- Дать права на выполнение функции get_active_season
GRANT EXECUTE ON FUNCTION public.get_active_season() TO anon, authenticated;

-- Дать права на выполнение функции get_or_create_season_progress
GRANT EXECUTE ON FUNCTION public.get_or_create_season_progress(UUID, INTEGER) TO anon, authenticated;

-- Проверить, что функции существуют
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_active_season', 'get_or_create_season_progress');

-- Проверить активный сезон
SELECT * FROM public.duel_pass_seasons WHERE is_active = true;

