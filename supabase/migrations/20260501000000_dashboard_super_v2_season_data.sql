-- Migration: Add season_rewards, claimed_season_records, has_premium_forever to get_dashboard_super_v2
-- This eliminates 3 extra DB queries made by the DuelPass modal on every open.

CREATE OR REPLACE FUNCTION public.get_dashboard_super_v2(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_duel_stats RECORD;
  v_last_active DATE;
  v_last_decay DATE;
  v_days_missed INTEGER;
  v_check_date DATE;
  v_decay_date TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- 1. ЛОГИКА ШТРАФОВ И БОНУСОВ
  BEGIN
    SELECT last_daily_point_at, last_decay_at INTO v_last_active, v_last_decay FROM public.profiles WHERE id = p_user_id;

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

    IF NOT EXISTS (SELECT 1 FROM public.user_license_points_audit WHERE user_id = p_user_id AND event_type = 'daily_login' AND created_at::date = CURRENT_DATE) THEN
        PERFORM public.process_license_event(p_user_id, 'daily_login', NOW());
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING '[Points logic fail]: %', SQLERRM; END;

  -- 2. СБОР ВСЕХ ДАННЫХ
  -- Профиль (добавлены subscription_type + premium_forever_purchased_at для has_premium_forever)
  SELECT id, rank, xp, coins, boosts, streak_days, settings, subscription_status,
         subscription_expires_at, subscription_type, premium_forever_purchased_at,
         photo_url, first_name, last_name, username, license_points, referral_code
  INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- Статистика нейронки (readiness)
  WITH tp AS (
    SELECT COUNT(DISTINCT t.id) as tot,
           COUNT(DISTINCT CASE WHEN utp.completed = true THEN t.id END) as cmp
    FROM public.topics t
    LEFT JOIN public.user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = p_user_id
  ),
  qs AS (
    SELECT COUNT(DISTINCT up.question_id) as uq, COUNT(DISTINCT qn.topic_id) as tq
    FROM public.user_progress up
    INNER JOIN public.questions_new qn ON qn.id = up.question_id
    WHERE up.user_id = p_user_id AND up.is_answered = true
  )
  SELECT
    CASE WHEN tp.tot > 0 THEN ROUND((tp.cmp::NUMERIC / tp.tot) * 100, 1) ELSE 0 END as topics_covered_percent,
    COALESCE(qs.uq, 0) as unique_questions_answered,
    COALESCE(qs.tq, 0) as topics_with_answers
  INTO v_readiness FROM tp CROSS JOIN qs;

  -- Статистика тестов
  WITH s AS (
    SELECT COUNT(*) as cnt,
           COALESCE(SUM(total_questions), 0) as tq,
           COALESCE(SUM(score), 0) as cq
    FROM public.game_sessions
    WHERE user_id = p_user_id AND game_type IN ('test_exam', 'test_practice')
  )
  SELECT s.cnt as tests_completed, s.tq as total_questions, s.cq as correct_answers,
         CASE WHEN s.tq > 0 THEN LEAST(100, ROUND((s.cq::NUMERIC / s.tq) * 100, 1)) ELSE 0 END as accuracy
  INTO v_stats FROM s;

  -- Активный сезон (Duel Pass)
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

  -- Premium и прочее
  SELECT subscription_status, subscription_expires_at,
         (subscription_status IN ('active', 'trial', 'pro') AND (subscription_expires_at > NOW() OR subscription_expires_at IS NULL)) as isp
  INTO v_premium FROM public.profiles WHERE id = p_user_id;

  SELECT total_duels, wins INTO v_duel_stats FROM public.duel_stats WHERE user_id = p_user_id LIMIT 1;
  SELECT id, partner_code, name, status, true as is_partner INTO v_partner FROM public.partners WHERE user_id = p_user_id LIMIT 1;

  -- 3. ФИНАЛЬНЫЙ JSON
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
    'stats', to_jsonb(v_stats),
    'readiness', to_jsonb(v_readiness),
    'daily_bonus', (
      SELECT json_build_object('id', id, 'current_streak', current_streak, 'can_claim', true)
      FROM public.user_daily_bonus WHERE user_id = p_user_id LIMIT 1
    ),
    'premium', json_build_object(
      'is_premium', v_premium.isp,
      'subscription_status', v_premium.subscription_status,
      'subscription_expires_at', v_premium.subscription_expires_at
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
    -- NEW: season rewards and claimed records for DuelPass modal (eliminates 3 extra queries)
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
    -- NEW: has_premium_forever derived from profile (eliminates has_premium_forever RPC call)
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
$$;
