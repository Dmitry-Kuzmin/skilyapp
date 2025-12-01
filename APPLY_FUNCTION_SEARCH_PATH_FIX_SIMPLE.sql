-- =====================================================
-- Fix Function Search Path Security Issues (SIMPLE VERSION)
-- =====================================================
-- Исправление предупреждений безопасности:
-- Все функции должны иметь SET search_path для защиты от SQL injection
-- через манипуляцию search_path
-- 
-- Эта версия использует DO блоки для безопасного изменения

-- =====================================================
-- Исправление функций без search_path
-- =====================================================

-- Boost functions
DO $$
BEGIN
  ALTER FUNCTION public.activate_temporary_boost(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function activate_temporary_boost(UUID, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_sp_multiplier(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_sp_multiplier(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.cleanup_expired_boosts() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function cleanup_expired_boosts() not found, skipping';
END $$;

-- Duel betting functions
DO $$
BEGIN
  ALTER FUNCTION public.calculate_duel_commission(INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function calculate_duel_commission(INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.process_duel_payout(UUID, UUID, UUID, BOOLEAN) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function process_duel_payout(UUID, UUID, UUID, BOOLEAN) not found, skipping';
END $$;

-- Referral functions
DO $$
BEGIN
  ALTER FUNCTION public.check_referral_milestone() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function check_referral_milestone() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.generate_referral_code() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function generate_referral_code() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.ensure_referral_codes() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function ensure_referral_codes() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.create_referral(TEXT, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function create_referral(TEXT, UUID) not found, skipping';
END $$;

-- Daily bonus functions
DO $$
BEGIN
  ALTER FUNCTION public.can_access_daily_bonus(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function can_access_daily_bonus(UUID) not found, skipping';
END $$;

-- Challenge functions
DO $$
BEGIN
  ALTER FUNCTION public.can_access_challenge_question(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function can_access_challenge_question(UUID) not found, skipping';
END $$;

-- Premium functions
DO $$
BEGIN
  ALTER FUNCTION public.auto_unlock_duel_pass_for_premium(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function auto_unlock_duel_pass_for_premium(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.has_premium_forever(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function has_premium_forever(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.generate_premium_key(TEXT, INTEGER, TIMESTAMPTZ) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function generate_premium_key(TEXT, INTEGER, TIMESTAMPTZ) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_premium_key(TEXT, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function activate_premium_key(TEXT, UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.should_purchase_duel_pass(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function should_purchase_duel_pass(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.issue_premium_keys_to_partner(UUID, INTEGER, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function issue_premium_keys_to_partner(UUID, INTEGER, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_partner_premium(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function activate_partner_premium(UUID, TEXT) not found, skipping';
END $$;

-- Question report functions
DO $$
BEGIN
  ALTER FUNCTION public.can_access_question_report(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function can_access_question_report(UUID) not found, skipping';
END $$;

-- Flashcard functions
DO $$
BEGIN
  ALTER FUNCTION public.update_user_flashcard_progress_updated_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_user_flashcard_progress_updated_at() not found, skipping';
END $$;

-- Cosmetics functions
DO $$
BEGIN
  ALTER FUNCTION public.get_random_sticker_from_pool(TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_random_sticker_from_pool(TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_random_loot(TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_random_loot(TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_seasonal_weekly_badge() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_seasonal_weekly_badge() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.grant_random_loot(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function grant_random_loot(UUID, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.can_access_cosmetics(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function can_access_cosmetics(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_skin(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function activate_skin(UUID, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.toggle_badge_display(UUID, TEXT, BOOLEAN) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function toggle_badge_display(UUID, TEXT, BOOLEAN) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.use_sticker(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function use_sticker(UUID, TEXT) not found, skipping';
END $$;

-- Device tracking functions
DO $$
BEGIN
  ALTER FUNCTION public.register_or_update_device(UUID, TEXT, TEXT, JSONB) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_or_update_device(UUID, TEXT, TEXT, JSONB) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.can_change_password(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function can_change_password(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.register_password_change(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_password_change(UUID, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function cleanup_expired_sessions() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_user_devices(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_user_devices(UUID) not found, skipping';
END $$;

-- User metrics functions
DO $$
BEGIN
  ALTER FUNCTION public.create_user_metrics_on_profile() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function create_user_metrics_on_profile() not found, skipping';
END $$;

-- Notification functions
DO $$
BEGIN
  ALTER FUNCTION public.update_notification_rule_timestamp() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_notification_rule_timestamp() not found, skipping';
END $$;

-- Challenge bank functions
DO $$
BEGIN
  ALTER FUNCTION public.get_challenge_bank_stats(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_challenge_bank_stats(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_challenge_bank_questions(UUID, INTEGER, BOOLEAN) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_challenge_bank_questions(UUID, INTEGER, BOOLEAN) not found, skipping';
END $$;

-- Generic update functions
DO $$
BEGIN
  ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_updated_at_column() not found, skipping';
END $$;

-- Partner functions
DO $$
BEGIN
  ALTER FUNCTION public.get_partner_dashboard(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_partner_dashboard(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_partner_link_stats(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_partner_link_stats(UUID, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_partner(TEXT, TEXT, TEXT, TEXT) not found, skipping';
END $$;

-- Race functions
DO $$
BEGIN
  ALTER FUNCTION public.update_race_sessions_updated_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_race_sessions_updated_at() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.finalize_race_session(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function finalize_race_session(UUID) not found, skipping';
END $$;

-- Bot functions
DO $$
BEGIN
  ALTER FUNCTION public.update_bot_tips_timestamp() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_bot_tips_timestamp() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_bot_guide_sections_timestamp() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_bot_guide_sections_timestamp() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_bot_express_sessions_timestamp() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_bot_express_sessions_timestamp() not found, skipping';
END $$;

-- Storage functions
DO $$
BEGIN
  ALTER FUNCTION public.storage_bucket_exists(TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function storage_bucket_exists(TEXT) not found, skipping';
END $$;

-- Duel functions
DO $$
BEGIN
  ALTER FUNCTION public.update_duel_player_last_activity(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_duel_player_last_activity(UUID, UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_inactive_players() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_inactive_players() not found, skipping';
END $$;

-- Help feedback functions
DO $$
BEGIN
  ALTER FUNCTION public.update_help_feedback_updated_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_help_feedback_updated_at() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.set_help_feedback_profile_id() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function set_help_feedback_profile_id() not found, skipping';
END $$;

-- Season functions
DO $$
BEGIN
  ALTER FUNCTION public.on_season_end_check() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function on_season_end_check() not found, skipping';
END $$;

-- Reward functions
DO $$
BEGIN
  ALTER FUNCTION public.get_active_reward_config() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_active_reward_config() not found, skipping';
END $$;

-- Referral notification functions
DO $$
BEGIN
  ALTER FUNCTION public.send_referral_notification(UUID, TEXT, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function send_referral_notification(UUID, TEXT, INTEGER) not found, skipping';
END $$;

-- Question report functions
DO $$
BEGIN
  ALTER FUNCTION public.update_question_reports_updated_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_question_reports_updated_at() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.set_question_report_resolved_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function set_question_report_resolved_at() not found, skipping';
END $$;

-- Test functions
DO $$
BEGIN
  ALTER FUNCTION public.initialize_user_test_progress(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function initialize_user_test_progress(UUID, UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.unlock_next_test(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function unlock_next_test(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_test_progress(UUID, UUID, INTEGER, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_test_questions(UUID, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_test_questions(UUID, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.populate_tests_from_questions() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function populate_tests_from_questions() not found, skipping';
END $$;

-- Topic progress functions
DO $$
BEGIN
  ALTER FUNCTION public.get_user_topics_progress_batch(UUID[]) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_user_topics_progress_batch(UUID[]) not found, skipping';
END $$;

-- DGT knowledge functions
DO $$
BEGIN
  ALTER FUNCTION public.search_dgt_knowledge(TEXT, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function search_dgt_knowledge(TEXT, INTEGER, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_rules_search_vector() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_rules_search_vector() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.search_compact_rules(TEXT, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function search_compact_rules(TEXT, INTEGER, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_random_dgt_questions(INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_random_dgt_questions(INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_dgt_question_stats(UUID, BOOLEAN) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_dgt_question_stats(UUID, BOOLEAN) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_dgt_updated_at_column() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_dgt_updated_at_column() not found, skipping';
END $$;

-- Session functions
DO $$
BEGIN
  ALTER FUNCTION public.create_or_update_session(TEXT, JSONB) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function create_or_update_session(TEXT, JSONB) not found, skipping';
END $$;

-- Admin functions
DO $$
BEGIN
  ALTER FUNCTION public.update_admin_reports_updated_at() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_admin_reports_updated_at() not found, skipping';
END $$;

