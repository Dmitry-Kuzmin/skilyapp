-- Fix for get_dashboard_super referencing non-existent 'correct_answers' column in game_sessions
-- Replaces correct_answers with score (assuming score holds the correct answers count)

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_super(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_profile RECORD;
  v_stats RECORD;
  v_readiness RECORD;
  v_daily_bonus RECORD;
  v_premium RECORD;
  v_partner RECORD;
BEGIN
  -- 1. Профиль
  SELECT id, rank, xp, coins, boosts, streak_days, settings, photo_url, first_name, last_name, username
  INTO v_profile FROM profiles WHERE id = p_user_id;

  -- 2. Статистика
  -- FIX: Changed correct_answers to score
  SELECT 
    COUNT(*) as tests_count, 
    SUM(total_questions) as total_questions, 
    SUM(score) as correct_answers,
    CASE WHEN SUM(total_questions) > 0 THEN ROUND((SUM(score)::DECIMAL / SUM(total_questions)::DECIMAL) * 100) ELSE 0 END as accuracy,
    0 as recent_performance
  INTO v_stats FROM game_sessions WHERE user_id = p_user_id;

  -- 3. Готовность (упрощенно)
  SELECT 0 as topics_covered_percent, 0 as unique_questions_answered, 0 as topics_with_answers
  INTO v_readiness;

  -- 4. Ежедневный бонус
  SELECT udb.id, COALESCE(udb.current_streak, 0) as current_streak, udb.last_claimed_date, COALESCE(udb.total_claims, 0) as total_claims,
    CASE WHEN udb.last_claimed_date IS NULL OR udb.last_claimed_date < CURRENT_DATE THEN true ELSE false END as can_claim
  INTO v_daily_bonus FROM user_daily_bonus udb WHERE udb.user_id = p_user_id LIMIT 1;
  IF v_daily_bonus.id IS NULL THEN v_daily_bonus := ROW(NULL, 0, NULL, 0, true); END IF;

  -- 5. Premium
  SELECT subscription_status, subscription_expires_at,
    CASE WHEN subscription_status IN ('active', 'trial') AND subscription_expires_at > NOW() THEN true ELSE false END as is_premium,
    CASE WHEN subscription_status = 'trial' THEN GREATEST(0, EXTRACT(DAY FROM (subscription_expires_at - NOW()))::INTEGER) ELSE NULL END as trial_days_remaining
  INTO v_premium FROM profiles WHERE id = p_user_id;

  -- 6. Partner
  SELECT p.id, p.partner_code, p.name, p.status, CASE WHEN p.id IS NOT NULL THEN true ELSE false END as is_partner
  INTO v_partner FROM partners p WHERE p.user_id = p_user_id LIMIT 1;

  -- 7. Сборка JSON (Базовая версия)
  SELECT json_build_object(
    'profile', json_build_object('id', v_profile.id, 'xp', COALESCE(v_profile.xp, 0), 'coins', COALESCE(v_profile.coins, 0)),
    'stats', json_build_object('tests_completed', COALESCE(v_stats.tests_count, 0)),
    'readiness', json_build_object('topics_covered_percent', COALESCE(v_readiness.topics_covered_percent, 0)),
    'daily_bonus', json_build_object('current_streak', v_daily_bonus.current_streak, 'can_claim', v_daily_bonus.can_claim),
    'premium', json_build_object('is_premium', COALESCE(v_premium.is_premium, false)),
    'partner', json_build_object('is_partner', COALESCE(v_partner.is_partner, false))
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

COMMIT;
