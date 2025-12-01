-- =====================================================
-- Fix Remaining Function Search Path Issues (FINAL)
-- =====================================================
-- Исправление оставшихся 10 предупреждений безопасности
-- Сигнатуры проверены через CHECK_AND_FIX_REMAINING_FUNCTIONS.sql

-- =====================================================
-- Исправление функций с правильными сигнатурами
-- =====================================================

-- Premium functions
DO $$
BEGIN
  ALTER FUNCTION public.issue_premium_keys_to_partner(UUID, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'issue_premium_keys_to_partner: %', SQLERRM;
END $$;

-- Race functions
DO $$
BEGIN
  ALTER FUNCTION public.finalize_race_session(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'finalize_race_session: %', SQLERRM;
END $$;

-- Partner functions
DO $$
BEGIN
  ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'register_partner: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_partner_premium(TEXT, UUID, TEXT, TEXT, TEXT, INET, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'activate_partner_premium: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_partner_link_stats(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'get_partner_link_stats: %', SQLERRM;
END $$;

-- Duel functions
-- Примечание: update_duel_player_last_activity - это функция-триггер (RETURNS TRIGGER)
-- Функции-триггеры не имеют параметров, только возвращают TRIGGER
DO $$
BEGIN
  ALTER FUNCTION public.update_duel_player_last_activity() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'update_duel_player_last_activity: %', SQLERRM;
END $$;

-- Reward functions
DO $$
BEGIN
  ALTER FUNCTION public.get_active_reward_config(TEXT, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'get_active_reward_config: %', SQLERRM;
END $$;

-- Referral notification functions
DO $$
BEGIN
  ALTER FUNCTION public.send_referral_notification(UUID, TEXT, INTEGER, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'send_referral_notification: %', SQLERRM;
END $$;

-- Test functions
DO $$
BEGIN
  ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'update_test_progress: %', SQLERRM;
END $$;

-- Topic progress functions
DO $$
BEGIN
  ALTER FUNCTION public.get_user_topics_progress_batch(UUID, UUID[]) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'get_user_topics_progress_batch: %', SQLERRM;
END $$;

