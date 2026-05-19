-- Fix remaining authenticated_security_definer_function_executable warnings
--
-- Root cause: 20260518620000 did REVOKE FROM PUBLIC + GRANT TO authenticated for all
-- user-facing functions, but accidentally re-granted functions that 20260518580000
-- had already revoked, and included internal-only functions that shouldn't be exposed.
--
-- This migration:
-- 1. Re-revokes functions that were accidentally re-granted
-- 2. Revokes internal/sensitive functions that should never be user-callable
-- 3. Sets search_path on all SECURITY DEFINER functions (closes lint 0011)

-- ============================================================
-- 1. RE-REVOKE: accidentally re-granted by 20260518620000
-- ============================================================

-- Admin-only: must go through partner system, not direct RPC
REVOKE EXECUTE ON FUNCTION public.activate_partner_premium(
  p_partner_code text, p_user_id uuid, p_utm_source text, p_utm_medium text,
  p_utm_campaign text, p_ip_address inet, p_user_agent text
) FROM authenticated;

-- Admin-only: enabling instructor mode is a privileged operation
REVOKE EXECUTE ON FUNCTION public.enable_instructor_mode(
  p_user_id uuid, p_enabled boolean
) FROM authenticated;

-- ============================================================
-- 2. REVOKE internal/sensitive functions
-- ============================================================

-- Fraud detection internals: exposing these lets attackers probe detection logic
REVOKE EXECUTE ON FUNCTION public.is_fraudulent(
  p_ip inet, p_user_agent text, p_device_id text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.check_cookie_stuffing(
  p_session_id text, p_event_type text, p_created_at timestamp with time zone
) FROM authenticated;

-- Internal loot assignment: should only be called from Edge Functions, not direct RPC
REVOKE EXECUTE ON FUNCTION public.get_random_loot(p_loot_type text, p_pool text) FROM authenticated;

-- Internal sticker pool picker: same reason as get_random_loot
REVOKE EXECUTE ON FUNCTION public.get_random_sticker_from_pool(p_pool text) FROM authenticated;

-- ============================================================
-- 3. SET search_path on all SECURITY DEFINER functions (lint 0011)
--    Uses dynamic SQL to avoid listing 100+ functions individually.
--    search_path = public prevents schema injection attacks.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  sql text;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      quote_ident(p.proname) AS fname,
      pg_get_function_identity_arguments(p.oid) AS fargs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      -- Skip if search_path is already fixed (proconfig contains 'search_path')
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
      ))
  LOOP
    sql := format(
      'ALTER FUNCTION public.%s(%s) SET search_path = public, extensions, pg_catalog',
      r.fname, r.fargs
    );
    EXECUTE sql;
  END LOOP;
END;
$$;
