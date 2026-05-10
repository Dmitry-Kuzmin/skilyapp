-- Logic: if daily_login was already awarded today, negative events (exam_fail,
-- inactivity_decay) must not fire on the same UTC day.
-- Reason: the user opened the app → earned their point → that day is "safe".

BEGIN;

-- 1. Remove existing exam_fail / inactivity_decay entries on days where
--    daily_login also exists for the same user.
DELETE FROM public.user_license_points_audit a
WHERE a.event_type IN ('exam_fail', 'inactivity_decay')
  AND EXISTS (
      SELECT 1 FROM public.user_license_points_audit b
      WHERE b.user_id  = a.user_id
        AND b.event_type = 'daily_login'
        AND public.tstz_utc_date(b.created_at) = public.tstz_utc_date(a.created_at)
  );

-- 2. Recalculate profiles.license_points from the now-clean audit log.
--    Baseline = 8 (DEFAULT at account creation) + sum of all remaining deltas,
--    clamped to [0, 15].
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

-- 3. Rewrite process_license_event with the new rule baked in:
--    negative delta events are silently skipped on days already covered by
--    a daily_login for the same user.
CREATE OR REPLACE FUNCTION public.process_license_event(
    p_user_id     UUID,
    p_event_type  TEXT,
    p_custom_date TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta      INTEGER := 0;
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

    -- daily_login fires at most once per UTC calendar day.
    IF p_event_type = 'daily_login' AND EXISTS (
        SELECT 1 FROM public.user_license_points_audit
        WHERE user_id    = p_user_id
          AND event_type = 'daily_login'
          AND public.tstz_utc_date(created_at) = public.tstz_utc_date(p_custom_date)
    ) THEN
        RETURN;
    END IF;

    -- Negative events are suppressed on days when the user already earned a
    -- daily_login: opening the app today guarantees a "safe" day.
    IF v_delta < 0 AND EXISTS (
        SELECT 1 FROM public.user_license_points_audit
        WHERE user_id    = p_user_id
          AND event_type = 'daily_login'
          AND public.tstz_utc_date(created_at) = public.tstz_utc_date(p_custom_date)
    ) THEN
        RETURN;
    END IF;

    SELECT license_points INTO v_old_points FROM public.profiles WHERE id = p_user_id;
    v_old_points := COALESCE(v_old_points, 8);
    v_new_points := GREATEST(0, LEAST(15, v_old_points + v_delta));

    -- Race-condition guard: if a parallel transaction sneaks in an identical
    -- daily_login (before our INSERT), the unique index raises unique_violation
    -- and the implicit savepoint rolls back both the UPDATE and INSERT cleanly.
    BEGIN
        UPDATE public.profiles
        SET license_points      = v_new_points,
            last_daily_point_at = CASE WHEN p_event_type = 'daily_login'
                                       THEN CURRENT_DATE
                                       ELSE last_daily_point_at END
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
