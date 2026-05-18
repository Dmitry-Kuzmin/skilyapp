-- Security lint fixes: RLS policies, storage listing, dangerous SECURITY DEFINER functions

-- ============================================================
-- 1. Fix RLS: admin tables had USING(true) WITH CHECK(true) for ALL
--    → keep SELECT for authenticated, restrict writes to service_role
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all" ON public.bot_reply_templates;
CREATE POLICY "authenticated_read" ON public.bot_reply_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_addons" ON public.course_addons;
CREATE POLICY "authenticated_read_addons" ON public.course_addons
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_plans" ON public.course_plans;
CREATE POLICY "authenticated_read_plans" ON public.course_plans
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 2. Fix Storage: remove broad listing policy on public buckets
--    Public buckets serve files by URL without a SELECT policy.
--    The broad SELECT only adds file listing — not needed.
-- ============================================================

DROP POLICY IF EXISTS "Allow Public Stories 13v9opf_1" ON storage.objects;

-- ============================================================
-- 3. Revoke EXECUTE from authenticated on admin/cron/dangerous functions
-- ============================================================

-- CRITICAL: arbitrary SQL execution
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;

-- CRITICAL: destroy all auth users
REVOKE EXECUTE ON FUNCTION public.delete_all_auth_users() FROM authenticated;

-- Admin: premium activation must go through payment flow
REVOKE EXECUTE ON FUNCTION public.activate_premium(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_partner_premium(text, uuid, text, text, text, inet, text) FROM authenticated;

-- Admin: uncapped coin manipulation
REVOKE EXECUTE ON FUNCTION public.add_coins(uuid, integer) FROM authenticated;

-- Admin: partner management
REVOKE EXECUTE ON FUNCTION public.add_partner_commission_to_hold(uuid, numeric, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enable_instructor_mode(uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_partner_premium(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_premium_keys_to_partner(uuid, integer, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_partner_payout(uuid, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_partner_commissions_from_hold() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_partner_premium(uuid, text) FROM authenticated;

-- Admin: fraud management
REVOKE EXECUTE ON FUNCTION public.add_to_fraud_blacklist(text, text, text, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_fraud_alert(uuid, text, text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_partner_fraud_patterns() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_fraud_alert(uuid, text, text, text) FROM authenticated;

-- Admin: app config
REVOKE EXECUTE ON FUNCTION public.update_app_config(text, jsonb, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_config(text, jsonb) FROM authenticated;

-- Admin: season management
REVOKE EXECUTE ON FUNCTION public.auto_distribute_season_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_transition_season() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_auto_distribute_season_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_distribute_season_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_log_ended_seasons() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.manual_check_seasons() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_season_for_rewards_distribution() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_ended_seasons() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rotate_daily_season_challenges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_season_rewards_processing(integer) FROM authenticated;

-- Admin: payment processing (server-side via Edge Functions only)
REVOKE EXECUTE ON FUNCTION public.process_stars_payment_rewards(uuid) FROM authenticated;

-- Admin: profile value with arbitrary column name (exploit vector)
REVOKE EXECUTE ON FUNCTION public.increment_profile_value(uuid, text, integer) FROM authenticated;

-- Cron: cleanup tasks
REVOKE EXECUTE ON FUNCTION public.aggregate_partner_stats_yesterday() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_old_conversions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_api_rate_log() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_boosts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_matchmaking() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_webauthn_challenges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_fraud_alerts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_old_duel_data() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_achievements_with_metrics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_achievements_with_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_all_duel_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_inactive_players() FROM authenticated;

-- Trigger functions (called by PostgreSQL, not by users)
REVOKE EXECUTE ON FUNCTION public.daily_bonus_unified_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_duel_amount_loss() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_duel_payout_atomic() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.on_game_session_activity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.on_season_end_check() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_auth_event_handler() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_cleanup_challenges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_loadouts_updated_at() FROM authenticated;
