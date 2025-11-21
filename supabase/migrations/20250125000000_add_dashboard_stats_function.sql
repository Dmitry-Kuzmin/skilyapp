-- Создать RPC функцию для получения статистики дашборда (батчинг запросов)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_profile RECORD;
  v_sessions_stats RECORD;
  v_daily_bonus RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 1. Получаем профиль (только нужные поля)
  SELECT 
    id,
    rank,
    xp,
    coins,
    boosts,
    streak_days
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Получаем статистику тестов (агрегированные данные)
  SELECT 
    COUNT(*)::INTEGER as tests_completed,
    COALESCE(SUM(total_questions), 0)::INTEGER as total_questions,
    COALESCE(SUM(score), 0)::INTEGER as correct_answers
  INTO v_sessions_stats
  FROM game_sessions
  WHERE user_id = p_user_id;

  -- 3. Получаем ежедневный бонус
  SELECT 
    id,
    current_streak,
    last_claimed_date,
    total_claims
  INTO v_daily_bonus
  FROM user_daily_bonus
  WHERE user_id = p_user_id;

  -- Если записи нет, возвращаем дефолтные значения
  IF NOT FOUND THEN
    v_daily_bonus := ROW(
      NULL::UUID,
      0::INTEGER,
      NULL::DATE,
      0::INTEGER
    )::RECORD;
  END IF;

  -- 4. Вычисляем accuracy
  DECLARE
    v_accuracy INTEGER := 0;
  BEGIN
    IF v_sessions_stats.total_questions > 0 THEN
      v_accuracy := ROUND((v_sessions_stats.correct_answers::NUMERIC / v_sessions_stats.total_questions) * 100);
    END IF;

    -- Собираем результат в JSON
    v_result := json_build_object(
      'profile', json_build_object(
        'id', v_profile.id,
        'rank', v_profile.rank,
        'xp', v_profile.xp,
        'coins', v_profile.coins,
        'boosts', v_profile.boosts,
        'streak_days', v_profile.streak_days
      ),
      'stats', json_build_object(
        'tests_completed', COALESCE(v_sessions_stats.tests_completed, 0),
        'total_questions', COALESCE(v_sessions_stats.total_questions, 0),
        'correct_answers', COALESCE(v_sessions_stats.correct_answers, 0),
        'accuracy', v_accuracy
      ),
      'daily_bonus', json_build_object(
        'id', v_daily_bonus.id,
        'current_streak', COALESCE(v_daily_bonus.current_streak, 0),
        'last_claimed_date', v_daily_bonus.last_claimed_date,
        'total_claims', COALESCE(v_daily_bonus.total_claims, 0),
        'can_claim', COALESCE(v_daily_bonus.last_claimed_date IS NULL OR v_daily_bonus.last_claimed_date < v_today, true)
      )
    );
  END;

  RETURN v_result;
END;
$$;

-- RLS Policy для функции
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO anon;

