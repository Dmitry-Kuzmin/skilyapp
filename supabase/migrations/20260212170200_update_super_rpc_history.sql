-- Update Super RPC to include license points history
-- This will provide real data for the LicenseCard chart

-- КРИТИЧНО: Удаляем старую версию с каскадным удалением зависимостей (если есть)
-- Сигнатура должна точно совпадать с той, что в базе
DROP FUNCTION IF EXISTS public.get_dashboard_super_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_super_v2(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_super_v2(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile RECORD;
  v_stats RECORD;
  v_readiness RECORD;
  v_daily_bonus RECORD;
  v_premium RECORD;
  v_partner RECORD;
  v_result JSON;
BEGIN
  -- 0. Автоматическая обработка ежедневного захода (Qualification System)
  -- Это гарантирует, что баллы в карточке обновляются сразу при входе, 
  -- даже если пользователь не нажал "Забрать бонус"
  PERFORM process_license_event(p_user_id, 'daily_login');

  -- 1. Профиль пользователя (расширенный)
  SELECT 
    id, rank, xp, coins, boosts, streak_days, settings,
    subscription_status, subscription_expires_at, photo_url,
    first_name, last_name, username, license_points
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  -- 2. Статистика (тесты, вопросы, точность)
  WITH 
    sessions AS (
      SELECT 
        COUNT(*) as tests_count,
        COALESCE(SUM(total_questions), 0) as total_qs,
        COALESCE(SUM(score), 0) as correct_qs
      FROM game_sessions
      WHERE user_id = p_user_id
        AND game_type IN ('test_exam', 'test_practice')
    ),
    progress AS (
      SELECT 
        COUNT(*) FILTER (WHERE is_answered = true) as answered_count,
        COUNT(*) FILTER (WHERE is_answered = true AND is_correct = true) as correct_count
      FROM user_progress
      WHERE user_id = p_user_id
    ),
    recent_sessions AS (
      SELECT 
        COALESCE(AVG(CAST(score AS FLOAT) / NULLIF(total_questions, 0) * 100), 0) as recent_performance
      FROM (
        SELECT score, total_questions
        FROM game_sessions
        WHERE user_id = p_user_id
          AND game_type IN ('test_exam', 'test_practice')
        ORDER BY created_at DESC
        LIMIT 5
      ) recent
    )
  SELECT 
    s.tests_count,
    s.total_qs + COALESCE(p.answered_count, 0) as total_questions,
    s.correct_qs + COALESCE(p.correct_count, 0) as correct_answers,
    CASE 
      WHEN (s.total_qs + COALESCE(p.answered_count, 0)) > 0 
      THEN ROUND((s.correct_qs + COALESCE(p.correct_count, 0))::NUMERIC / (s.total_qs + COALESCE(p.answered_count, 0)) * 100, 1)
      ELSE 0 
    END as accuracy,
    COALESCE(rs.recent_performance, 0) as recent_performance
  INTO v_stats
  FROM sessions s
  CROSS JOIN progress p
  CROSS JOIN recent_sessions rs;

  -- 3. Готовность к экзамену
  WITH 
    topic_progress AS (
      SELECT 
        COUNT(DISTINCT t.id) as total_topics,
        COUNT(DISTINCT CASE WHEN utp.completed = true THEN t.id END) as completed_topics
      FROM topics t
      LEFT JOIN user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = p_user_id
    ),
    question_stats AS (
      SELECT 
        COUNT(DISTINCT up.question_id) as unique_questions,
        COUNT(DISTINCT qn.topic_id) as topics_with_answers
      FROM user_progress up
      INNER JOIN questions_new qn ON qn.id = up.question_id
      WHERE up.user_id = p_user_id AND up.is_answered = true
    )
  SELECT 
    CASE 
      WHEN tp.total_topics > 0 
      THEN ROUND((tp.completed_topics::NUMERIC / tp.total_topics) * 100, 1)
      ELSE 0 
    END as topics_covered_percent,
    COALESCE(qs.unique_questions, 0) as unique_questions_answered,
    COALESCE(qs.topics_with_answers, 0) as topics_with_answers
  INTO v_readiness
  FROM topic_progress tp
  CROSS JOIN question_stats qs;

  -- 4. Ежедневный бонус
  SELECT 
    udb.id,
    COALESCE(udb.current_streak, 0) as current_streak,
    udb.last_claimed_date,
    COALESCE(udb.total_claims, 0) as total_claims,
    CASE 
      WHEN udb.last_claimed_date IS NULL THEN true
      WHEN udb.last_claimed_date < CURRENT_DATE THEN true
      ELSE false
    END as can_claim
  INTO v_daily_bonus
  FROM user_daily_bonus udb
  WHERE udb.user_id = p_user_id
  LIMIT 1;

  IF v_daily_bonus.id IS NULL THEN
    v_daily_bonus := ROW(NULL, 0, NULL, 0, true);
  END IF;

  -- 5. Premium статус
  SELECT 
    subscription_status,
    subscription_expires_at,
    CASE 
      WHEN subscription_status IN ('active', 'trial') AND subscription_expires_at > NOW() THEN true
      ELSE false
    END as is_premium
  INTO v_premium
  FROM profiles
  WHERE id = p_user_id;

  -- 6. Partner статус
  SELECT 
    p.id, p.partner_code, p.name, p.status,
    CASE WHEN p.id IS NOT NULL THEN true ELSE false END as is_partner
  INTO v_partner
  FROM partners p
  WHERE p.user_id = p_user_id
  LIMIT 1;

  -- 7. Собираем результат
  SELECT json_build_object(
    'profile', json_build_object(
      'id', v_profile.id,
      'rank', COALESCE(v_profile.rank, 'Ученик'),
      'xp', COALESCE(v_profile.xp, 0),
      'coins', COALESCE(v_profile.coins, 0),
      'boosts', COALESCE(v_profile.boosts, 0),
      'streak_days', COALESCE(v_profile.streak_days, 0),
      'settings', COALESCE(v_profile.settings, '{}'::jsonb),
      'photo_url', v_profile.photo_url,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'username', v_profile.username,
      'license_points', COALESCE(v_profile.license_points, 8)
    ),
    'stats', json_build_object(
      'tests_completed', COALESCE(v_stats.tests_count, 0),
      'total_questions', COALESCE(v_stats.total_questions, 0),
      'correct_answers', COALESCE(v_stats.correct_answers, 0),
      'accuracy', COALESCE(v_stats.accuracy, 0),
      'recent_performance', COALESCE(v_stats.recent_performance, 0)
    ),
    'readiness', json_build_object(
      'topics_covered_percent', COALESCE(v_readiness.topics_covered_percent, 0),
      'unique_questions_answered', COALESCE(v_readiness.unique_questions_answered, 0),
      'topics_with_answers', COALESCE(v_readiness.topics_with_answers, 0)
    ),
    'daily_bonus', json_build_object(
      'id', v_daily_bonus.id,
      'current_streak', v_daily_bonus.current_streak,
      'last_claimed_date', v_daily_bonus.last_claimed_date,
      'total_claims', v_daily_bonus.total_claims,
      'can_claim', v_daily_bonus.can_claim
    ),
    'premium', json_build_object(
      'is_premium', COALESCE(v_premium.is_premium, false)
    ),
    'license_history', (
      SELECT COALESCE(json_agg(h), '[]'::json)
      FROM (
        SELECT points, recorded_at
        FROM public.user_license_points_history
        WHERE user_id = p_user_id
        ORDER BY recorded_at DESC
        LIMIT 10
      ) h
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_super_v2(UUID) TO authenticated;
