-- Fix: use_boost_attack fails with 42501 "permission denied for function modify_boost_inventory"
--
-- Background:
--   * use_boost_attack(p_duel_id, p_boost_type, p_duel_question_id, p_language, p_profile_id)
--     was SECURITY INVOKER, so it executed as the calling role (authenticated).
--   * It internally calls modify_boost_inventory(...), which had EXECUTE revoked from
--     authenticated in migration 20260518610000_revoke_authenticated_admin_functions.sql
--     to harden direct admin access.
--   * That left use_boost_attack broken from the client: the outer call passed authz,
--     but the inner modify_boost_inventory call hit "permission denied".
--
-- Safety:
--   * use_boost_attack already validates the attacker against duel_players using
--     auth.uid() / telegram_id / p_profile_id and only mutates inventory for the
--     verified attacker's own profile_id, so SECURITY DEFINER does not widen access.
--   * search_path is already pinned to 'public' on the function — no injection vector.
--
-- Effect: ALTER ... SECURITY DEFINER so the inner modify_boost_inventory call runs as
-- the function owner (postgres), which already has EXECUTE.

ALTER FUNCTION public.use_boost_attack(
  p_duel_id uuid,
  p_boost_type text,
  p_duel_question_id uuid,
  p_language text,
  p_profile_id uuid
) SECURITY DEFINER;

-- Re-assert the existing grant (idempotent; in case the alter clears any cached plan)
GRANT EXECUTE ON FUNCTION public.use_boost_attack(
  p_duel_id uuid,
  p_boost_type text,
  p_duel_question_id uuid,
  p_language text,
  p_profile_id uuid
) TO authenticated;
