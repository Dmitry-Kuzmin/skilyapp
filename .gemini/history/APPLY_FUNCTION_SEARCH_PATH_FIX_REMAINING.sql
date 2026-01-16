-- =====================================================
-- Fix Remaining Function Search Path Issues
-- =====================================================
-- Исправление оставшихся 10 предупреждений безопасности
-- Все функции должны иметь SET search_path для защиты от SQL injection

-- =====================================================
-- Исправление функций с правильными сигнатурами
-- =====================================================

-- Premium functions
DO $$
BEGIN
  ALTER FUNCTION public.issue_premium_keys_to_partner(UUID, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function issue_premium_keys_to_partner(UUID, INTEGER, INTEGER) not found, skipping: %', SQLERRM;
END $$;

-- Race functions
DO $$
BEGIN
  ALTER FUNCTION public.finalize_race_session(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function finalize_race_session(UUID, TEXT) not found, skipping: %', SQLERRM;
END $$;

-- Partner functions
DO $$
BEGIN
  ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function register_partner(TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) not found, skipping: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_partner_premium(TEXT, UUID, TEXT, TEXT, TEXT, INET, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function activate_partner_premium(TEXT, UUID, TEXT, TEXT, TEXT, INET, TEXT) not found, skipping: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_partner_link_stats(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_partner_link_stats(UUID) not found, skipping: %', SQLERRM;
END $$;

-- Duel functions
-- Note: update_duel_player_last_activity might not exist as a function
-- It might be handled via direct UPDATE in Edge Functions
DO $$
BEGIN
  ALTER FUNCTION public.update_duel_player_last_activity(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_duel_player_last_activity(UUID, UUID) not found, skipping: %', SQLERRM;
END $$;

-- Reward functions
DO $$
BEGIN
  ALTER FUNCTION public.get_active_reward_config(TEXT, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_active_reward_config(TEXT, INTEGER) not found, skipping: %', SQLERRM;
END $$;

-- Referral notification functions
DO $$
BEGIN
  ALTER FUNCTION public.send_referral_notification(UUID, TEXT, INTEGER, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function send_referral_notification(UUID, TEXT, INTEGER, TEXT) not found, skipping: %', SQLERRM;
END $$;

-- Test functions
DO $$
BEGIN
  ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function update_test_progress(UUID, UUID, INTEGER, INTEGER, INTEGER) not found, skipping: %', SQLERRM;
END $$;

-- Topic progress functions
DO $$
BEGIN
  ALTER FUNCTION public.get_user_topics_progress_batch(UUID, UUID[]) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Function get_user_topics_progress_batch(UUID, UUID[]) not found, skipping: %', SQLERRM;
END $$;

