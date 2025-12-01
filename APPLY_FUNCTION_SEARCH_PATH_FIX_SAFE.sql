-- =====================================================
-- Fix Function Search Path Security Issues (SAFE VERSION)
-- =====================================================
-- Исправление предупреждений безопасности:
-- Все функции должны иметь SET search_path для защиты от SQL injection
-- через манипуляцию search_path
-- 
-- Эта версия проверяет существование функций перед изменением

-- =====================================================
-- Вспомогательная функция для безопасного изменения search_path
-- =====================================================
CREATE OR REPLACE FUNCTION public._set_function_search_path_safe(
  p_function_name TEXT,
  p_arg_types TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Проверяем существование функции
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = p_function_name
      AND pg_get_function_identity_arguments(p.oid) = p_arg_types
  ) THEN
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', p_function_name, p_arg_types);
  ELSE
    RAISE NOTICE 'Function public.%(%) does not exist, skipping', p_function_name, p_arg_types;
  END IF;
END;
$$;

-- =====================================================
-- Исправление функций без search_path
-- =====================================================

-- Boost functions
SELECT public._set_function_search_path_safe('activate_temporary_boost', 'uuid, text');
SELECT public._set_function_search_path_safe('get_sp_multiplier', 'uuid');
SELECT public._set_function_search_path_safe('cleanup_expired_boosts', '');

-- Duel betting functions
SELECT public._set_function_search_path_safe('calculate_duel_commission', 'integer');
SELECT public._set_function_search_path_safe('process_duel_payout', 'uuid, uuid, uuid, boolean');

-- Referral functions
SELECT public._set_function_search_path_safe('check_referral_milestone', '');
SELECT public._set_function_search_path_safe('generate_referral_code', '');
SELECT public._set_function_search_path_safe('ensure_referral_codes', '');
SELECT public._set_function_search_path_safe('create_referral', 'text, uuid');

-- Daily bonus functions
SELECT public._set_function_search_path_safe('can_access_daily_bonus', 'uuid');

-- Challenge functions
SELECT public._set_function_search_path_safe('can_access_challenge_question', 'uuid');

-- Premium functions
SELECT public._set_function_search_path_safe('auto_unlock_duel_pass_for_premium', 'uuid');
SELECT public._set_function_search_path_safe('has_premium_forever', 'uuid');
SELECT public._set_function_search_path_safe('generate_premium_key', 'text, integer, timestamp with time zone');
SELECT public._set_function_search_path_safe('activate_premium_key', 'text, uuid');
SELECT public._set_function_search_path_safe('should_purchase_duel_pass', 'uuid');
SELECT public._set_function_search_path_safe('issue_premium_keys_to_partner', 'uuid, integer, text');
SELECT public._set_function_search_path_safe('activate_partner_premium', 'uuid, text');

-- Question report functions
SELECT public._set_function_search_path_safe('can_access_question_report', 'uuid');

-- Flashcard functions
SELECT public._set_function_search_path_safe('update_user_flashcard_progress_updated_at', '');

-- Cosmetics functions
SELECT public._set_function_search_path_safe('get_random_sticker_from_pool', 'text');
SELECT public._set_function_search_path_safe('get_random_loot', 'text');
SELECT public._set_function_search_path_safe('get_seasonal_weekly_badge', '');
SELECT public._set_function_search_path_safe('grant_random_loot', 'uuid, text');
SELECT public._set_function_search_path_safe('can_access_cosmetics', 'uuid');
SELECT public._set_function_search_path_safe('activate_skin', 'uuid, text');
SELECT public._set_function_search_path_safe('toggle_badge_display', 'uuid, text, boolean');
SELECT public._set_function_search_path_safe('use_sticker', 'uuid, text');

-- Device tracking functions
SELECT public._set_function_search_path_safe('register_or_update_device', 'uuid, text, text, jsonb');
SELECT public._set_function_search_path_safe('can_change_password', 'uuid');
SELECT public._set_function_search_path_safe('register_password_change', 'uuid, text');
SELECT public._set_function_search_path_safe('cleanup_expired_sessions', '');
SELECT public._set_function_search_path_safe('get_user_devices', 'uuid');

-- User metrics functions
SELECT public._set_function_search_path_safe('create_user_metrics_on_profile', '');

-- Notification functions
SELECT public._set_function_search_path_safe('update_notification_rule_timestamp', '');

-- Challenge bank functions
SELECT public._set_function_search_path_safe('get_challenge_bank_stats', 'uuid');
SELECT public._set_function_search_path_safe('get_challenge_bank_questions', 'uuid, integer, boolean');

-- Generic update functions
SELECT public._set_function_search_path_safe('update_updated_at_column', '');

-- Partner functions
SELECT public._set_function_search_path_safe('get_partner_dashboard', 'uuid');
SELECT public._set_function_search_path_safe('get_partner_link_stats', 'uuid, text');
SELECT public._set_function_search_path_safe('register_partner', 'text, text, text, text');

-- Race functions
SELECT public._set_function_search_path_safe('update_race_sessions_updated_at', '');
SELECT public._set_function_search_path_safe('finalize_race_session', 'uuid');

-- Bot functions
SELECT public._set_function_search_path_safe('update_bot_tips_timestamp', '');
SELECT public._set_function_search_path_safe('update_bot_guide_sections_timestamp', '');
SELECT public._set_function_search_path_safe('update_bot_express_sessions_timestamp', '');

-- Storage functions
SELECT public._set_function_search_path_safe('storage_bucket_exists', 'text');

-- Duel functions
SELECT public._set_function_search_path_safe('update_duel_player_last_activity', 'uuid, uuid');
SELECT public._set_function_search_path_safe('update_inactive_players', '');

-- Help feedback functions
SELECT public._set_function_search_path_safe('update_help_feedback_updated_at', '');
SELECT public._set_function_search_path_safe('set_help_feedback_profile_id', '');

-- Season functions
SELECT public._set_function_search_path_safe('on_season_end_check', '');

-- Reward functions
SELECT public._set_function_search_path_safe('get_active_reward_config', '');

-- Referral notification functions
SELECT public._set_function_search_path_safe('send_referral_notification', 'uuid, text, integer');

-- Question report functions
SELECT public._set_function_search_path_safe('update_question_reports_updated_at', '');
SELECT public._set_function_search_path_safe('set_question_report_resolved_at', '');

-- Test functions
SELECT public._set_function_search_path_safe('initialize_user_test_progress', 'uuid, uuid');
SELECT public._set_function_search_path_safe('unlock_next_test', 'uuid');
SELECT public._set_function_search_path_safe('update_test_progress', 'uuid, uuid, integer, integer');
SELECT public._set_function_search_path_safe('get_test_questions', 'uuid, integer');
SELECT public._set_function_search_path_safe('populate_tests_from_questions', '');

-- Topic progress functions
SELECT public._set_function_search_path_safe('get_user_topics_progress_batch', 'uuid[]');

-- DGT knowledge functions
SELECT public._set_function_search_path_safe('search_dgt_knowledge', 'text, integer, integer');
SELECT public._set_function_search_path_safe('update_rules_search_vector', '');
SELECT public._set_function_search_path_safe('search_compact_rules', 'text, integer, integer');
SELECT public._set_function_search_path_safe('get_random_dgt_questions', 'integer');
SELECT public._set_function_search_path_safe('update_dgt_question_stats', 'uuid, boolean');
SELECT public._set_function_search_path_safe('update_dgt_updated_at_column', '');

-- Session functions
SELECT public._set_function_search_path_safe('create_or_update_session', 'text, jsonb');

-- Admin functions
SELECT public._set_function_search_path_safe('update_admin_reports_updated_at', '');

-- Удаляем вспомогательную функцию
DROP FUNCTION IF EXISTS public._set_function_search_path_safe(TEXT, TEXT);

