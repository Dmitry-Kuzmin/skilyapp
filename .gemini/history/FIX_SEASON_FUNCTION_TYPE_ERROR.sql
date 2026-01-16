-- ============================================
-- ИСПРАВЛЕНИЕ: Ошибка типа данных в get_active_season()
-- ============================================
-- Ошибка: operator does not exist: timestamp with time zone - time with time zone
-- Решение: Использовать CURRENT_TIMESTAMP вместо переменной current_time

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
    GREATEST(0, EXTRACT(EPOCH FROM (s.end_date - CURRENT_TIMESTAMP))::INTEGER / 86400)::INTEGER as days_remaining
  FROM public.duel_pass_seasons s
  WHERE s.is_active = true
    AND s.start_date <= CURRENT_TIMESTAMP
    AND s.end_date >= CURRENT_TIMESTAMP
  ORDER BY s.season_number DESC
  LIMIT 1;
END;
$$;

-- Применить права доступа
GRANT EXECUTE ON FUNCTION public.get_active_season() TO anon, authenticated;

-- Проверить работу функции
SELECT * FROM public.get_active_season();

