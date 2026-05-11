-- Add has_used_trial flag to premium JSON in get_dashboard_super_v3.
-- trial_until IS NOT NULL means the user has ever activated a trial (even if expired/cancelled).
-- This prevents showing the trial offer to users who already used it.

CREATE OR REPLACE FUNCTION public.get_dashboard_super_v3(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_stats RECORD;
  v_topic_summary RECORD;
  v_readiness RECORD;
  v_premium RECORD;
  v_partner RECORD;
  v_active_season RECORD;
  v_season_progress RECORD;
  v_duel_stats RECORD;
  v_mistakes_count INTEGER;
  v_total_in_bank INTEGER;
  v_last_active DATE;
  v_last_decay DATE;
  v_days_missed INTEGER;
  v_check_date DATE;
  v_decay_date TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- 1. Daily login bonus + inactivity decay (same as v2)
  BEGIN
    SELECT last_daily_point_at, last_decay_at INTO v_last_active, v_last_decay
    FROM public.profiles WHERE id = p_user_id;

    IF v_last_active IS NOT NULL AND (CURRENT_DATE - v_last_active) >= 2
       AND (v_last_decay IS NULL OR v_last_decay < CURRENT_DATE) THEN
        v_days_missed := LEAST((CURRENT_DATE - v_last_active) - 1, 3);
        FOR i IN 1..v_days_missed LOOP
            v_check_date := v_last_active + (i * INTERVAL '1 day');
            DELETE FROM public.user_license_points_audit
            WHERE user_id = p_user_id AND created_at::date = v_check_date AND event_type = 'inactivity_decay';
            v_decay_date := v_check_date::timestamp + INTERVAL '12 hours';
            PERFORM public.process_license_event(p_user_id, 'inactivity_decay', v_decay_date);
        END LOOP;
        UPDATE public.profiles SET last_decay_at = CURRENT_DATE WHERE id = p_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.user_license_points_audit
                   WHERE user_id = p_user_id AND event_type = 'daily_login'
                   AND created_at::date = CURRENT_DATE) THEN
        PERFORM public.process_license_event(p_user_id, 'daily_login', NOW());
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING '[Points logic fail]: %', SQLERRM; END;

  -- 2. Profile
  SELECT id, rank, xp, coins, boosts, streak_days, settings, subscription_status,
         subscription_expires_at, subscription_type, premium_forever_purchased_at,
         photo_url, first_name, last_name, username, license_points, referral_code
  INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- 3. Stats (ALL skill metrics in one CTE chain — single round-trip)
  WITH
  qp AS (
    SELECT
      COUNT(*)                                                          AS total_attempts,
      COUNT(*) FILTER (WHERE is_correct)                                AS correct_attempts,
      COUNT(DISTINCT question_id)                                       AS unique_qs,
      COUNT(DISTINCT question_id) FILTER (WHERE is_correct)             AS unique_correct_qs,
      MAX(last_attempt_at)                                              AS last_active_at,
      COUNT(*) FILTER (WHERE last_attempt_at > NOW() - INTERVAL '7 days') AS attempts_last_7d
    FROM public.user_progress
    WHERE user_id = p_user_id AND is_answered = true
  ),
  recent AS (
    SELECT
      COUNT(*)                                AS r_n,
      COUNT(*) FILTER (WHERE is_correct)      AS r_correct
    FROM (
      SELECT is_correct
      FROM public.user_progress
      WHERE user_id = p_user_id AND is_answered = true
      ORDER BY last_attempt_at DESC NULLS LAST
      LIMIT 50
    ) s
  ),
  sess AS (
    SELECT COUNT(*) AS tests_count
    FROM public.game_sessions
    WHERE user_id = p_user_id
      AND game_type IN ('test_exam', 'test_practice', 'test_sequential',
                        'test_module', 'test_marathon', 'test_nonstop', 'test_traps')
      AND total_questions > 0
  )
  SELECT
    sess.tests_count                                                   AS tests_completed,
    qp.total_attempts                                                  AS lifetime_attempts,
    qp.correct_attempts                                                AS lifetime_correct,
    CASE WHEN qp.total_attempts > 0
         THEN ROUND(qp.correct_attempts::numeric / qp.total_attempts * 100, 1)
         ELSE 0 END                                                    AS lifetime_accuracy,
    CASE WHEN recent.r_n > 0
         THEN ROUND(recent.r_correct::numeric / recent.r_n * 100, 1)
         ELSE NULL END                                                 AS recent_accuracy,
    recent.r_n                                                         AS recent_sample,
    qp.unique_qs                                                       AS unique_questions,
    qp.unique_correct_qs                                               AS unique_correct,
    qp.last_active_at,
    qp.attempts_last_7d
  INTO v_stats FROM qp, recent, sess;

  -- 4. Topic-level skill (weak topics, hard topics mastered, worst topic, coverage)
  WITH topic_acc AS (
    SELECT qn.topic_id,
           COUNT(*)                              AS n,
           COUNT(*) FILTER (WHERE up.is_correct) AS c
    FROM public.user_progress up
    JOIN public.questions_new qn ON qn.id = up.question_id
    WHERE up.user_id = p_user_id AND up.is_answered = true
    GROUP BY qn.topic_id
  ),
  tp AS (
    SELECT COUNT(DISTINCT id) AS tot
    FROM public.topics
  )
  SELECT
    COUNT(*) FILTER (WHERE ta.n >= 5 AND ta.c::numeric / ta.n >= 0.80)::int AS hard_topics_mastered,
    COUNT(*) FILTER (WHERE ta.n >= 5 AND ta.c::numeric / ta.n  < 0.60)::int AS weak_topics_count,
    MIN(CASE WHEN ta.n >= 10 THEN ta.c::numeric / ta.n END)                 AS worst_topic_acc,
    CASE WHEN tp.tot > 0
         THEN ROUND(COUNT(*) FILTER (WHERE ta.n >= 5)::numeric / tp.tot * 100, 1)
         ELSE 0 END                                                         AS topics_covered_percent,
    COUNT(ta.topic_id)::int                                                 AS topics_with_answers
  INTO v_topic_summary
  FROM topic_acc ta RIGHT JOIN tp ON true
  GROUP BY tp.tot;

  -- 5. Bank size (for coverage display)
  SELECT COUNT(*)::int INTO v_total_in_bank FROM public.questions_new;

  -- 6. Mistakes (folded in — was a client-side query)
  SELECT COUNT(*)::int INTO v_mistakes_count
  FROM public.user_challenge_questions
  WHERE user_id = p_user_id AND mastered = false;

  -- 7. Duel stats (folded in — was a client-side query)
  SELECT total_duels, wins
  INTO v_duel_stats
  FROM public.duel_stats WHERE user_id = p_user_id LIMIT 1;

  -- 8. Active season (Duel Pass)
  SELECT id, season_number, name_ru, name_es, name_en, theme, start_date, end_date,
         GREATEST(0, EXTRACT(EPOCH FROM (end_date - CURRENT_TIMESTAMP))::INTEGER / 86400)::INTEGER as dr
  INTO v_active_season
  FROM public.duel_pass_seasons
  WHERE is_active = true OR (start_date <= NOW() AND end_date >= NOW())
  ORDER BY is_active DESC LIMIT 1;

  IF v_active_season.id IS NOT NULL THEN
    SELECT id, level, season_points, premium_pass_purchased
    INTO v_season_progress
    FROM public.user_season_progress
    WHERE user_id = p_user_id AND season_id = v_active_season.id
    LIMIT 1;
  END IF;

  -- 9. Premium / partner
  -- trial is only active if trial_until > NOW().
  -- has_used_trial = trial_until IS NOT NULL (user ever activated trial, even if expired/cancelled).
  SELECT subscription_status, subscription_expires_at, trial_until,
         (
           (subscription_status IN ('active', 'pro') AND (subscription_expires_at > NOW() OR subscription_expires_at IS NULL))
           OR (subscription_status = 'trial' AND trial_until IS NOT NULL AND trial_until > NOW())
           OR subscription_status = 'lifetime'
         ) as isp,
         (trial_until IS NOT NULL) as has_used_trial
  INTO v_premium FROM public.profiles WHERE id = p_user_id;

  SELECT id, partner_code, name, status, true as is_partner
  INTO v_partner FROM public.partners WHERE user_id = p_user_id LIMIT 1;

  -- 10. Final JSON
  SELECT json_build_object(
    'profile', json_build_object(
      'id', v_profile.id, 'rank', v_profile.rank, 'xp', v_profile.xp,
      'coins', v_profile.coins, 'boosts', v_profile.boosts, 'streak_days', v_profile.streak_days,
      'settings', v_profile.settings, 'photo_url', v_profile.photo_url,
      'first_name', v_profile.first_name, 'last_name', v_profile.last_name,
      'username', v_profile.username, 'license_points', v_profile.license_points,
      'referral_code', v_profile.referral_code,
      'duel_wins', COALESCE(v_duel_stats.wins, 0),
      'duel_total', COALESCE(v_duel_stats.total_duels, 0)
    ),
    'stats', json_build_object(
      'tests_completed',     COALESCE(v_stats.tests_completed, 0),
      'lifetime_attempts',   COALESCE(v_stats.lifetime_attempts, 0),
      'lifetime_correct',    COALESCE(v_stats.lifetime_correct, 0),
      'accuracy',            COALESCE(v_stats.lifetime_accuracy, 0),
      'recent_accuracy',     v_stats.recent_accuracy,
      'recent_sample',       COALESCE(v_stats.recent_sample, 0),
      'unique_questions',    COALESCE(v_stats.unique_questions, 0),
      'unique_correct',      COALESCE(v_stats.unique_correct, 0),
      'total_in_bank',       v_total_in_bank,
      'last_active_at',      v_stats.last_active_at,
      'attempts_last_7d',    COALESCE(v_stats.attempts_last_7d, 0),
      'total_questions',     COALESCE(v_stats.lifetime_attempts, 0),
      'correct_answers',     COALESCE(v_stats.lifetime_correct, 0)
    ),
    'readiness', json_build_object(
      'topics_covered_percent',    COALESCE(v_topic_summary.topics_covered_percent, 0),
      'topics_with_answers',       COALESCE(v_topic_summary.topics_with_answers, 0),
      'hard_topics_mastered',      COALESCE(v_topic_summary.hard_topics_mastered, 0),
      'weak_topics_count',         COALESCE(v_topic_summary.weak_topics_count, 0),
      'worst_topic_acc',           v_topic_summary.worst_topic_acc,
      'unique_questions_answered', COALESCE(v_stats.unique_questions, 0)
    ),
    'duels', json_build_object(
      'total',   COALESCE(v_duel_stats.total_duels, 0),
      'wins',    COALESCE(v_duel_stats.wins, 0),
      'winrate', CASE WHEN COALESCE(v_duel_stats.total_duels, 0) > 0
                      THEN ROUND(v_duel_stats.wins::numeric / v_duel_stats.total_duels * 100)::int
                      ELSE 0 END
    ),
    'mistakes_count', v_mistakes_count,
    'daily_bonus', (
      SELECT json_build_object('id', id, 'current_streak', current_streak, 'can_claim', true)
      FROM public.user_daily_bonus WHERE user_id = p_user_id LIMIT 1
    ),
    'premium', json_build_object(
      'is_premium',            v_premium.isp,
      'subscription_status',   v_premium.subscription_status,
      'subscription_expires_at', v_premium.subscription_expires_at,
      'subscription_end_date', COALESCE(v_premium.trial_until, v_premium.subscription_expires_at),
      'has_used_trial',        v_premium.has_used_trial
    ),
    'partner', to_jsonb(v_partner),
    'active_season', CASE WHEN v_active_season.id IS NOT NULL THEN json_build_object(
      'id', v_active_season.id,
      'season_number', v_active_season.season_number,
      'name_ru', v_active_season.name_ru,
      'name_es', v_active_season.name_es,
      'name_en', v_active_season.name_en,
      'theme', v_active_season.theme,
      'start_date', v_active_season.start_date,
      'end_date', v_active_season.end_date,
      'days_remaining', v_active_season.dr
    ) ELSE NULL END,
    'season_progress', CASE WHEN v_season_progress.id IS NOT NULL THEN json_build_object(
      'id', v_season_progress.id,
      'level', v_season_progress.level,
      'season_points', v_season_progress.season_points,
      'premium_pass_purchased', COALESCE(v_season_progress.premium_pass_purchased, false)
    ) ELSE NULL END,
    'season_rewards', CASE WHEN v_active_season.id IS NOT NULL THEN (
      SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.level), '[]'::json)
      FROM public.duel_pass_season_rewards r
      WHERE r.season_id = v_active_season.id
    ) ELSE '[]'::json END,
    'claimed_season_records', CASE WHEN v_active_season.id IS NOT NULL THEN (
      SELECT COALESCE(json_agg(json_build_object('level', ucr.level, 'is_premium', ucr.is_premium)), '[]'::json)
      FROM public.user_claimed_rewards ucr
      WHERE ucr.user_id = p_user_id AND ucr.season = v_active_season.season_number
    ) ELSE '[]'::json END,
    'has_premium_forever', (
      v_profile.premium_forever_purchased_at IS NOT NULL
      AND v_profile.subscription_type = 'lifetime'
      AND v_profile.subscription_status = 'pro'
    ),
    'license_audit', (
      SELECT COALESCE(json_agg(a), '[]'::json)
      FROM (
        SELECT delta, event_type, created_at
        FROM public.user_license_points_audit
        WHERE user_id = p_user_id
        ORDER BY created_at DESC LIMIT 10
      ) a
    ),
    'daily_tasks', (
      SELECT COALESCE(json_agg(dt), '[]'::json)
      FROM public.daily_tasks dt
      WHERE dt.user_id = p_user_id AND dt.date = CURRENT_DATE
    ),
    'daily_bonus_definitions', (
      SELECT COALESCE(json_agg(dbd), '[]'::json)
      FROM (SELECT day_number, reward, description FROM public.daily_bonus_def ORDER BY day_number LIMIT 7) dbd
    ),
    'unread_notifications_count', 0
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
