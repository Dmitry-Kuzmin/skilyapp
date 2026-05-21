-- Fix: increment_profile_stats lost EXECUTE for authenticated when PUBLIC was revoked
-- in 20260518620000_fix_security_definer_revoke_public.sql (line 146).
-- claim_daily_quest_reward is NOT security definer, so it runs as authenticated and
-- needs to call increment_profile_stats — which requires explicit EXECUTE grant.
GRANT EXECUTE ON FUNCTION public.increment_profile_stats(uuid, integer, integer, integer) TO authenticated;
