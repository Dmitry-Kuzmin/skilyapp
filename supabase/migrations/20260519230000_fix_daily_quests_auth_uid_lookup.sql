-- Fix get_or_assign_daily_quests so it works under SECURITY INVOKER.
--
-- Root cause:
--   user_daily_quests.user_id stores profiles.id (the app's profile UUID),
--   but the RLS policy checks user_id = auth.uid() (the Supabase auth UUID).
--   These are DIFFERENT columns — profiles.id ≠ profiles.user_id = auth.uid().
--
--   When migration 20260519220000 switched the function to SECURITY INVOKER,
--   the INSERT started running as the authenticated role, which means the RLS
--   WITH CHECK (user_id = auth.uid()) is evaluated. Since p_user_id passed
--   from the client is profiles.id (≠ auth.uid()), every INSERT got rejected
--   with 42501 "new row violates row-level security policy".
--
-- Fix (two-part):
--   1. Drop the p_user_id parameter — the function resolves the profile
--      internally from auth.uid(), exactly like purchase_boost does.
--      This also closes the privilege-escalation vector the linter flagged
--      (caller can no longer request quests for another user's profile).
--
--   2. Fix the RLS policy on user_daily_quests to match profiles.id
--      by joining through profiles.user_id = auth.uid().
--
-- The function stays SECURITY INVOKER (no SECURITY DEFINER needed).

-- ── Step 1: Fix the RLS policy ───────────────────────────────────────────────

DROP POLICY IF EXISTS "user_daily_quests_own" ON public.user_daily_quests;

CREATE POLICY "user_daily_quests_own"
  ON public.user_daily_quests
  FOR ALL
  USING (
    user_id = (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ── Step 2: Recreate function without p_user_id param ───────────────────────

-- Drop old signature (uuid param) so we can create the new one cleanly
DROP FUNCTION IF EXISTS public.get_or_assign_daily_quests(uuid);

CREATE OR REPLACE FUNCTION public.get_or_assign_daily_quests()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_auth_id  uuid := auth.uid();
    v_user_id  uuid;            -- profiles.id
    v_today    DATE := CURRENT_DATE;
    v_count    INTEGER;
    v_quests   JSONB;
BEGIN
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Resolve profiles.id from auth.uid() (same pattern as purchase_boost)
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE user_id = v_auth_id
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
    END IF;

    -- 1. Check if quests already assigned today
    SELECT COUNT(*) INTO v_count
    FROM public.user_daily_quests
    WHERE user_id = v_user_id AND assigned_at = v_today;

    -- 2. Assign new quests if none yet
    IF v_count = 0 THEN
        INSERT INTO public.user_daily_quests (user_id, quest_id)
        SELECT v_user_id, id FROM (
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty = 'easy'   AND is_active = true ORDER BY random() LIMIT 1)
            UNION ALL
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty = 'medium' AND is_active = true ORDER BY random() LIMIT 1)
            UNION ALL
            (SELECT id FROM public.daily_quest_definitions WHERE difficulty IN ('medium', 'hard') AND is_active = true ORDER BY random() LIMIT 1)
        ) AS random_quests
        LIMIT 3
        ON CONFLICT DO NOTHING;
    END IF;

    -- 3. Return today's quests with definitions
    SELECT jsonb_agg(jsonb_build_object(
        'id',               udq.id,
        'quest_id',         udq.quest_id,
        'title',            dq.title_ru,
        'description',      dq.description_ru,
        'category',         dq.category,
        'difficulty',       dq.difficulty,
        'current_progress', udq.current_progress,
        'target_value',     dq.target_value,
        'reward_sp',        dq.reward_sp,
        'is_completed',     udq.is_completed,
        'is_claimed',       udq.is_claimed
    )) INTO v_quests
    FROM public.user_daily_quests udq
    JOIN public.daily_quest_definitions dq ON udq.quest_id = dq.id
    WHERE udq.user_id = v_user_id AND udq.assigned_at = v_today;

    RETURN COALESCE(v_quests, '[]'::jsonb);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_or_assign_daily_quests() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_assign_daily_quests() TO authenticated;
