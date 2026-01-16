-- =====================================================
-- Fix Remaining Function Search Path Issues (FINAL)
-- =====================================================
-- Исправление оставшихся предупреждений безопасности
-- Все функции должны иметь SET search_path для защиты от SQL injection

-- =====================================================
-- Исправление функций с правильными сигнатурами
-- =====================================================

-- Premium functions
DO $$
BEGIN
  ALTER FUNCTION public.auto_unlock_duel_pass_for_premium() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function auto_unlock_duel_pass_for_premium() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.generate_premium_key() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function generate_premium_key() not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.should_purchase_duel_pass(UUID, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function should_purchase_duel_pass(UUID, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.issue_premium_keys_to_partner(UUID, INTEGER, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function issue_premium_keys_to_partner(UUID, INTEGER, TEXT) not found, skipping';
END $$;

-- Cosmetics functions
DO $$
BEGIN
  ALTER FUNCTION public.get_random_loot(TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_random_loot(TEXT, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.grant_random_loot(UUID, JSONB) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function grant_random_loot(UUID, JSONB) not found, skipping';
END $$;

-- Device tracking functions
DO $$
BEGIN
  ALTER FUNCTION public.register_or_update_device(UUID, TEXT, TEXT, TEXT, INET, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_or_update_device(UUID, TEXT, TEXT, TEXT, INET, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.register_password_change(UUID, INET, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_password_change(UUID, INET, TEXT) not found, skipping';
END $$;

-- Race functions
DO $$
BEGIN
  ALTER FUNCTION public.finalize_race_session(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function finalize_race_session(UUID) not found, skipping';
END $$;

-- Partner functions
DO $$
BEGIN
  ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_partner(TEXT, TEXT, TEXT, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_duel_player_last_activity(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_duel_player_last_activity(UUID, UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_partner_premium(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function activate_partner_premium(UUID, TEXT) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_partner_link_stats(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_partner_link_stats(UUID, TEXT) not found, skipping';
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

-- Test functions
DO $$
BEGIN
  ALTER FUNCTION public.initialize_user_test_progress(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function initialize_user_test_progress(UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.unlock_next_test(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function unlock_next_test(UUID, UUID) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_test_progress(UUID, UUID, INTEGER, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_test_questions(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_test_questions(UUID) not found, skipping';
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
  ALTER FUNCTION public.get_random_dgt_questions(TEXT, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_random_dgt_questions(TEXT, INTEGER) not found, skipping';
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_dgt_question_stats() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_dgt_question_stats() not found, skipping';
END $$;

-- Session functions
DO $$
BEGIN
  ALTER FUNCTION public.create_or_update_session(UUID, UUID, TEXT, INET, TEXT, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function create_or_update_session(UUID, UUID, TEXT, INET, TEXT, INTEGER) not found, skipping';
END $$;

