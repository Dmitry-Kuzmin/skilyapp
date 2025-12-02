-- ============================================
-- ИСПРАВЛЕНИЕ: ALL Security warnings от Supabase Linter
-- 1. Search path для функций (WARN → OK)
-- 2. SECURITY INVOKER для views (ERROR → OK)
-- ============================================

-- ============================================
-- ЧАСТЬ 1: Search Path для всех функций
-- ============================================

-- 1. daily_bonus_unified_trigger
ALTER FUNCTION public.daily_bonus_unified_trigger()
SET search_path = public, pg_catalog;

-- 2. claim_daily_bonus_atomic
ALTER FUNCTION public.claim_daily_bonus_atomic(UUID, DATE, DATE)
SET search_path = public, pg_catalog;

-- 3. generate_mystery_box_reward
ALTER FUNCTION public.generate_mystery_box_reward(TEXT)
SET search_path = public, pg_catalog;

-- 4. buy_streak_freeze
ALTER FUNCTION public.buy_streak_freeze(UUID, INTEGER)
SET search_path = public, pg_catalog;

-- 5. sync_item_cache
ALTER FUNCTION public.sync_item_cache()
SET search_path = public, pg_catalog;

-- 6. sync_item_cache_on_delete
ALTER FUNCTION public.sync_item_cache_on_delete()
SET search_path = public, pg_catalog;

-- ============================================
-- ЧАСТЬ 2: Пересоздать views с SECURITY INVOKER
-- ============================================

-- Удаляем старые views
DROP VIEW IF EXISTS public.admin_daily_pulse CASCADE;
DROP VIEW IF EXISTS public.daily_bonus_metrics CASCADE;
DROP VIEW IF EXISTS public.freeze_usage_stats CASCADE;
DROP VIEW IF EXISTS public.streak_distribution CASCADE;
DROP VIEW IF EXISTS public.top_streakers CASCADE;
DROP VIEW IF EXISTS public.system_health_check CASCADE;

-- 1. Admin Daily Pulse
CREATE VIEW public.admin_daily_pulse 
WITH (security_invoker = true) AS
SELECT
  COUNT(*) FILTER (WHERE last_claimed_date = CURRENT_DATE) as claims_today,
  COUNT(*) FILTER (WHERE freeze_available > 0) as users_with_freeze,
  AVG(current_streak) as avg_streak,
  MAX(current_streak) as max_streak,
  COUNT(*) FILTER (WHERE last_claimed_date >= CURRENT_DATE - 7) as active_this_week,
  COUNT(*) FILTER (WHERE last_claimed_date < CURRENT_DATE - 1 AND current_streak >= 3) as at_risk_users,
  COUNT(*) FILTER (WHERE current_streak > 0) as total_active_users
FROM public.user_daily_bonus;

-- 2. Daily Bonus Metrics
CREATE VIEW public.daily_bonus_metrics 
WITH (security_invoker = true) AS
SELECT
  DATE(last_claimed_date) as date,
  COUNT(*) as total_claims,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(current_streak) as avg_streak,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_streak) as median_streak,
  MAX(current_streak) as max_streak,
  COUNT(*) FILTER (WHERE (current_streak - 1) % 7 + 1 = 1) as day_1_claims,
  COUNT(*) FILTER (WHERE (current_streak - 1) % 7 + 1 = 7) as day_7_claims,
  COUNT(*) FILTER (WHERE freeze_available > 0) as users_with_freeze,
  COUNT(*) FILTER (WHERE current_streak >= 7) as d7_plus,
  COUNT(*) FILTER (WHERE current_streak >= 30) as d30_plus
FROM public.user_daily_bonus
WHERE last_claimed_date >= CURRENT_DATE - 30
GROUP BY DATE(last_claimed_date)
ORDER BY date DESC;

-- 3. Freeze Usage Stats
CREATE VIEW public.freeze_usage_stats 
WITH (security_invoker = true) AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'streak_freeze_auto_used') as auto_used,
  AVG((metadata->>'streak_saved')::INTEGER) 
    FILTER (WHERE event_type = 'streak_freeze_auto_used') as avg_streak_saved,
  COUNT(*) FILTER (WHERE event_type = 'streak_lost') as streaks_lost,
  AVG((metadata->>'old_streak')::INTEGER) 
    FILTER (WHERE event_type = 'streak_lost') as avg_streak_lost
FROM public.user_events
WHERE event_type IN ('streak_freeze_auto_used', 'streak_lost')
  AND created_at >= CURRENT_DATE - 30
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 4. Streak Distribution
CREATE VIEW public.streak_distribution 
WITH (security_invoker = true) AS
SELECT
  CASE 
    WHEN current_streak = 0 THEN '0 (inactive)'
    WHEN current_streak BETWEEN 1 AND 3 THEN '1-3 days'
    WHEN current_streak BETWEEN 4 AND 6 THEN '4-6 days'
    WHEN current_streak = 7 THEN '7 days (week)'
    WHEN current_streak BETWEEN 8 AND 13 THEN '8-13 days'
    WHEN current_streak BETWEEN 14 AND 29 THEN '14-29 days'
    WHEN current_streak BETWEEN 30 AND 59 THEN '30-59 days (month+)'
    WHEN current_streak BETWEEN 60 AND 89 THEN '60-89 days'
    ELSE '90+ days (legend)'
  END as streak_range,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.user_daily_bonus
GROUP BY 
  CASE 
    WHEN current_streak = 0 THEN '0 (inactive)'
    WHEN current_streak BETWEEN 1 AND 3 THEN '1-3 days'
    WHEN current_streak BETWEEN 4 AND 6 THEN '4-6 days'
    WHEN current_streak = 7 THEN '7 days (week)'
    WHEN current_streak BETWEEN 8 AND 13 THEN '8-13 days'
    WHEN current_streak BETWEEN 14 AND 29 THEN '14-29 days'
    WHEN current_streak BETWEEN 30 AND 59 THEN '30-59 days (month+)'
    WHEN current_streak BETWEEN 60 AND 89 THEN '60-89 days'
    ELSE '90+ days (legend)'
  END
ORDER BY MIN(current_streak);

-- 5. Top Streakers
CREATE VIEW public.top_streakers 
WITH (security_invoker = true) AS
SELECT
  udb.user_id,
  p.username,
  udb.current_streak,
  udb.total_claims,
  udb.last_claimed_date,
  LEAST(1.0 + (FLOOR(udb.current_streak / 7.0) * 0.05), 1.5) as streak_multiplier,
  COALESCE(udb.freeze_available, 0) as freeze_available,
  RANK() OVER (ORDER BY udb.current_streak DESC) as rank,
  CASE 
    WHEN udb.current_streak >= 365 THEN 'legendary'
    WHEN udb.current_streak >= 90 THEN 'diamond'
    WHEN udb.current_streak >= 30 THEN 'gold'
    WHEN udb.current_streak >= 14 THEN 'silver'
    WHEN udb.current_streak >= 7 THEN 'bronze'
    ELSE 'rookie'
  END as tier
FROM public.user_daily_bonus udb
LEFT JOIN public.profiles p ON p.id = udb.user_id
WHERE udb.current_streak > 0
ORDER BY udb.current_streak DESC
LIMIT 100;

-- 6. System Health Check
CREATE VIEW public.system_health_check 
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.user_daily_bonus WHERE last_claimed_date = CURRENT_DATE) as claims_today,
  (SELECT AVG(current_streak) FROM public.user_daily_bonus WHERE current_streak > 0) as avg_active_streak,
  (SELECT COUNT(*) FROM public.user_daily_bonus WHERE last_claimed_date = CURRENT_DATE - 1) as claims_yesterday,
  (SELECT COUNT(*) FROM public.user_events WHERE event_type = 'streak_lost' AND created_at >= CURRENT_DATE) as streaks_lost_today,
  (SELECT COUNT(*) FROM public.user_events WHERE event_type = 'streak_freeze_auto_used' AND created_at >= CURRENT_DATE) as freezes_used_today,
  ROUND(
    100.0 * (SELECT COUNT(*) FROM user_daily_bonus WHERE last_claimed_date = CURRENT_DATE) / 
    NULLIF((SELECT COUNT(*) FROM user_daily_bonus WHERE last_claimed_date = CURRENT_DATE - 1), 0) - 100, 
    2
  ) as growth_rate_percent;

-- ============================================
-- Комментарии
-- ============================================

COMMENT ON VIEW public.admin_daily_pulse IS 
  'Ежедневный пульс системы (SECURITY INVOKER для безопасности)';

COMMENT ON VIEW public.daily_bonus_metrics IS 
  'Детализированная статистика (SECURITY INVOKER)';

COMMENT ON VIEW public.freeze_usage_stats IS 
  'Статистика freeze (SECURITY INVOKER)';

COMMENT ON VIEW public.streak_distribution IS 
  'Распределение пользователей (SECURITY INVOKER)';

COMMENT ON VIEW public.top_streakers IS 
  'Топ-100 стрикеры (SECURITY INVOKER)';

COMMENT ON VIEW public.system_health_check IS 
  'Health check (SECURITY INVOKER)';

-- ============================================
-- Права доступа
-- ============================================

GRANT SELECT ON public.admin_daily_pulse TO service_role;
GRANT SELECT ON public.daily_bonus_metrics TO service_role;
GRANT SELECT ON public.freeze_usage_stats TO service_role;
GRANT SELECT ON public.streak_distribution TO service_role;
GRANT SELECT ON public.top_streakers TO authenticated;
GRANT SELECT ON public.system_health_check TO service_role;

