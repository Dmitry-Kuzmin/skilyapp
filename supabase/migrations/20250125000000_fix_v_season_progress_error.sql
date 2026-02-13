-- ======================================
-- FIX: Исправление ошибки 55000 "record v_season_progress is not assigned yet"
-- ======================================
-- Проблема: Переменная v_season_progress используется в CASE WHEN до того,
-- как в неё что-то записано. Если SELECT INTO не находит запись,
-- переменная остается "неназначенной" и вызывает ошибку 55000.
--
-- Решение: Инициализируем переменную NULL и проверяем на NULL перед использованием

CREATE OR REPLACE FUNCTION get_dashboard_super(p_user_id UUID)
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
  v_active_season RECORD;
  v_season_progress RECORD;
  v_result JSON;
BEGIN
  -- 1. Профиль пользователя (расширенный)
  SELECT 
    id, 
    rank, 
    xp, 
    coins, 
    boosts, 
    streak_days,
    settings,
    subscription_status,
    subscription_expires_at,
    photo_url,
    first_name,
    last_name,
    username
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
        COUNT(*)::INTEGER as tests_count,
        COALESCE(SUM(total_questions), 0)::INTEGER as total_questions,
        COALESCE(SUM(score), 0)::INTEGER as correct_answers
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
    )
  SELECT 
    s.tests_count,
    s.total_questions,
    s.correct_answers,
    COALESCE(p.answered_count, 0) as unique_questions_answered
  INTO v_stats 
  FROM sessions s
  CROSS JOIN LATERAL (SELECT * FROM progress) p;

  -- 3. Готовность (процент тем, уникальные вопросы)
  WITH 
    readiness AS (
      SELECT 
        ROUND(
          (COUNT(DISTINCT tp.topic_id)::NUMERIC / NULLIF((SELECT COUNT(*) FROM topics), 0)) * 100, 
          1
        )::NUMERIC as topics_covered_percent,
        COUNT(DISTINCT up.question_id)::INTEGER as unique_questions_answered,
        COUNT(DISTINCT tp.topic_id)::INTEGER as topics_with_answers
      FROM topic_progress tp
      LEFT JOIN user_progress up ON up.user_id = p_user_id AND up.is_answered = true
      WHERE tp.user_id = p_user_id
    )
  SELECT * INTO v_readiness FROM readiness;

  -- 4. Ежедневный бонус
  SELECT 
    id,
    current_streak,
    last_claimed_date,
    total_claims,
    (last_claimed_date IS NULL OR last_claimed_date < CURRENT_DATE) as can_claim
  INTO v_daily_bonus
  FROM user_daily_bonus
  WHERE user_id = p_user_id;

  -- 5. Premium статус
  SELECT 
    (subscription_status = 'active' OR subscription_expires_at > CURRENT_TIMESTAMP) as is_premium,
    subscription_status,
    subscription_expires_at,
    CASE 
      WHEN trial_until > CURRENT_TIMESTAMP THEN 
        EXTRACT(DAY FROM (trial_until - CURRENT_TIMESTAMP))::INTEGER
      ELSE 0
    END as trial_days_remaining
  INTO v_premium
  FROM profiles
  WHERE id = p_user_id;

  -- 6. Partner статус
  SELECT 
    p.id,
    p.partner_code,
    p.name,
    p.status,
    EXISTS(SELECT 1 FROM partner_users pu WHERE pu.partner_id = p.id AND pu.user_id = p_user_id) as is_partner
  INTO v_partner
  FROM partners p
  WHERE EXISTS(SELECT 1 FROM partner_users pu WHERE pu.partner_id = p.id AND pu.user_id = p_user_id)
  LIMIT 1;

  -- 7. НОВОЕ: Активный сезон (убираем отдельный запрос get_active_season)
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
  INTO v_active_season
  FROM duel_pass_seasons s
  WHERE s.is_active = true
    AND s.start_date <= CURRENT_TIMESTAMP
    AND s.end_date >= CURRENT_TIMESTAMP
  ORDER BY s.season_number DESC
  LIMIT 1;

  -- 8. НОВОЕ: Прогресс сезона пользователя
  -- КРИТИЧНО: Инициализируем переменную NULL для предотвращения ошибки 55000
  v_season_progress := NULL;
  
  IF v_active_season.id IS NOT NULL THEN
    BEGIN
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
        usp.final_sp,
        usp.created_at,
        usp.updated_at
      INTO v_season_progress
      FROM user_season_progress usp
      WHERE usp.user_id = p_user_id 
        AND usp.season_id = v_active_season.id
      LIMIT 1;
      
      -- Если запись не найдена, v_season_progress останется NULL
      -- Это безопасно, так как мы проверяем на NULL в CASE WHEN
      IF NOT FOUND THEN
        v_season_progress := NULL;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Если произошла любая ошибка, оставляем NULL
        v_season_progress := NULL;
    END;
  END IF;

  -- 9. Собираем результат в один SUPER JSON
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
      'username', v_profile.username
    ),
    'stats', json_build_object(
      'tests_completed', COALESCE(v_stats.tests_count, 0),
      'total_questions', COALESCE(v_stats.total_questions, 0),
      'correct_answers', COALESCE(v_stats.correct_answers, 0),
      'accuracy', CASE 
        WHEN COALESCE(v_stats.total_questions, 0) > 0 THEN
          ROUND((COALESCE(v_stats.correct_answers, 0)::NUMERIC / v_stats.total_questions) * 100, 1)
        ELSE 0
      END,
      'recent_performance', 0
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
      'is_premium', COALESCE(v_premium.is_premium, false),
      'subscription_status', v_premium.subscription_status,
      'subscription_expires_at', v_premium.subscription_expires_at,
      'trial_days_remaining', v_premium.trial_days_remaining
    ),
    'partner', json_build_object(
      'is_partner', COALESCE(v_partner.is_partner, false),
      'partner_id', v_partner.id,
      'partner_code', v_partner.partner_code,
      'partner_name', v_partner.name,
      'partner_status', v_partner.status
    ),
    'active_season', CASE 
      WHEN v_active_season.id IS NOT NULL THEN
        json_build_object(
          'id', v_active_season.id,
          'season_number', v_active_season.season_number,
          'name_ru', v_active_season.name_ru,
          'name_es', v_active_season.name_es,
          'name_en', v_active_season.name_en,
          'theme', v_active_season.theme,
          'start_date', v_active_season.start_date,
          'end_date', v_active_season.end_date,
          'days_remaining', v_active_season.days_remaining
        )
      ELSE NULL
    END,
    -- КРИТИЧНО: Проверяем что v_season_progress не NULL перед использованием полей
    'season_progress', CASE 
      WHEN v_season_progress IS NOT NULL AND v_season_progress.id IS NOT NULL THEN
        json_build_object(
          'id', v_season_progress.id,
          'user_id', v_season_progress.user_id,
          'season_id', v_season_progress.season_id,
          'season_points', COALESCE(v_season_progress.season_points, 0),
          'level', COALESCE(v_season_progress.level, 1),
          'premium_pass_purchased', COALESCE(v_season_progress.premium_pass_purchased, false),
          'premium_pass_purchased_at', v_season_progress.premium_pass_purchased_at,
          'levels_skipped', COALESCE(v_season_progress.levels_skipped, 0),
          'final_level', v_season_progress.final_level,
          'final_sp', v_season_progress.final_sp,
          'created_at', v_season_progress.created_at,
          'updated_at', v_season_progress.updated_at
        )
      ELSE NULL
    END
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_super IS 'Super RPC для получения всех данных дашборда одним запросом. Исправлена ошибка 55000 с v_season_progress.';

