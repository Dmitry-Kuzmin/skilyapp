-- Fix lint 0008: rls_enabled_no_policy on 5 backend-only tables.
--
-- All 5 tables are accessed exclusively by service_role (Edge Functions / cron).
-- service_role bypasses RLS entirely, so RLS adds no value here.
-- Disabling RLS removes the lint warning and is architecturally correct.
--
-- course_leads / course_payments / platform_sessions had overly broad grants
-- (SELECT + INSERT + UPDATE + DELETE to both anon and authenticated) — revoked below.
-- test_session_questions stores correct_option_ids — must never be user-readable.
-- api_rate_log is internal rate-limit state — must never be user-readable.

-- ============================================================
-- 1. Revoke overly broad grants from anon + authenticated
--    (course_leads, course_payments, platform_sessions had ALL privileges)
-- ============================================================

REVOKE ALL ON public.course_leads     FROM anon, authenticated;
REVOKE ALL ON public.course_payments  FROM anon, authenticated;
REVOKE ALL ON public.platform_sessions FROM anon, authenticated;

-- api_rate_log and test_session_questions had no grants — nothing to revoke.

-- ============================================================
-- 2. Disable RLS on all 5 tables (backend-only, service_role access only)
--    service_role bypasses RLS regardless; disabling it is cleaner.
-- ============================================================

ALTER TABLE public.api_rate_log           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_leads           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_payments        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_session_questions DISABLE ROW LEVEL SECURITY;
