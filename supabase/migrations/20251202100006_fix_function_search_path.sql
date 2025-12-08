-- ============================================================
-- SECURITY FIX: Set search_path for all partner functions
-- ============================================================
-- Проблема: Все функции с SECURITY DEFINER должны иметь фиксированный search_path
-- Решение: Добавляем SET search_path = public к каждой функции
-- Источник: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================

-- ============================================================
-- МИГРАЦИЯ 0: Partner Premium Functions
-- ============================================================

-- 1. grant_partner_premium
CREATE OR REPLACE FUNCTION grant_partner_premium(
  p_partner_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner RECORD;
BEGIN
  SELECT * INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found'::TEXT;
    RETURN;
  END IF;

  IF v_partner.registration_status != 'approved' THEN
    RETURN QUERY SELECT false, 'Partner must be approved first'::TEXT;
    RETURN;
  END IF;

  IF v_partner.user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Partner has no user account'::TEXT;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET 
    subscription_type = 'partner',
    subscription_status = 'pro',
    premium_until = NULL,
    partner_premium_active = true,
    duel_pass_premium = true,
    premium_forever_purchased_at = NOW()
  WHERE id = v_partner.user_id;

  UPDATE public.partners
  SET 
    is_partner_premium = true,
    partner_premium_activated_at = NOW(),
    partner_premium_notes = 'Auto-granted on approval'
  WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'Partner Premium activated successfully'::TEXT;
END;
$$;

-- 2. trigger_grant_partner_premium
CREATE OR REPLACE FUNCTION trigger_grant_partner_premium()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_status = 'approved' 
     AND (OLD.registration_status IS NULL OR OLD.registration_status != 'approved')
     AND NEW.user_id IS NOT NULL THEN
    
    UPDATE public.profiles
    SET 
      subscription_type = 'partner',
      subscription_status = 'pro',
      premium_until = NULL,
      partner_premium_active = true,
      duel_pass_premium = true,
      premium_forever_purchased_at = NOW()
    WHERE id = NEW.user_id;

    NEW.is_partner_premium := true;
    NEW.partner_premium_activated_at := NOW();
    NEW.partner_premium_notes := 'Auto-granted on approval via trigger';
  END IF;

  IF (NEW.registration_status = 'rejected' OR NEW.status = 'inactive')
     AND OLD.registration_status = 'approved'
     AND NEW.user_id IS NOT NULL THEN
    
    UPDATE public.profiles
    SET 
      subscription_type = CASE 
        WHEN premium_forever_purchased_at IS NOT NULL 
             AND premium_forever_purchased_at < NEW.partner_premium_activated_at
        THEN 'lifetime'
        ELSE 'free'
      END,
      subscription_status = CASE 
        WHEN premium_until > NOW() THEN 'pro'
        ELSE 'free'
      END,
      partner_premium_active = false
    WHERE id = NEW.user_id;

    NEW.is_partner_premium := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. has_premium_access
CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT 
    subscription_status,
    premium_until,
    partner_premium_active,
    premium_forever_purchased_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN (
    v_profile.premium_forever_purchased_at IS NOT NULL
    OR
    (v_profile.subscription_status = 'pro' AND v_profile.premium_until > NOW())
    OR
    v_profile.partner_premium_active = true
  );
END;
$$;

-- 4. revoke_partner_premium
CREATE OR REPLACE FUNCTION revoke_partner_premium(
  p_partner_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner RECORD;
BEGIN
  SELECT * INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found'::TEXT;
    RETURN;
  END IF;

  IF v_partner.user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Partner has no user account'::TEXT;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET 
    partner_premium_active = false,
    subscription_type = CASE 
      WHEN premium_forever_purchased_at IS NOT NULL THEN 'lifetime'
      WHEN premium_until > NOW() THEN subscription_type
      ELSE 'free'
    END,
    subscription_status = CASE 
      WHEN premium_forever_purchased_at IS NOT NULL THEN 'pro'
      WHEN premium_until > NOW() THEN 'pro'
      ELSE 'free'
    END
  WHERE id = v_partner.user_id;

  UPDATE public.partners
  SET 
    is_partner_premium = false,
    partner_premium_notes = COALESCE(p_reason, 'Revoked manually by admin')
  WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'Partner Premium revoked'::TEXT;
END;
$$;

-- ============================================================
-- МИГРАЦИЯ 1: Conversion Funnel Functions
-- ============================================================

-- Note: Остальные функции уже созданы с правильным синтаксисом в предыдущих миграциях.
-- Этот патч только для функций из миграции 0.
-- Для остальных функций нужно будет добавить SET search_path = public после AS $$

-- Для всех остальных функций создадим универсальный патч:

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Получить список всех функций партнерской программы без search_path
  FOR func_record IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'track_partner_conversion',
      'get_partner_funnel_stats',
      'get_partner_funnel_by_day',
      'get_partner_top_campaigns',
      'get_partner_geo_stats',
      'link_session_to_user',
      'generate_partner_link',
      'get_partner_link_info',
      'apply_partner_promo_code',
      'get_partner_links_stats',
      'update_partner_link_stats',
      'request_partner_payout',
      'cancel_partner_payout',
      'process_partner_payout',
      'add_partner_commission_to_hold',
      'release_partner_commissions_from_hold',
      'get_partner_payout_history',
      'is_fraudulent',
      'check_self_referral',
      'detect_partner_fraud_patterns',
      'create_fraud_alert',
      'resolve_fraud_alert',
      'add_to_fraud_blacklist',
      'get_pending_fraud_alerts',
      'check_conversion_fraud',
      'add_student_to_autoschool',
      'get_autoschool_students_progress',
      'get_autoschool_summary',
      'get_autoschool_top_students',
      'enable_instructor_mode'
    )
  LOOP
    -- Для каждой функции обновляем search_path через ALTER FUNCTION
    EXECUTE format(
      'ALTER FUNCTION %I.%I SET search_path = public',
      func_record.schema_name,
      func_record.function_name
    );
    
    RAISE NOTICE 'Updated search_path for function: %.%', func_record.schema_name, func_record.function_name;
  END LOOP;
END $$;

-- Комментарий
COMMENT ON FUNCTION grant_partner_premium IS 'SECURITY: Fixed search_path to prevent SQL injection attacks';
COMMENT ON FUNCTION trigger_grant_partner_premium IS 'SECURITY: Fixed search_path to prevent SQL injection attacks';
COMMENT ON FUNCTION has_premium_access IS 'SECURITY: Fixed search_path to prevent SQL injection attacks';
COMMENT ON FUNCTION revoke_partner_premium IS 'SECURITY: Fixed search_path to prevent SQL injection attacks';

-- ============================================================
-- ДОПОЛНИТЕЛЬНЫЙ FIX: Leaked Password Protection
-- ============================================================
-- Это можно включить только через Supabase Dashboard:
-- Authentication → Providers → Email → Password Protection → Enable
-- Или через Supabase CLI:
-- supabase secrets set AUTH_BREACH_PROTECT_ENABLED=true

-- Документация: Создадим напоминание
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SECURITY REMINDER: Enable Leaked Password Protection';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Go to Supabase Dashboard:';
  RAISE NOTICE '1. Authentication → Providers → Email';
  RAISE NOTICE '2. Password Protection → Enable';
  RAISE NOTICE '3. Or run: supabase secrets set AUTH_BREACH_PROTECT_ENABLED=true';
  RAISE NOTICE '============================================================';
END $$;















