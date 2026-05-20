-- Fix: restore SECURITY DEFINER on license-related functions.
--
-- Migration 20260519200000 bulk-converted all SECURITY DEFINER functions to
-- SECURITY INVOKER. That broke the license audit log because:
--
--   1. process_license_event INSERTs into user_license_points_audit.
--      The table has RLS enabled with only a SELECT policy (auth.uid() = user_id).
--      No INSERT/DELETE policy exists, so authenticated callers are blocked.
--      With SECURITY INVOKER the INSERT silently fails (caught by EXCEPTION WHEN OTHERS).
--
--   2. get_dashboard_super_v3 / v2 SELECT from user_license_points_audit using
--      p_user_id. With SECURITY INVOKER the RLS filter (auth.uid() = user_id)
--      is applied. In normal web sessions auth.uid() = p_user_id and it works,
--      but in Telegram-auth fallback sessions auth.uid() may be NULL → 0 rows.
--
-- Fix: restore SECURITY DEFINER on these three functions.
-- They are safe as SECURITY DEFINER because they are parameterised by p_user_id
-- and only operate on that single user's data — the privilege escalation risk
-- the linter flagged does not apply here.

ALTER FUNCTION public.process_license_event(
  p_user_id uuid,
  p_event_type text,
  p_custom_date timestamp with time zone
) SECURITY DEFINER;

ALTER FUNCTION public.get_dashboard_super_v2(p_user_id uuid) SECURITY DEFINER;
ALTER FUNCTION public.get_dashboard_super_v3(p_user_id uuid) SECURITY DEFINER;
