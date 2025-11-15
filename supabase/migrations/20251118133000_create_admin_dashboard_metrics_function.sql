-- Function: get_admin_dashboard_metrics
-- Aggregates key counts to minimize client-side queries for admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Ensure only admins can call this function
  SELECT public.has_role(auth.uid(), 'admin') INTO is_admin;
  IF NOT COALESCE(is_admin, FALSE) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN jsonb_build_object(
    'topics',            (SELECT COUNT(*)::BIGINT FROM public.topics),
    'questions',         (SELECT COUNT(*)::BIGINT FROM public.questions_new),
    'users',             (SELECT COUNT(*)::BIGINT FROM public.profiles),
    'tags',              (SELECT COUNT(*)::BIGINT FROM public.tags),
    'materials',         COALESCE((SELECT COUNT(*)::BIGINT FROM public.materials), 0),
    'materialsDrafts',   COALESCE((SELECT COUNT(*)::BIGINT FROM public.materials WHERE NOT COALESCE(is_published, false)), 0),
    'activeDuels',       (SELECT COUNT(*)::BIGINT FROM public.duels WHERE status IN ('waiting', 'active') AND (expires_at IS NULL OR expires_at > now())),
    'duelsToday',        (SELECT COUNT(*)::BIGINT FROM public.duels WHERE created_at::DATE = CURRENT_DATE),
    'gameSessionsToday', (SELECT COUNT(*)::BIGINT FROM public.game_sessions WHERE created_at::DATE = CURRENT_DATE),
    'dailyBonusClaimsToday', (SELECT COUNT(*)::BIGINT FROM public.user_daily_bonus WHERE last_claimed_date = CURRENT_DATE),
    'telegramUsers',     (SELECT COUNT(*)::BIGINT FROM public.profiles WHERE telegram_id IS NOT NULL),
    'boostsInInventory', COALESCE((SELECT SUM(quantity)::BIGINT FROM public.boost_inventory), 0),
    'avgQuestionsPerTopic', COALESCE((
      SELECT ROUND(AVG(question_count)::numeric, 2)
      FROM (
        SELECT COUNT(*)::numeric AS question_count
        FROM public.questions_new
        WHERE topic_id IS NOT NULL
        GROUP BY topic_id
      ) AS per_topic
    ), 0),
    'dbSizeMb', (
      SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO service_role;

