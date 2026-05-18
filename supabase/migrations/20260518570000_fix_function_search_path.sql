-- Fix: set stable search_path on all public functions to prevent search_path injection
-- Lint: function_search_path_mutable (0011)

ALTER FUNCTION public.update_course_streams_updated_at()
  SET search_path = public;

ALTER FUNCTION public.auto_transition_season()
  SET search_path = public;

ALTER FUNCTION public.rotate_daily_season_challenges()
  SET search_path = public;

ALTER FUNCTION public.get_dashboard_super_v2(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.check_test_limit(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.grant_test_from_ad(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.is_user_premium_for_limits(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.start_premium_trial(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.get_weak_topics(p_profile_id uuid, p_limit integer)
  SET search_path = public;

ALTER FUNCTION public.claim_premium_daily_bonus(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.check_premium_daily_bonus(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.check_ai_usage_limit(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.increment_ai_usage(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.tstz_utc_date(ts timestamp with time zone)
  SET search_path = public;

ALTER FUNCTION public.process_license_event(p_user_id uuid, p_event_type text, p_custom_date timestamp with time zone)
  SET search_path = public;

ALTER FUNCTION public.grant_premium_access(p_user_id uuid, p_days integer)
  SET search_path = public;

ALTER FUNCTION public.get_user_leaderboard_position(p_user_id uuid, p_neighbors_count integer, p_filter_type text, p_filter_value text)
  SET search_path = public;
