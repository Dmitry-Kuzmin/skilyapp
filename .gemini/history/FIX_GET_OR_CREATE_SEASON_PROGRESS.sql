-- ============================================
-- ИСПРАВЛЕНИЕ: Функция get_or_create_season_progress
-- ============================================
-- Ошибка 400 может быть из-за неправильных типов параметров или прав доступа

-- Пересоздать функцию с правильными типами
DROP FUNCTION IF EXISTS public.get_or_create_season_progress(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_or_create_season_progress(
  p_user_id UUID,
  p_season_id INTEGER
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  season_id INTEGER,
  season_points INTEGER,
  level INTEGER,
  premium_pass_purchased BOOLEAN,
  premium_pass_purchased_at TIMESTAMPTZ,
  levels_skipped INTEGER,
  final_level INTEGER,
  total_xp_earned INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress_id UUID;
  v_level INTEGER;
  v_season_points INTEGER;
BEGIN
  -- Попытка найти существующий прогресс
  SELECT 
    usp.id, usp.season_points, usp.level
  INTO 
    v_progress_id, v_season_points, v_level
  FROM public.user_season_progress usp
  WHERE usp.user_id = p_user_id AND usp.season_id = p_season_id;

  -- Если прогресс не найден, создаем новый
  IF v_progress_id IS NULL THEN
    INSERT INTO public.user_season_progress (user_id, season_id, season_points, level)
    VALUES (p_user_id, p_season_id, 0, 1)
    RETURNING 
      id, 
      season_points, 
      level 
    INTO 
      v_progress_id, 
      v_season_points, 
      v_level;
  END IF;

  -- Возвращаем найденный или созданный прогресс
  RETURN QUERY
  SELECT 
    usp.id,
    usp.user_id,
    usp.season_id,
    usp.season_points,
    usp.level,
    usp.premium_pass_purchased,
    usp.premium_pass_purchased_at,
    usp.levels_skipped,
    usp.final_level,
    usp.total_xp_earned,
    usp.created_at,
    usp.updated_at
  FROM public.user_season_progress usp
  WHERE usp.id = v_progress_id;
END;
$$;

-- Применить права доступа
GRANT EXECUTE ON FUNCTION public.get_or_create_season_progress(UUID, INTEGER) TO anon, authenticated;

-- Проверить работу функции (замените UUID на реальный user_id)
-- SELECT * FROM public.get_or_create_season_progress('00000000-0000-0000-0000-000000000000'::UUID, 1);

