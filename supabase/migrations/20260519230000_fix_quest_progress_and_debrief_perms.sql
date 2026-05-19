-- Fixes two production 42501 / 400 errors:
--
-- 1. update_daily_quest_progress — SECURITY DEFINER but EXECUTE was revoked
--    from authenticated by migration 20260518610000_revoke_authenticated_admin_functions.
--    The client calls this RPC right after every duel/test, so the revoke
--    broke quest progress for every player. Re-grant.
--
-- 2. get_ai_debrief_limit_status — SECURITY INVOKER, reads profiles +
--    daily_ai_usage. With table-level RLS in place the function fails for the
--    calling role. Switch to SECURITY DEFINER so it runs as the owner; the
--    function already filters by the passed user_uuid so no privilege widening.

GRANT EXECUTE ON FUNCTION public.update_daily_quest_progress(
  p_user_id uuid,
  p_category text,
  p_delta integer,
  p_set_absolute boolean
) TO authenticated;

ALTER FUNCTION public.get_ai_debrief_limit_status(user_uuid uuid) SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_ai_debrief_limit_status(user_uuid uuid) TO authenticated;
