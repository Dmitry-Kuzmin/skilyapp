-- Fix duplicate daily_login entries in license points audit.
--
-- Problem: process_license_event lost its internal idempotency guard during
-- the 20260409000000 refactor. Daily-login dedup was scattered across callers
-- (Edge Function user_daily_bonus check, RPC v2/v3 EXISTS checks), each with
-- its own implementation, plus a race window between the EXISTS check and the
-- insert. Result: same-day duplicates in user_license_points_audit and
-- inflated profiles.license_points.
--
-- Fix: make process_license_event itself idempotent for daily_login + add a
-- partial unique index as a hard DB-level guarantee. Clean up existing
-- duplicates and recompute license_points from the deduplicated audit log.

BEGIN;

-- created_at::date is timezone-dependent (not IMMUTABLE), so we need an
-- explicit IMMUTABLE helper for the partial unique index expression.
CREATE OR REPLACE FUNCTION public.tstz_utc_date(ts TIMESTAMPTZ)
RETURNS DATE LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
    SELECT (ts AT TIME ZONE 'UTC')::date
$$;

-- 1. Remove duplicate daily_login rows: keep the earliest per (user, day).
DELETE FROM public.user_license_points_audit a
USING public.user_license_points_audit b
WHERE a.event_type = 'daily_login'
  AND b.event_type = 'daily_login'
  AND a.user_id = b.user_id
  AND public.tstz_utc_date(a.created_at) = public.tstz_utc_date(b.created_at)
  AND a.created_at > b.created_at;

-- 2. Recompute license_points from the (now clean) audit log.
--    Starting balance is 8, clamped to [0, 15].
UPDATE public.profiles p
SET license_points = sub.recalc
FROM (
    SELECT user_id,
           GREATEST(0, LEAST(15, 8 + COALESCE(SUM(delta), 0)))::SMALLINT AS recalc
    FROM public.user_license_points_audit
    GROUP BY user_id
) sub
WHERE p.id = sub.user_id
  AND p.license_points IS DISTINCT FROM sub.recalc;

-- 3. Hard DB-level invariant: at most one daily_login per user per calendar day.
CREATE UNIQUE INDEX IF NOT EXISTS user_license_points_audit_daily_login_once_per_day
ON public.user_license_points_audit (user_id, public.tstz_utc_date(created_at))
WHERE event_type = 'daily_login';

-- 4. Single source of truth for license events. Idempotent for daily_login.
CREATE OR REPLACE FUNCTION public.process_license_event(
    p_user_id      UUID,
    p_event_type   TEXT,
    p_custom_date  TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta      INTEGER;
    v_old_points INTEGER;
    v_new_points INTEGER;
BEGIN
    CASE p_event_type
        WHEN 'daily_login'         THEN v_delta :=  1;
        WHEN 'inactivity_decay'    THEN v_delta := -1;
        WHEN 'rehabilitation_pass' THEN v_delta :=  2;
        WHEN 'exam_pass'           THEN v_delta :=  1;
        WHEN 'exam_fail'           THEN v_delta := -1;
        ELSE RETURN;
    END CASE;

    -- daily_login fires at most once per UTC calendar day per user
    IF p_event_type = 'daily_login' AND EXISTS (
        SELECT 1 FROM public.user_license_points_audit
        WHERE user_id = p_user_id
          AND event_type = 'daily_login'
          AND public.tstz_utc_date(created_at) = public.tstz_utc_date(p_custom_date)
    ) THEN
        RETURN;
    END IF;

    SELECT license_points INTO v_old_points FROM public.profiles WHERE id = p_user_id;
    v_old_points := COALESCE(v_old_points, 8);
    v_new_points := GREATEST(0, LEAST(15, v_old_points + v_delta));

    -- Race-safe: if a concurrent transaction beat us to the daily_login insert,
    -- the partial unique index throws unique_violation and the EXCEPTION block
    -- rolls back this savepoint (including the profiles UPDATE).
    BEGIN
        UPDATE public.profiles
        SET license_points      = v_new_points,
            last_daily_point_at = CASE
                WHEN p_event_type = 'daily_login' THEN CURRENT_DATE
                ELSE last_daily_point_at
            END
        WHERE id = p_user_id;

        INSERT INTO public.user_license_points_audit
            (user_id, old_points, new_points, delta, event_type, created_at)
        VALUES
            (p_user_id, v_old_points, v_new_points, v_delta, p_event_type, p_custom_date);

        INSERT INTO public.user_license_points_history (user_id, points, recorded_at)
        VALUES (p_user_id, v_new_points, p_custom_date::DATE)
        ON CONFLICT (user_id, recorded_at) DO UPDATE SET points = EXCLUDED.points;
    EXCEPTION WHEN unique_violation THEN
        RETURN;
    END;
END;
$$;

COMMIT;
