-- =====================================================
-- Fix Function Search Path Security Issues
-- =====================================================
-- Исправление предупреждений безопасности:
-- Все функции должны иметь SET search_path для защиты от SQL injection
-- через манипуляцию search_path

-- =====================================================
-- Исправление функций без search_path
-- =====================================================

-- Boost functions
ALTER FUNCTION public.activate_temporary_boost(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.get_sp_multiplier(UUID) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_boosts() SET search_path = public;

-- Duel betting functions
ALTER FUNCTION public.calculate_duel_commission(INTEGER) SET search_path = public;
ALTER FUNCTION public.process_duel_payout(UUID, UUID, UUID, BOOLEAN) SET search_path = public;

-- Referral functions
ALTER FUNCTION public.check_referral_milestone() SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.ensure_referral_codes() SET search_path = public;
ALTER FUNCTION public.create_referral(TEXT, UUID) SET search_path = public;

-- Daily bonus functions
ALTER FUNCTION public.can_access_daily_bonus(UUID) SET search_path = public;

-- Challenge functions
ALTER FUNCTION public.can_access_challenge_question(UUID, UUID) SET search_path = public;

-- Premium functions
ALTER FUNCTION public.auto_unlock_duel_pass_for_premium(UUID) SET search_path = public;
ALTER FUNCTION public.has_premium_forever(UUID) SET search_path = public;
ALTER FUNCTION public.generate_premium_key(TEXT, INTEGER, TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.activate_premium_key(TEXT, UUID) SET search_path = public;
ALTER FUNCTION public.should_purchase_duel_pass(UUID) SET search_path = public;
ALTER FUNCTION public.issue_premium_keys_to_partner(UUID, INTEGER, TEXT) SET search_path = public;
ALTER FUNCTION public.activate_partner_premium(UUID, TEXT) SET search_path = public;

-- Question report functions
ALTER FUNCTION public.can_access_question_report(UUID, UUID) SET search_path = public;

-- Flashcard functions
ALTER FUNCTION public.update_user_flashcard_progress_updated_at() SET search_path = public;

-- Cosmetics functions
ALTER FUNCTION public.get_random_sticker_from_pool(TEXT) SET search_path = public;
ALTER FUNCTION public.get_random_loot(TEXT) SET search_path = public;
ALTER FUNCTION public.get_seasonal_weekly_badge() SET search_path = public;
ALTER FUNCTION public.grant_random_loot(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.can_access_cosmetics(UUID) SET search_path = public;
ALTER FUNCTION public.activate_skin(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.toggle_badge_display(UUID, TEXT, BOOLEAN) SET search_path = public;
ALTER FUNCTION public.use_sticker(UUID, TEXT) SET search_path = public;

-- Device tracking functions
ALTER FUNCTION public.register_or_update_device(UUID, TEXT, TEXT, JSONB) SET search_path = public;
ALTER FUNCTION public.can_change_password(UUID) SET search_path = public;
ALTER FUNCTION public.register_password_change(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = public;
ALTER FUNCTION public.get_user_devices(UUID) SET search_path = public;

-- User metrics functions
ALTER FUNCTION public.create_user_metrics_on_profile() SET search_path = public;

-- Notification functions
ALTER FUNCTION public.update_notification_rule_timestamp() SET search_path = public;

-- Challenge bank functions
ALTER FUNCTION public.get_challenge_bank_stats() SET search_path = public;
ALTER FUNCTION public.get_challenge_bank_questions(INTEGER, INTEGER) SET search_path = public;

-- Generic update functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Partner functions
ALTER FUNCTION public.get_partner_dashboard(UUID) SET search_path = public;
ALTER FUNCTION public.get_partner_link_stats(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT) SET search_path = public;

-- Race functions
ALTER FUNCTION public.update_race_sessions_updated_at() SET search_path = public;
ALTER FUNCTION public.finalize_race_session(UUID) SET search_path = public;

-- Bot functions
ALTER FUNCTION public.update_bot_tips_timestamp() SET search_path = public;
ALTER FUNCTION public.update_bot_guide_sections_timestamp() SET search_path = public;
ALTER FUNCTION public.update_bot_express_sessions_timestamp() SET search_path = public;

-- Storage functions
ALTER FUNCTION public.storage_bucket_exists(TEXT) SET search_path = public;

-- Duel functions
ALTER FUNCTION public.update_duel_player_last_activity(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.update_inactive_players() SET search_path = public;

-- Help feedback functions
ALTER FUNCTION public.update_help_feedback_updated_at() SET search_path = public;
ALTER FUNCTION public.set_help_feedback_profile_id() SET search_path = public;

-- Season functions
ALTER FUNCTION public.on_season_end_check() SET search_path = public;

-- Reward functions
ALTER FUNCTION public.get_active_reward_config() SET search_path = public;

-- Referral notification functions
ALTER FUNCTION public.send_referral_notification(UUID, TEXT, INTEGER) SET search_path = public;

-- Question report functions
ALTER FUNCTION public.update_question_reports_updated_at() SET search_path = public;
ALTER FUNCTION public.set_question_report_resolved_at() SET search_path = public;

-- Test functions
ALTER FUNCTION public.initialize_user_test_progress(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.unlock_next_test(UUID) SET search_path = public;
ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_test_questions(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.populate_tests_from_questions() SET search_path = public;

-- Topic progress functions
ALTER FUNCTION public.get_user_topics_progress_batch(UUID[]) SET search_path = public;

-- DGT knowledge functions
ALTER FUNCTION public.search_dgt_knowledge(TEXT, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION public.update_rules_search_vector() SET search_path = public;
ALTER FUNCTION public.search_compact_rules(TEXT, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_random_dgt_questions(INTEGER) SET search_path = public;
ALTER FUNCTION public.update_dgt_question_stats(UUID, BOOLEAN) SET search_path = public;
ALTER FUNCTION public.update_dgt_updated_at_column() SET search_path = public;

-- Session functions
ALTER FUNCTION public.create_or_update_session(TEXT, JSONB) SET search_path = public;

-- Admin functions
ALTER FUNCTION public.update_admin_reports_updated_at() SET search_path = public;

-- =====================================================
-- Комментарии для документации
-- =====================================================
COMMENT ON FUNCTION public.activate_temporary_boost IS 'Активирует временный буст для пользователя. search_path установлен для безопасности.';
COMMENT ON FUNCTION public.get_sp_multiplier IS 'Возвращает текущий множитель SP. search_path установлен для безопасности.';
COMMENT ON FUNCTION public.cleanup_expired_boosts IS 'Очищает истекшие бусты. search_path установлен для безопасности.';
COMMENT ON FUNCTION public.calculate_duel_commission IS 'Рассчитывает комиссию дуэли. search_path установлен для безопасности.';
COMMENT ON FUNCTION public.process_duel_payout IS 'Обрабатывает выплату за дуэль. search_path установлен для безопасности.';

