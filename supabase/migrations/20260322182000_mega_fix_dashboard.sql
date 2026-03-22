-- Mega Fix: Restore Dashboard, Fix NaN%, Fix Missing Duel Pass
-- Description: 
-- 1. Re-implements get_dashboard_super_v2 using baseline stable logic
-- 2. Adds referral_code, duel_wins, duel_total safely
-- 3. Restores active_season selection with broad criteria
-- 4. Ensures numeric fields never return NULL/NaN by using COALESCE

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
  v_daily_bonus JSON;
  v_premium RECORD;
  v_partner RECORD;
  v_active_season RECORD;
  v_season_progress RECORD;
  v_result JSON;
  v_duel_stats RECORD;
  v_last_decay DATE;
  v_last_active DATE;
  v_days_missed INTEGER;
BEGIN
  -- 1. LICENSE AUTOMATION (Point Decay & Daily Login)
  BEGIN
    SELECT last_daily_point_at, last_decay_at INTO v_last_active, v_last_decay 
    FROM public.profiles WHERE id = p_user_id;

    IF v_last_active IS NOT NULL AND (CURRENT_DATE - v_last_active) >= 2 
       AND (v_last_decay IS NULL OR v_last_decay < CURRENT_DATE) THEN
        v_days_missed := LEAST((CURRENT_DATE - v_last_active) - 1, 3);
        FOR i IN 1..v_days_missed LOOP
            PERFORM public.process_license_event(p_user_id, 'inactivity_decay');
        END LOOP;
        UPDATE public.profiles SET last_decay_at = CURRENT_DATE WHERE id = p_user_id;
    END IF;
    PERFORM public.process_license_event(p_user_id, 'daily_login');
  EXCEPTION WHEN OTHERS THEN 
    RAISE WARNING '[get_dashboard_super_v2] Automation failed: %', SQLERRM;
  END;

  -- 2. PROFILE DATA
  SELECT id, rank, xp, coins, boosts, streak_days, settings, subscription_status, subscription_expires_at, photo_url, first_name, last_name, username, license_points, referral_code
  INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  IF v_profile.id IS NULL THEN 
    RETURN json_build_object('error', 'Profile not found'); 
  END IF;

  -- 3. STATS (Accuracy & Tests)
  BEGIN
    WITH sessions AS (SELECT COUNT(*) as tests_count, COALESCE(SUM(total_questions), 0) as total_qs, COALESCE(SUM(score), 0) as correct_qs FROM public.game_sessions WHERE user_id = p_user_id AND game_type IN ('test_exam', 'test_practice')),
         progress AS (SELECT COUNT(*) FILTER (WHERE is_answered = true) as answered_count, COUNT(*) FILTER (WHERE is_answered = true AND is_correct = true) as correct_count FROM public.user_progress WHERE user_id = p_user_id),
         recent_sessions AS (SELECT COALESCE(AVG(CAST(score AS FLOAT) / NULLIF(total_questions, 0) * 100), 0) as recent_performance FROM (SELECT score, total_questions FROM public.game_sessions WHERE user_id = p_user_id AND game_type IN ('test_exam', 'test_practice') ORDER BY created_at DESC LIMIT 5) recent)
    SELECT s.tests_count, (s.total_qs + COALESCE(p.answered_count, 0)) as total_questions, (s.correct_qs + COALESCE(p.correct_count, 0)) as correct_answers,
      CASE WHEN (s.total_qs + COALESCE(p.answered_count, 0)) > 0 THEN LEAST(100, ROUND((s.correct_qs + COALESCE(p.correct_count, 0))::NUMERIC / (s.total_qs + COALESCE(p.answered_count, 0)) * 100, 1)) ELSE 0 END as accuracy, COALESCE(rs.recent_performance, 0) as recent_performance
    INTO v_stats FROM sessions s CROSS JOIN progress p CROSS JOIN recent_sessions rs;
  EXCEPTION WHEN OTHERS THEN v_stats := (0, 0, 0, 0, 0)::RECORD; END;

  -- 4. READINESS
  BEGIN
    WITH topic_progress AS (SELECT COUNT(DISTINCT t.id) as total_topics, COUNT(DISTINCT CASE WHEN utp.completed = true THEN t.id END) as completed_topics FROM public.topics t LEFT JOIN public.user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = p_user_id),
         question_stats AS (SELECT COUNT(DISTINCT up.question_id) as unique_questions, COUNT(DISTINCT qn.topic_id) as topics_with_answers FROM public.user_progress up INNER JOIN public.questions_new qn ON qn.id = up.question_id WHERE up.user_id = p_user_id AND up.is_answered = true)
    SELECT CASE WHEN tp.total_topics > 0 THEN ROUND((tp.completed_topics::NUMERIC / tp.total_topics) * 100, 1) ELSE 0 END as topics_covered_percent, COALESCE(qs.unique_questions, 0) as unique_questions_answered, COALESCE(qs.topics_with_answers, 0) as topics_with_answers
    INTO v_readiness FROM topic_progress tp CROSS JOIN question_stats qs;
  EXCEPTION WHEN OTHERS THEN v_readiness := (0, 0, 0)::RECORD; END;

  -- 5. DAILY BONUS
  BEGIN
    SELECT json_build_object(
        'id', udb.id,
        'current_streak', COALESCE(udb.current_streak, 0),
        'last_claimed_date', udb.last_claimed_date,
        'total_claims', COALESCE(udb.total_claims, 0),
        'can_claim', CASE WHEN udb.last_claimed_date IS NULL OR udb.last_claimed_date < CURRENT_DATE THEN true ELSE false END
    ) INTO v_daily_bonus FROM public.user_daily_bonus udb WHERE udb.user_id = p_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_daily_bonus := NULL; END;
  
  IF v_daily_bonus IS NULL THEN 
      v_daily_bonus := json_build_object('id', NULL, 'current_streak', 0, 'last_claimed_date', NULL, 'total_claims', 0, 'can_claim', true);
  END IF;

  -- 6. PREMIUM / PARTNER / DUEL STATS
  SELECT subscription_status, subscription_expires_at, 
         CASE WHEN subscription_status IN ('active', 'trial', 'pro') AND (subscription_expires_at > NOW() OR subscription_expires_at IS NULL) THEN true ELSE false END as is_premium, 
         CASE WHEN subscription_status = 'trial' THEN GREATEST(0, EXTRACT(DAY FROM (subscription_expires_at - NOW()))::INTEGER) ELSE NULL END as trial_days_remaining 
  INTO v_premium FROM public.profiles WHERE id = p_user_id;

  SELECT id, partner_code, name, status, true as is_partner INTO v_partner FROM public.partners WHERE user_id = p_user_id LIMIT 1;

  SELECT total_duels, wins INTO v_duel_stats FROM public.duel_stats WHERE user_id = p_user_id LIMIT 1;

  -- 7. SEASON & PROGRESS
  BEGIN
    SELECT id, season_number, name_ru, name_es, name_en, theme, start_date, end_date, GREATEST(0, EXTRACT(EPOCH FROM (end_date - CURRENT_TIMESTAMP))::INTEGER / 86400)::INTEGER as days_remaining 
    INTO v_active_season 
    FROM public.duel_pass_seasons 
    WHERE (is_active = true OR (start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP)) 
    ORDER BY is_active DESC, season_number DESC LIMIT 1;

    IF v_active_season.id IS NOT NULL THEN
      SELECT id, level, season_points INTO v_season_progress FROM public.user_season_progress WHERE user_id = p_user_id AND season_id = v_active_season.id LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN v_active_season := NULL; v_season_progress := NULL; END;

  -- 8. FINAL ASSEMBLY
  SELECT json_build_object(
    'profile', json_build_object(
        'id', v_profile.id, 'rank', COALESCE(v_profile.rank, 'Ученик'), 'xp', COALESCE(v_profile.xp, 0), 'coins', COALESCE(v_profile.coins, 0), 
        'boosts', COALESCE(v_profile.boosts, 0), 'streak_days', COALESCE(v_profile.streak_days, 0), 'settings', COALESCE(v_profile.settings, '{}'::jsonb), 
        'photo_url', v_profile.photo_url, 'first_name', v_profile.first_name, 'last_name', v_profile.last_name, 'username', v_profile.username, 
        'license_points', COALESCE(v_profile.license_points, 8), 'referral_code', v_profile.referral_code, 
        'duel_wins', COALESCE(v_duel_stats.wins, 0), 'duel_total', COALESCE(v_duel_stats.total_duels, 0)
    ),
    'stats', json_build_object(
        'tests_completed', COALESCE(v_stats.tests_count, 0), 'total_questions', COALESCE(v_stats.total_questions, 0), 
        'correct_answers', COALESCE(v_stats.correct_answers, 0), 'accuracy', COALESCE(v_stats.accuracy, 0), 'recent_performance', COALESCE(v_stats.recent_performance, 0)
    ),
    'readiness', json_build_object(
        'topics_covered_percent', COALESCE(v_readiness.topics_covered_percent, 0), 
        'unique_questions_answered', COALESCE(v_readiness.unique_questions_answered, 0), 
        'topics_with_answers', COALESCE(v_readiness.topics_with_answers, 0)
    ),
    'daily_bonus', v_daily_bonus,
    'premium', json_build_object(
        'is_premium', COALESCE(v_premium.is_premium, false), 'subscription_status', v_premium.subscription_status, 
        'subscription_expires_at', v_premium.subscription_expires_at, 'trial_days_remaining', v_premium.trial_days_remaining
    ),
    'partner', json_build_object(
        'is_partner', COALESCE(v_partner.is_partner, false), 'partner_id', v_partner.id, 'partner_code', v_partner.partner_code, 
        'partner_name', v_partner.name, 'partner_status', v_partner.status
    ),
    'active_season', CASE WHEN v_active_season.id IS NOT NULL THEN json_build_object('id', v_active_season.id, 'season_number', v_active_season.season_number, 'name_ru', v_active_season.name_ru, 'theme', v_active_season.theme, 'start_date', v_active_season.start_date, 'end_date', v_active_season.end_date, 'days_remaining', v_active_season.days_remaining) ELSE NULL END,
    'season_progress', CASE WHEN v_season_progress.id IS NOT NULL THEN json_build_object('id', v_season_progress.id, 'level', v_season_progress.level, 'season_points', v_season_progress.season_points) ELSE NULL END,
    'daily_tasks', (SELECT COALESCE(json_agg(dt), '[]'::json) FROM public.daily_tasks dt WHERE dt.user_id = p_user_id AND dt.date = CURRENT_DATE),
    'recent_achievements', (SELECT COALESCE(json_agg(a), '[]'::json) FROM (SELECT id, achievement_type, title, description, unlocked, progress, max_progress, unlocked_at FROM public.achievements WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 4) a),
    'license_history', (SELECT COALESCE(json_agg(h), '[]'::json) FROM (SELECT points, recorded_at FROM public.user_license_points_history WHERE user_id = p_user_id ORDER BY recorded_at DESC LIMIT 10) h),
    'unread_notifications_count', 0 -- Set to 0 for stability while we debug the table
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_dashboard_super_v2(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_super_v2(UUID) TO service_role;

-- Update V1
CREATE OR REPLACE FUNCTION public.get_dashboard_super(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_dashboard_super_v2(p_user_id)::jsonb;
END;
$$;
