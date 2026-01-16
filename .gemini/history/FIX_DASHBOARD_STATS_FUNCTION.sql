-- ============================================
-- ИСПРАВЛЕНИЕ: get_dashboard_stats для test_results
-- ============================================
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

-- Обновляем функцию чтобы она брала данные из test_results + game_sessions
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
  v_test_results_stats RECORD;
  v_daily_bonus RECORD;
  v_today DATE := CURRENT_DATE;
  v_accuracy INTEGER := 0;
  v_total_tests INTEGER := 0;
  v_total_questions INTEGER := 0;
  v_total_correct INTEGER := 0;
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

  -- 2. Получаем статистику из game_sessions (старая система)
  SELECT 
    COUNT(*)::INTEGER as tests_completed,
    COALESCE(SUM(total_questions), 0)::INTEGER as total_questions,
    COALESCE(SUM(score), 0)::INTEGER as correct_answers
  INTO v_sessions_stats
  FROM game_sessions
  WHERE user_id = p_user_id;

  -- 3. НОВОЕ: Получаем статистику из test_results (новая система)
  SELECT 
    COUNT(*)::INTEGER as tests_completed,
    COALESCE(SUM(questions_count), 0)::INTEGER as total_questions,
    COALESCE(SUM(correct_count), 0)::INTEGER as correct_answers
  INTO v_test_results_stats
  FROM test_results
  WHERE user_id = p_user_id;

  -- 4. Получаем ежедневный бонус
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

  -- 5. ОБЪЕДИНЯЕМ статистику из обеих систем
  v_total_tests := COALESCE(v_sessions_stats.tests_completed, 0) + COALESCE(v_test_results_stats.tests_completed, 0);
  v_total_questions := COALESCE(v_sessions_stats.total_questions, 0) + COALESCE(v_test_results_stats.total_questions, 0);
  v_total_correct := COALESCE(v_sessions_stats.correct_answers, 0) + COALESCE(v_test_results_stats.correct_answers, 0);

  -- 6. Вычисляем accuracy
  IF v_total_questions > 0 THEN
    v_accuracy := ROUND((v_total_correct::NUMERIC / v_total_questions) * 100);
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
      'tests_completed', v_total_tests,
      'total_questions', v_total_questions,
      'correct_answers', v_total_correct,
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

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats IS 'Получить статистику dashboard (из game_sessions + test_results)';

-- Проверяем результат для вашего профиля
SELECT 
  '=== ТЕСТ ФУНКЦИИ ===' as test_name,
  public.get_dashboard_stats('78fd7d40-88c8-4ee3-a64c-61d630ba3c98') as result;

-- Детальная статистика для сравнения
SELECT 
  '=== ДЕТАЛЬНАЯ СТАТИСТИКА ===' as info,
  (SELECT COUNT(*) FROM test_results WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98') as tests_in_test_results,
  (SELECT COUNT(*) FROM game_sessions WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98') as tests_in_game_sessions,
  (SELECT SUM(questions_count) FROM test_results WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98') as questions_test_results,
  (SELECT SUM(correct_count) FROM test_results WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98') as correct_test_results;

