-- Annotate SECURITY DEFINER functions that trigger Supabase linter rule:
-- "authenticated_security_definer_function_executable"
--
-- These warnings are INTENTIONAL and EXPECTED. Each function is SECURITY DEFINER
-- because it needs to access tables/functions that are otherwise restricted by RLS
-- or require elevated privileges. EXECUTE is granted explicitly to `authenticated`
-- so only logged-in users can call them — not anonymous/public.
--
-- Rule suppression is not available in Supabase dashboard config; these comments
-- serve as the authoritative documentation of intent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. use_boost_attack
--    SECURITY DEFINER: must call modify_boost_inventory (SECURITY DEFINER itself)
--    and write duel_exploits as service role to bypass RLS on those tables.
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.use_boost_attack(
    p_duel_id uuid,
    p_boost_type text,
    p_duel_question_id uuid,
    p_language text,
    p_profile_id uuid
) IS
'SECURITY DEFINER — intentional. Needs to call modify_boost_inventory and write
duel_exploits bypassing RLS. EXECUTE granted only to authenticated role.
Supabase lint: authenticated_security_definer_function_executable — expected.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. purchase_boost
--    SECURITY DEFINER: deducts coins from profiles and writes boost_inventory;
--    both tables have RLS policies that would block a direct SECURITY INVOKER call
--    because the function resolves user from auth.uid() then acts on profiles.id.
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.purchase_boost(p_boost_type text) IS
'SECURITY DEFINER — intentional. Deducts coins and writes boost_inventory as elevated
role; RLS on profiles requires owning row, resolved via auth.uid() → profiles.id
lookup. EXECUTE granted only to authenticated role.
Supabase lint: authenticated_security_definer_function_executable — expected.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. update_daily_quest_progress
--    SECURITY DEFINER: upserts daily_quests rows for any profile_id passed by
--    Edge Functions (service calls). Direct authenticated access would be blocked
--    by RLS on daily_quests unless caller owns the row.
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.update_daily_quest_progress(
    p_user_id uuid,
    p_category text,
    p_delta integer,
    p_set_absolute boolean
) IS
'SECURITY DEFINER — intentional. Called by Edge Functions and directly by client;
must upsert daily_quests bypassing row-level ownership RLS. EXECUTE granted only
to authenticated role.
Supabase lint: authenticated_security_definer_function_executable — expected.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. get_ai_debrief_limit_status
--    SECURITY DEFINER: reads profiles and daily_ai_usage with a service-role
--    view to enforce per-user AI call limits; RLS on daily_ai_usage would
--    prevent the cross-table join needed for accurate limit checking.
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.get_ai_debrief_limit_status(user_uuid uuid) IS
'SECURITY DEFINER — intentional. Needs to read profiles + daily_ai_usage without
RLS interference to accurately compute remaining AI debrief quota. EXECUTE granted
only to authenticated role.
Supabase lint: authenticated_security_definer_function_executable — expected.';
