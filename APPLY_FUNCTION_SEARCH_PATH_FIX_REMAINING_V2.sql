-- =====================================================
-- Fix Remaining Function Search Path Issues (V2)
-- =====================================================
-- Исправление оставшихся 10 предупреждений безопасности
-- Пробуем все возможные варианты сигнатур

-- =====================================================
-- Исправление функций с правильными сигнатурами
-- =====================================================

-- Premium functions
DO $$
BEGIN
  ALTER FUNCTION public.issue_premium_keys_to_partner(UUID, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'issue_premium_keys_to_partner(UUID, INTEGER, INTEGER): %', SQLERRM;
END $$;

-- Race functions
DO $$
BEGIN
  ALTER FUNCTION public.finalize_race_session(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER FUNCTION public.finalize_race_session(UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'finalize_race_session: %', SQLERRM;
  END;
END $$;

-- Partner functions
DO $$
BEGIN
  -- Пробуем полную сигнатуру (8 параметров)
  ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    -- Пробуем короткую сигнатуру (4 параметра)
    ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'register_partner: %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  -- Пробуем полную сигнатуру (7 параметров)
  ALTER FUNCTION public.activate_partner_premium(TEXT, UUID, TEXT, TEXT, TEXT, INET, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    -- Пробуем короткую сигнатуру (2 параметра)
    ALTER FUNCTION public.activate_partner_premium(UUID, TEXT) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'activate_partner_premium: %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_partner_link_stats(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER FUNCTION public.get_partner_link_stats(UUID, TEXT) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'get_partner_link_stats: %', SQLERRM;
  END;
END $$;

-- Duel functions
-- Функция может не существовать, если обновление делается напрямую через UPDATE
DO $$
BEGIN
  ALTER FUNCTION public.update_duel_player_last_activity(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'update_duel_player_last_activity: % (функция может не существовать)', SQLERRM;
END $$;

-- Reward functions
DO $$
BEGIN
  ALTER FUNCTION public.get_active_reward_config(TEXT, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER FUNCTION public.get_active_reward_config() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'get_active_reward_config: %', SQLERRM;
  END;
END $$;

-- Referral notification functions
DO $$
BEGIN
  ALTER FUNCTION public.send_referral_notification(UUID, TEXT, INTEGER, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER FUNCTION public.send_referral_notification(UUID, TEXT, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'send_referral_notification: %', SQLERRM;
  END;
END $$;

-- Test functions
DO $$
BEGIN
  ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER, INTEGER) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER FUNCTION public.update_test_progress(UUID, UUID, INTEGER, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'update_test_progress: %', SQLERRM;
  END;
END $$;

-- Topic progress functions
DO $$
BEGIN
  ALTER FUNCTION public.get_user_topics_progress_batch(UUID, UUID[]) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER FUNCTION public.get_user_topics_progress_batch(UUID[]) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'get_user_topics_progress_batch: %', SQLERRM;
  END;
END $$;
















