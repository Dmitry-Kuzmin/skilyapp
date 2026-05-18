-- Revoke EXECUTE from authenticated role for admin/cron/trigger/Edge-Function-only SECURITY DEFINER functions.
-- User-facing functions (dashboard, gameplay, etc.) are intentionally left for authenticated users.

-- === ADMIN ONLY (privilege escalation risk) ===
REVOKE EXECUTE ON FUNCTION public.activate_premium(p_user_id uuid, p_days integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_coins(p_user_id uuid, p_amount integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_partner_commission_to_hold(p_partner_id uuid, p_amount numeric, p_purchase_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_to_fraud_blacklist(p_type text, p_value text, p_reason text, p_expires_days integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_transaction(p_user_id uuid, p_transaction_type text, p_amount integer, p_metadata jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_all_auth_users() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.exec_sql(sql text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_database_size() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pending_fraud_alerts(p_limit integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_profile_by_email(p_email text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_partner_premium(p_partner_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_random_loot(p_user_id uuid, p_loot_data jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_stats(p_user_id uuid, p_coins integer, p_xp integer, p_sp integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_value(p_profile_id uuid, p_column text, p_amount integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_value_safe(p_user_identifier uuid, p_column text, p_amount integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_premium_keys_to_partner(p_partner_id uuid, p_quantity integer, p_expires_months integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.link_telegram_to_user(_user_id uuid, _telegram_id bigint, _first_name text, _last_name text, _username text, _photo_url text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.manual_check_seasons() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_season_for_rewards_distribution() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.modify_boost_inventory(p_user_id uuid, p_boost_type text, p_change integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_duel_payout(p_duel_id uuid, p_winner_id uuid, p_loser_id uuid, p_is_draw boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_partner_payout(p_payout_id uuid, p_action text, p_admin_notes text, p_rejection_reason text, p_transaction_id text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_stars_payment_rewards(p_payment_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_fraud_alert(p_alert_id uuid, p_resolution text, p_resolution_notes text, p_action_taken text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_partner_premium(p_partner_id uuid, p_reason text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.send_referral_notification(p_referrer_id uuid, p_referred_name text, p_bonus_amount integer, p_notification_type text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_season_rewards_processing(p_season_id integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_config(config_key text, config_value jsonb, config_description text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_config(key_name text, value_json jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_license_points(user_id uuid, points_delta integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_achievement(p_user_id uuid, p_achievement_type text, p_progress_delta integer, p_set_absolute boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_rank(p_user_id uuid, p_season_id integer, p_force_update boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_duel_stats(p_user_id uuid, p_is_win boolean, p_is_draw boolean, p_score integer) FROM authenticated;

-- === CRON JOBS (internal maintenance, never user-triggered) ===
REVOKE EXECUTE ON FUNCTION public.aggregate_partner_stats_yesterday() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_old_conversions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_distribute_season_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_transition_season() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_unlock_duel_pass_for_premium() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_auto_distribute_season_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_distribute_season_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_log_ended_seasons() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_api_rate_log() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_boosts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_matchmaking() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_webauthn_challenges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_fraud_alerts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_old_duel_data() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_partner_fraud_patterns() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_ended_seasons() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_partner_commissions_from_hold() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rotate_daily_season_challenges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_achievements_with_metrics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_achievements_with_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_all_duel_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_inactive_players() FROM authenticated;

-- === TRIGGER FUNCTIONS (called by DB triggers, not via REST) ===
REVOKE EXECUTE ON FUNCTION public.async_check_fraud_patterns(p_conversion_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_add_host_to_duel_players() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.daily_bonus_unified_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_duel_amount_loss() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_duel_payout_atomic() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_user_achievements() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.on_game_session_activity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.on_season_end_check() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_async_fraud_check() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_auth_event_handler() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_cleanup_challenges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_daily_quest_progress(p_user_id uuid, p_category text, p_delta integer, p_set_absolute boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_loadouts_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_chat_member(p_chat_id bigint, p_chat_type text, p_chat_title text, p_telegram_id bigint, p_user_id uuid) FROM authenticated;
