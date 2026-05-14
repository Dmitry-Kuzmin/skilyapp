-- Fix: daily_test_limits FK caused 23503 for users without a public profile row.
-- Root cause: authenticated users exist in auth.users but the FK pointed to
-- public.users (profiles). Moving FK to auth.users so any logged-in user can
-- have a daily_test_limits row even if their profile trigger failed.

ALTER TABLE public.daily_test_limits
  DROP CONSTRAINT IF EXISTS daily_test_limits_user_id_fkey;

ALTER TABLE public.daily_test_limits
  ADD CONSTRAINT daily_test_limits_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Belt-and-suspenders: recreate increment_test_usage with an EXCEPTION block
-- so a future FK violation (or any other integrity error) fails open rather
-- than crashing the session.
CREATE OR REPLACE FUNCTION public.increment_test_usage(p_user_id uuid)
RETURNS TABLE(
  current_count  integer,
  daily_cap      integer,
  limit_reached  boolean,
  is_premium     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium  boolean := false;
  v_cap         integer := 5;
  v_count       integer := 0;
  v_ad_grants   integer := 0;
  v_date        date    := CURRENT_DATE;
BEGIN
  -- Premium check — user may not have a profile row yet; default to false
  SELECT COALESCE(p.is_premium, false)
  INTO   v_is_premium
  FROM   public.profiles p
  WHERE  p.id = p_user_id;

  IF v_is_premium THEN
    -- Premium users are never limited
    RETURN QUERY SELECT 0, 999999, false, true;
    RETURN;
  END IF;

  -- Upsert daily count
  INSERT INTO public.daily_test_limits (user_id, test_date, test_count)
  VALUES (p_user_id, v_date, 1)
  ON CONFLICT (user_id, test_date)
  DO UPDATE SET test_count = public.daily_test_limits.test_count + 1
  RETURNING public.daily_test_limits.test_count INTO v_count;

  -- Ad grants extend the daily cap
  SELECT COALESCE(dtl.ad_grants, 0)
  INTO   v_ad_grants
  FROM   public.daily_test_limits dtl
  WHERE  dtl.user_id = p_user_id
    AND  dtl.test_date = v_date;

  v_cap := v_cap + v_ad_grants;

  RETURN QUERY
    SELECT v_count,
           v_cap,
           (v_count > v_cap),
           v_is_premium;

EXCEPTION WHEN OTHERS THEN
  -- Fail open: never block a user because of a DB-level error
  RETURN QUERY SELECT 0, 5, false, false;
END;
$$;
