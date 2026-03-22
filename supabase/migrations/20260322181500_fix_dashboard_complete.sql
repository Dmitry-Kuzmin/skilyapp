-- Migration: Fix Dashboard Completeness & Duel Score
-- Description: 
-- 1. Updates get_dashboard_super_v2 to include Duel Stats (wins, total_duels)
-- 2. Makes active_season selection more robust
-- 3. Ensures all profile fields are returned
-- 4. Grants execute to public roles

-- 1. Create or replace get_dashboard_super_v2 with Duel Stats and Robust Season selection
CREATE OR REPLACE FUNCTION public.get_dashboard_super_v2(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile JSONB;
  v_stats JSONB;
  v_readiness JSONB;
  v_daily_bonus JSONB;
  v_premium JSONB;
  v_partner JSONB;
  v_active_season JSONB;
  v_season_progress JSONB;
  v_duel_stats JSONB;
  v_last_decay DATE;
  v_last_active DATE;
  v_days_missed INTEGER;
  v_decay_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 0. LICENSE AUTOMATION (Point Decay & Daily Login)
  SELECT last_daily_point_at, last_decay_at INTO v_last_active, v_last_decay 
  FROM public.profiles WHERE id = p_user_id;

  -- Decay check (48h inactivity)
  IF v_last_active IS NOT NULL AND (CURRENT_DATE - v_last_active) >= 2 
     AND (v_last_decay IS NULL OR v_last_decay < CURRENT_DATE) THEN
      
      -- We subtract 1 point for every 24h over 48h limit
      v_days_missed := (CURRENT_DATE - v_last_active) - 1;
      v_days_missed := LEAST(v_days_missed, 3); -- Max 3 penalty at once
      
      FOR i IN 1..v_days_missed LOOP
          -- Calculation for specific missed day
          v_decay_date := (v_last_active + (i + 1) * INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
          PERFORM public.process_license_event(p_user_id, 'inactivity_decay', v_decay_date);
      END LOOP;
      
      UPDATE public.profiles SET last_decay_at = CURRENT_DATE WHERE id = p_user_id;
  END IF;

  -- Today's entry (always call to update activity date and give daily point if needed)
  PERFORM public.process_license_event(p_user_id, 'daily_login');

  -- 1. MAIN DATA: Profile with license_points
  SELECT to_jsonb(p) INTO v_profile FROM (
    SELECT id, rank, xp, coins, boosts, streak_days, settings, subscription_status, subscription_expires_at, photo_url, first_name, last_name, username, license_points, referral_code
    FROM public.profiles WHERE id = p_user_id
  ) p;
  
  IF v_profile IS NULL THEN RETURN json_build_object('error', 'Profile not found'); END IF;

  -- 2. STATS: Tests and Accuracy
  SELECT to_jsonb(s) INTO v_stats FROM (
    WITH sessions AS (SELECT COUNT(*) as tests_count, COALESCE(SUM(total_questions), 0) as total_qs, COALESCE(SUM(score), 0) as correct_qs FROM public.game_sessions WHERE user_id = p_user_id AND game_type IN ('test_exam', 'test_practice')),
         progress AS (SELECT COUNT(*) FILTER (WHERE is_answered = true) as answered_count, COUNT(*) FILTER (WHERE is_answered = true AND is_correct = true) as correct_count FROM public.user_progress WHERE user_id = p_user_id),
         recent_sessions AS (SELECT COALESCE(AVG(CAST(score AS FLOAT) / NULLIF(total_questions, 0) * 100), 0) as recent_performance FROM (SELECT score, total_questions FROM public.game_sessions WHERE user_id = p_user_id AND game_type IN ('test_exam', 'test_practice') ORDER BY created_at DESC LIMIT 5) recent)
    SELECT s.tests_count, s.total_qs + COALESCE(p.answered_count, 0) as total_questions, s.correct_qs + COALESCE(p.correct_count, 0) as correct_answers,
      CASE WHEN (s.total_qs + COALESCE(p.answered_count, 0)) > 0 THEN LEAST(100, ROUND((s.correct_qs + COALESCE(p.correct_count, 0))::NUMERIC / (s.total_qs + COALESCE(p.answered_count, 0)) * 100, 1)) ELSE 0 END as accuracy, COALESCE(rs.recent_performance, 100) as recent_performance
    FROM sessions s CROSS JOIN progress p CROSS JOIN recent_sessions rs
  ) s;

  -- 3. READINESS
  SELECT to_jsonb(r) INTO v_readiness FROM (
    WITH topic_progress AS (SELECT COUNT(DISTINCT t.id) as total_topics, COUNT(DISTINCT CASE WHEN utp.completed = true THEN t.id END) as completed_topics FROM public.topics t LEFT JOIN public.user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = p_user_id),
         question_stats AS (SELECT COUNT(DISTINCT up.question_id) as unique_questions, COUNT(DISTINCT qn.topic_id) as topics_with_answers FROM public.user_progress up INNER JOIN public.questions_new qn ON qn.id = up.question_id WHERE up.user_id = p_user_id AND up.is_answered = true)
    SELECT CASE WHEN tp.total_topics > 0 THEN ROUND((tp.completed_topics::NUMERIC / tp.total_topics) * 100, 1) ELSE 0 END as topics_covered_percent, COALESCE(qs.unique_questions, 0) as unique_questions_answered, COALESCE(qs.topics_with_answers, 0) as topics_with_answers
    FROM topic_progress tp CROSS JOIN question_stats qs
  ) r;

  -- 4. DAILY BONUS
  SELECT to_jsonb(db) INTO v_daily_bonus FROM (
    SELECT id, COALESCE(current_streak, 0) as current_streak, last_claimed_date, COALESCE(total_claims, 0) as total_claims,
           CASE WHEN last_claimed_date IS NULL OR last_claimed_date < CURRENT_DATE THEN true ELSE false END as can_claim
    FROM public.user_daily_bonus WHERE user_id = p_user_id LIMIT 1
  ) db;
  IF v_daily_bonus IS NULL THEN v_daily_bonus := jsonb_build_object('id', NULL, 'current_streak', 0, 'last_claimed_date', NULL, 'total_claims', 0, 'can_claim', true); END IF;

  -- 5. PREMIUM
  SELECT to_jsonb(pr) INTO v_premium FROM (
    SELECT subscription_status, subscription_expires_at, 
           CASE WHEN subscription_status IN ('active', 'trial', 'pro') AND (subscription_expires_at > NOW() OR subscription_expires_at IS NULL) THEN true ELSE false END as is_premium, 
           CASE WHEN subscription_status = 'trial' THEN GREATEST(0, EXTRACT(DAY FROM (subscription_expires_at - NOW()))::INTEGER) ELSE NULL END as trial_days_remaining 
    FROM public.profiles WHERE id = p_user_id
  ) pr;

  -- 6. PARTNER
  SELECT to_jsonb(pt) INTO v_partner FROM (
    SELECT id as partner_id, partner_code, name as partner_name, status as partner_status, true as is_partner FROM public.partners WHERE user_id = p_user_id LIMIT 1
  ) pt;

  -- 7. DUEL STATS (For the widget & License Card)
  SELECT to_jsonb(ds) INTO v_duel_stats FROM (
    SELECT total_duels, wins, (total_duels - wins) as losses
    FROM public.duel_stats WHERE user_id = p_user_id LIMIT 1
  ) ds;
  IF v_duel_stats IS NULL THEN v_duel_stats := jsonb_build_object('total_duels', 0, 'wins', 0, 'losses', 0); END IF;

  -- 8. ACTIVE SEASON (Robust)
  SELECT to_jsonb(asn) INTO v_active_season FROM (
    SELECT id, season_number, name_ru, name_es, name_en, theme, start_date, end_date, GREATEST(0, EXTRACT(EPOCH FROM (end_date - CURRENT_TIMESTAMP))::INTEGER / 86400)::INTEGER as days_remaining 
    FROM public.duel_pass_seasons 
    WHERE (is_active = true OR (start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP))
    ORDER BY is_active DESC, season_number DESC LIMIT 1
  ) asn;
  
  -- 9. SEASON PROGRESS
  IF v_active_season IS NOT NULL THEN 
    SELECT to_jsonb(usp) INTO v_season_progress FROM public.user_season_progress usp WHERE usp.user_id = p_user_id AND usp.season_id = (v_active_season->>'id')::INTEGER LIMIT 1; 
  END IF;

  -- 10. FINAL ASSEMBLY
  RETURN json_build_object(
    'profile', json_build_object(
        'id', v_profile->>'id', 
        'rank', COALESCE(v_profile->>'rank', 'Ученик'), 
        'xp', COALESCE((v_profile->>'xp')::INTEGER, 0), 
        'coins', COALESCE((v_profile->>'coins')::INTEGER, 0), 
        'boosts', COALESCE((v_profile->>'boosts')::INTEGER, 0), 
        'streak_days', COALESCE((v_profile->>'streak_days')::INTEGER, 0), 
        'settings', COALESCE(v_profile->'settings', '{}'::jsonb), 
        'photo_url', v_profile->>'photo_url', 
        'first_name', v_profile->>'first_name', 
        'last_name', v_profile->>'last_name', 
        'username', v_profile->>'username', 
        'license_points', COALESCE((v_profile->>'license_points')::INTEGER, 8),
        'referral_code', v_profile->>'referral_code',
        'duel_wins', (v_duel_stats->>'wins')::INTEGER,
        'duel_total', (v_duel_stats->>'total_duels')::INTEGER
    ),
    'stats', v_stats,
    'readiness', v_readiness,
    'daily_bonus', v_daily_bonus,
    'premium', v_premium,
    'partner', COALESCE(v_partner, jsonb_build_object('is_partner', false)),
    'daily_tasks', (SELECT COALESCE(json_agg(dt), '[]'::json) FROM public.daily_tasks dt WHERE dt.user_id = p_user_id AND dt.date = CURRENT_DATE),
    'recent_achievements', (SELECT COALESCE(json_agg(a), '[]'::json) FROM (SELECT id, achievement_type, title, description, unlocked, progress, max_progress, unlocked_at FROM public.achievements WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 4) a),
    'daily_bonus_definitions', (SELECT COALESCE(json_agg(dbd), '[]'::json) FROM (SELECT day_number, reward, description FROM public.daily_bonus_def ORDER BY day_number LIMIT 7) dbd),
    'active_season', v_active_season,
    'season_progress', v_season_progress,
    'license_history', (SELECT COALESCE(json_agg(h), '[]'::json) FROM (SELECT points, recorded_at FROM public.user_license_points_history WHERE user_id = p_user_id ORDER BY recorded_at DESC LIMIT 10) h),
    'license_audit', (SELECT COALESCE(json_agg(a), '[]'::json) FROM (SELECT delta, event_type, created_at FROM public.user_license_points_audit WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 10) a),
    'unread_notifications_count', COALESCE((SELECT count(*)::INTEGER FROM public.duel_notifications WHERE user_id = p_user_id AND is_read = false), 0)
  );
END;
$$;

-- Grant execute to public roles
GRANT EXECUTE ON FUNCTION public.get_dashboard_super_v2(UUID) TO authenticated, anon;

-- Update V1 too for safety
CREATE OR REPLACE FUNCTION public.get_dashboard_super(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- We just route it to V2 but cast back to JSONB as required by V1 signature
  RETURN public.get_dashboard_super_v2(p_user_id)::jsonb;
END;
$function$;
