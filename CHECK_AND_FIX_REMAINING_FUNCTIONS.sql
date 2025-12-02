-- =====================================================
-- Check and Fix Remaining Function Search Path Issues
-- =====================================================
-- Проверяем реальные сигнатуры функций и исправляем их

-- Сначала проверим, какие функции существуют и их сигнатуры
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'issue_premium_keys_to_partner',
    'finalize_race_session',
    'register_partner',
    'update_duel_player_last_activity',
    'activate_partner_premium',
    'get_partner_link_stats',
    'get_active_reward_config',
    'send_referral_notification',
    'update_test_progress',
    'get_user_topics_progress_batch'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

-- Теперь исправляем с правильными сигнатурами на основе проверки выше
-- Если функция не найдена, будет предупреждение, но выполнение продолжится

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

-- Partner functions - пробуем разные варианты сигнатур
DO $$
BEGIN
  -- Вариант 1: 8 параметров
  ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    -- Вариант 2: 4 параметра (старая версия)
    ALTER FUNCTION public.register_partner(TEXT, TEXT, TEXT, TEXT) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'register_partner: %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.activate_partner_premium(TEXT, UUID, TEXT, TEXT, TEXT, INET, TEXT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    -- Пробуем вариант с меньшим количеством параметров
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
DO $$
BEGIN
  ALTER FUNCTION public.update_duel_player_last_activity(UUID, UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'update_duel_player_last_activity: %', SQLERRM;
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



