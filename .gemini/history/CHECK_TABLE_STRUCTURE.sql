-- ============================================
-- ПРОВЕРКА: Структура таблицы user_season_progress
-- ============================================
-- Выполните этот файл для проверки структуры таблицы

-- Проверить все колонки таблицы user_season_progress
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_season_progress'
ORDER BY ordinal_position;

-- Проверить, что функция возвращает правильные колонки
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_or_create_season_progress';

