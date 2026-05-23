-- INTENTIONAL: These SECURITY DEFINER functions are callable by authenticated users.
-- DO NOT revoke EXECUTE from authenticated — it will break user-facing functionality.
-- Supabase Security Advisor lint 0029 flags these as warnings, but they are false positives:
-- each function performs internal auth checks (auth.uid()) and is required by the frontend.
-- See: 2026-05-18 incident where revoking these broke quests, boosts, dashboard.

COMMENT ON FUNCTION public.get_ai_debrief_limit_status(user_uuid uuid) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: checks AI debrief usage limit for the calling user.
DO NOT revoke authenticated EXECUTE — breaks AI test debrief feature.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.get_dashboard_super_v2(p_user_id uuid) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: loads main dashboard data (stats, streak, quests).
DO NOT revoke authenticated EXECUTE — breaks the home page entirely.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.get_dashboard_super_v3(p_user_id uuid) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: loads main dashboard data v3 (stats, streak, quests).
DO NOT revoke authenticated EXECUTE — breaks the home page entirely.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.increment_profile_stats(p_user_id uuid, p_coins integer, p_xp integer, p_sp integer) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: awards XP/coins/SP after completing a test or duel.
DO NOT revoke authenticated EXECUTE — breaks all reward grants.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.process_license_event(p_user_id uuid, p_event_type text, p_custom_date timestamp with time zone) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: processes driving license point changes (gamification).
DO NOT revoke authenticated EXECUTE — breaks license points feature.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.purchase_boost(p_boost_type text) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: deducts coins and adds a boost to the user inventory.
DO NOT revoke authenticated EXECUTE — breaks the boost shop.
HISTORY: was revoked 2026-05-18 → broke boost purchases → re-granted 2026-05-19.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.update_daily_quest_progress(p_user_id uuid, p_category text, p_delta integer, p_set_absolute boolean) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: updates daily quest progress after every duel/test answer.
DO NOT revoke authenticated EXECUTE — breaks all daily quest tracking.
HISTORY: was revoked 2026-05-18 → broke quests for every player → re-granted 2026-05-19.
Lint 0029 warning is a false positive.';

COMMENT ON FUNCTION public.use_boost_attack(p_duel_id uuid, p_boost_type text, p_duel_question_id uuid, p_language text, p_profile_id uuid) IS
'INTENTIONAL SECURITY DEFINER + authenticated EXECUTE.
User-facing: activates a boost attack during a PvP duel.
DO NOT revoke authenticated EXECUTE — breaks duel boost mechanics.
Lint 0029 warning is a false positive.';
