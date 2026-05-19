-- Resolve lint 0029: authenticated_security_definer_function_executable
--
-- All remaining SECURITY DEFINER functions that authenticated can EXECUTE are
-- intentionally user-facing (we explicitly granted them in 20260518620000).
-- Converting to SECURITY INVOKER is the correct fix: the function runs with
-- the caller's privileges, so RLS enforces data access automatically instead
-- of the function owner (postgres) bypassing it. This removes the privilege
-- escalation vector while preserving identical behavior for well-formed callers.
--
-- Prerequisite: underlying tables must have proper GRANT + RLS for authenticated.
-- In a standard Supabase project this is already the case.

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
      AND has_function_privilege('authenticated', p.oid, 'execute')
  LOOP
    sql := format(
      'ALTER FUNCTION public.%s(%s) SECURITY INVOKER',
      r.fname, r.fargs
    );
    EXECUTE sql;
  END LOOP;
END;
$$;

-- ============================================================
-- NOTE: auth_leaked_password_protection (lint 0001)
-- Cannot be fixed via SQL migration. Requires manual Dashboard action:
--   Supabase Dashboard → Authentication → Settings → Password Security
--   → Enable "Check passwords against HaveIBeenPwned.org"
-- ============================================================
