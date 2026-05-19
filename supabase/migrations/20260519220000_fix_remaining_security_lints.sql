-- Fix remaining Supabase security linter findings.
--
-- 1. security_definer_view (ERROR) on public.questions_safe
--    Views default to running with the owner's privileges (SECURITY DEFINER
--    semantics). Setting security_invoker = true makes the view honour the
--    caller's RLS / grants instead. questions_safe reads only from
--    questions_new + answer_options, both of which already have RLS suited
--    for anon/authenticated, so this is a drop-in change.
--
-- 2. authenticated_security_definer_function_executable (WARN) on
--    public.get_or_assign_daily_quests(p_user_id uuid)
--    The function only reads daily_quest_definitions and reads/inserts into
--    user_daily_quests. Both tables already have authenticated RLS policies:
--      - daily_quest_definitions: SELECT for authenticated
--      - user_daily_quests:       ALL where user_id = auth.uid()
--    SECURITY INVOKER is therefore safe and removes the privilege-escalation
--    vector the linter flags (caller can't insert quests for someone else
--    because RLS WITH CHECK pins user_id to auth.uid()).
--
-- 3. rls_enabled_no_policy (INFO) on public.honeypot_access_log
--    Backend-only table; only service_role writes to it (from Edge Functions
--    that detect honeypot reads). service_role bypasses RLS anyway, so RLS
--    with no policies is just noise. Same pattern as 20260519210000.
--
-- 4. auth_leaked_password_protection (WARN) — Dashboard-only; cannot be
--    fixed via SQL. Enable at:
--      Supabase Dashboard → Authentication → Settings → Password Security
--      → "Check passwords against HaveIBeenPwned.org"

-- ============================================================
-- 1. questions_safe view → security_invoker
-- ============================================================

ALTER VIEW public.questions_safe SET (security_invoker = true);

-- ============================================================
-- 2. get_or_assign_daily_quests → SECURITY INVOKER
-- ============================================================

ALTER FUNCTION public.get_or_assign_daily_quests(p_user_id uuid)
  SECURITY INVOKER;

-- ============================================================
-- 3. honeypot_access_log → disable RLS (backend-only)
-- ============================================================

ALTER TABLE public.honeypot_access_log DISABLE ROW LEVEL SECURITY;
