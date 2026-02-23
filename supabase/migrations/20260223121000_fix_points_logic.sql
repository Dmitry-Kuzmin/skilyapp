-- Fix points logic: track last daily login point correctly, and fix decay

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_point_at DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_decay_at DATE;

CREATE OR REPLACE FUNCTION public.process_license_event(p_user_id UUID, p_event_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points SMALLINT;
    v_points_delta INTEGER := 0;
    v_new_points INTEGER;
    v_country_code TEXT;
    v_result JSONB;
    v_last_daily DATE;
BEGIN
    -- Get current user state
    SELECT license_points, country_code, last_daily_point_at INTO v_current_points, v_country_code, v_last_daily
    FROM profiles WHERE id = p_user_id;

    -- Define rules
    CASE p_event_type
        WHEN 'daily_login' THEN 
            -- Check if already got points today
            IF v_last_daily IS NOT NULL AND v_last_daily = CURRENT_DATE THEN
                v_points_delta := 0;
            ELSE
                v_points_delta := 1;
                -- Will update last_daily_point_at below
            END IF;
        WHEN 'topic_perfect' THEN v_points_delta := 1;
        WHEN 'marathon_completed' THEN v_points_delta := 2;
        WHEN 'exam_pass' THEN v_points_delta := 1;
        WHEN 'exam_fail' THEN v_points_delta := -2;
        WHEN 'critical_error' THEN v_points_delta := -2; 
        WHEN 'inactivity_decay' THEN v_points_delta := -1;
        WHEN 'rehabilitation_pass' THEN 
            v_new_points := 6;
            v_points_delta := 6 - v_current_points;
        ELSE
            v_points_delta := 0;
    END CASE;

    -- Calculate new points with caps
    IF p_event_type != 'rehabilitation_pass' THEN
        v_new_points := v_current_points + v_points_delta;
    END IF;

    -- Clamping (Total min 0, max 15)
    v_new_points := GREATEST(0, LEAST(15, v_new_points));

    -- CAP for passive growth: Daily login can now take you to 10 (Exam unlock)
    IF p_event_type = 'daily_login' THEN
        IF v_current_points < 10 AND v_new_points > 10 THEN
            v_new_points := 10;
        ELSIF v_current_points >= 10 THEN
            -- User is already at or above 10, no passive growth allowed
            v_new_points := v_current_points;
        END IF;

        IF v_points_delta > 0 OR v_new_points >= 10 THEN
             UPDATE profiles SET last_daily_point_at = CURRENT_DATE WHERE id = p_user_id;
        END IF;
    END IF;

    -- Update profile
    UPDATE profiles SET license_points = v_new_points WHERE id = p_user_id;

    -- Record in history
    INSERT INTO user_license_points_history (user_id, points, recorded_at)
    VALUES (p_user_id, v_new_points, CURRENT_DATE)
    ON CONFLICT (user_id, recorded_at) DO UPDATE SET points = EXCLUDED.points;

    -- Build return data
    v_result := jsonb_build_object(
        'old_points', v_current_points,
        'new_points', v_new_points,
        'delta', v_points_delta,
        'event', p_event_type,
        'exam_unlocked', v_new_points >= 10
    );

    RETURN v_result;
END;
$$;

-- Fix get_dashboard_super_v2 to use the new decay logic properly
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
  v_active_season RECORD;
  v_season_progress RECORD;
  v_result JSON;
BEGIN
  -- 0. Автоматическая обработка баллов (Qualification System)
  DECLARE
    v_last_decay DATE;
    v_days_missed INTEGER;
    v_last_active DATE;
  BEGIN
    -- Находим дату последней "активности" (используем update_at профиля или last_daily_point_at)
    -- Но лучше взять последнюю дату начисления ежедневных поинтов 
    SELECT last_daily_point_at, last_decay_at INTO v_last_active, v_last_decay 
    FROM profiles WHERE id = p_user_id;

    IF v_last_active IS NULL THEN
        -- Fallback
        SELECT MAX(recorded_at) INTO v_last_active FROM public.user_license_points_history WHERE user_id = p_user_id;
    END IF;
    IF v_last_active IS NULL THEN
        v_last_active := CURRENT_DATE;
    END IF;

    -- Логика списания (Decay):
    -- Если после последней активности прошло >= 2 дней, и мы еще не списали за эти дни
    IF (CURRENT_DATE - v_last_active) >= 2 AND (v_last_decay IS NULL OR v_last_decay < CURRENT_DATE) THEN
        v_days_missed := (CURRENT_DATE - v_last_active) - 1;
        -- Если уже списывали часть, не будем списывать дважды. Простой способ - обновить last_decay_at.
        v_days_missed := LEAST(v_days_missed, 3); 
        
        FOR i IN 1..v_days_missed LOOP
            PERFORM process_license_event(p_user_id, 'inactivity_decay');
        END LOOP;
        
        UPDATE profiles SET last_decay_at = CURRENT_DATE WHERE id = p_user_id;
    END IF;

    -- Автоматическая обработка ежедневного захода (+1 балл)
    PERFORM process_license_event(p_user_id, 'daily_login');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[get_dashboard_super_v2] license processing failed: %', SQLERRM;
  END;

  -- 1. Профиль пользователя
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
      THEN LEAST(100, ROUND((s.correct_qs + COALESCE(p.correct_count, 0))::NUMERIC / (s.total_qs + COALESCE(p.answered_count, 0)) * 100, 1))
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
      WHEN subscription_status IN ('active', 'trial', 'pro') AND (subscription_expires_at > NOW() OR subscription_expires_at IS NULL) THEN true
      ELSE false
    END as is_premium,
    CASE 
      WHEN subscription_status = 'trial' THEN 
        GREATEST(0, EXTRACT(DAY FROM (subscription_expires_at - NOW()))::INTEGER)
      ELSE NULL
    END as trial_days_remaining
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

  -- 7. Активный сезон
  SELECT 
    s.id, s.season_number, s.name_ru, s.name_es, s.name_en, s.theme,
    s.start_date, s.end_date,
    GREATEST(0, EXTRACT(EPOCH FROM (s.end_date - CURRENT_TIMESTAMP))::INTEGER / 86400)::INTEGER as days_remaining
  INTO v_active_season
  FROM duel_pass_seasons s
  WHERE s.is_active = true
    AND s.start_date <= CURRENT_TIMESTAMP
    AND s.end_date >= CURRENT_TIMESTAMP
  ORDER BY s.season_number DESC
  LIMIT 1;

  -- 8. Прогресс сезона
  v_season_progress := NULL;
  IF v_active_season.id IS NOT NULL THEN
    SELECT * INTO v_season_progress
    FROM user_season_progress usp
    WHERE usp.user_id = p_user_id AND usp.season_id = v_active_season.id
    LIMIT 1;
  END IF;

  -- 9. Сборка финального JSON
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
    'daily_tasks', (
      SELECT COALESCE(json_agg(dt), '[]'::json)
      FROM daily_tasks dt
      WHERE dt.user_id = p_user_id AND dt.date = CURRENT_DATE
    ),
    'recent_achievements', (
      SELECT COALESCE(json_agg(a), '[]'::json)
      FROM (
        SELECT id, achievement_type, title, description, unlocked, progress, max_progress, unlocked_at
        FROM achievements
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 4
      ) a
    ),
    'daily_bonus_definitions', (
      SELECT COALESCE(json_agg(dbd), '[]'::json)
      FROM (
        SELECT day_number, reward, description
        FROM daily_bonus_def
        ORDER BY day_number
        LIMIT 7
      ) dbd
    ),
    'active_season', CASE 
      WHEN v_active_season.id IS NOT NULL THEN
        json_build_object(
          'id', v_active_season.id,
          'name_ru', v_active_season.name_ru,
          'days_remaining', v_active_season.days_remaining
        )
      ELSE NULL
    END,
    'season_progress', CASE 
      WHEN v_season_progress.id IS NOT NULL THEN
        json_build_object(
          'id', v_season_progress.id,
          'level', v_season_progress.level,
          'season_points', v_season_progress.season_points
        )
      ELSE NULL
    END,
    'license_history', (
      SELECT COALESCE(json_agg(h), '[]'::json)
      FROM (
        SELECT points, recorded_at
        FROM public.user_license_points_history
        WHERE user_id = p_user_id
        ORDER BY recorded_at DESC
        LIMIT 10
      ) h
    ),
    'unread_notifications_count', (
      SELECT count(*)::INTEGER FROM duel_notifications WHERE user_id = p_user_id AND is_read = false
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
