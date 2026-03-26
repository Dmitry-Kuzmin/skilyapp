-- ============================================================
-- Security Advisory Fixes (Supabase Linter 2026-03-26)
-- ============================================================

-- ============================================================
-- 1. CRITICAL: Enable RLS on tables exposed to PostgREST
-- ============================================================

-- daily_quest_definitions: reference/config table — all authenticated users can read, only service role writes
ALTER TABLE public.daily_quest_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_quest_definitions_read" ON public.daily_quest_definitions;
CREATE POLICY "daily_quest_definitions_read"
  ON public.daily_quest_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- user_daily_quests: per-user data — users can only see their own rows
ALTER TABLE public.user_daily_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_daily_quests_own" ON public.user_daily_quests;
CREATE POLICY "user_daily_quests_own"
  ON public.user_daily_quests
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. WARN: Fix mutable search_path on SECURITY DEFINER functions
-- All functions use SECURITY DEFINER → must pin search_path
-- ============================================================

ALTER FUNCTION public.get_or_assign_daily_quests(UUID)
  SET search_path = public;

ALTER FUNCTION public.update_daily_quest_progress(UUID, TEXT, INTEGER, BOOLEAN)
  SET search_path = public;

ALTER FUNCTION public.claim_daily_quest_reward(UUID, UUID)
  SET search_path = public;

ALTER FUNCTION public.use_boost_attack(uuid, uuid, text)
  SET search_path = public;

ALTER FUNCTION public.process_license_event(UUID, TEXT, TIMESTAMP WITH TIME ZONE)
  SET search_path = public;

ALTER FUNCTION public.check_referral_milestone()
  SET search_path = public;
