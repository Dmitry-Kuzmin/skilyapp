-- ============================================
-- ПРОВЕРКА И ИСПРАВЛЕНИЕ: Система сезонов
-- ============================================
-- Выполните этот файл в SQL Editor

-- ШАГ 1: Проверить, что функции существуют
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_active_season', 'get_or_create_season_progress')
ORDER BY routine_name;

-- ШАГ 2: Проверить активный сезон напрямую
SELECT * FROM public.duel_pass_seasons WHERE is_active = true;

-- ШАГ 3: Тест функции get_active_season (должна вернуть сезон)
SELECT * FROM public.get_active_season();

-- ШАГ 4: Если функция не работает, применить права доступа:
GRANT EXECUTE ON FUNCTION public.get_active_season() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_season_progress(UUID, INTEGER) TO anon, authenticated;

-- ШАГ 5: Проверить права доступа
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proacl IS NULL THEN 'No permissions set'
    ELSE array_to_string(p.proacl, ', ')
  END as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_active_season', 'get_or_create_season_progress');

-- ШАГ 6: Если функция все еще не работает, пересоздать её:
DROP FUNCTION IF EXISTS public.get_active_season();
CREATE OR REPLACE FUNCTION public.get_active_season()
RETURNS TABLE (
  id INTEGER,
  season_number INTEGER,
  name_ru TEXT,
  name_es TEXT,
  name_en TEXT,
  theme TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_time TIMESTAMPTZ := now();
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.season_number,
    s.name_ru,
    s.name_es,
    s.name_en,
    s.theme,
    s.start_date,
    s.end_date,
    GREATEST(0, EXTRACT(EPOCH FROM (s.end_date - current_time))::INTEGER / 86400)::INTEGER as days_remaining
  FROM public.duel_pass_seasons s
  WHERE s.is_active = true
    AND s.start_date <= current_time
    AND s.end_date >= current_time
  ORDER BY s.season_number DESC
  LIMIT 1;
END;
$$;

-- Применить права после пересоздания
GRANT EXECUTE ON FUNCTION public.get_active_season() TO anon, authenticated;

-- Проверить снова
SELECT * FROM public.get_active_season();

