-- Fix: process_license_event was not inserting old_points/new_points into audit
-- These columns are NOT NULL, causing constraint violation → silent rollback via EXCEPTION handler
-- Result: points never changed, journal never updated

CREATE OR REPLACE FUNCTION public.process_license_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_custom_date TIMESTAMP WITH TIME ZONE DEFAULT now()
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
        ELSE v_delta := 0;
    END CASE;

    IF v_delta = 0 THEN RETURN; END IF;

    -- Читаем текущее значение до обновления
    SELECT license_points INTO v_old_points FROM public.profiles WHERE id = p_user_id;
    v_old_points := COALESCE(v_old_points, 8);

    -- Считаем новое значение с ограничением 0–15
    v_new_points := GREATEST(0, LEAST(15, v_old_points + v_delta));

    UPDATE public.profiles
    SET
        license_points      = v_new_points,
        last_daily_point_at = CASE WHEN p_event_type = 'daily_login' THEN CURRENT_DATE ELSE last_daily_point_at END
    WHERE id = p_user_id;

    -- Вставляем в аудит со всеми обязательными полями (old_points, new_points NOT NULL)
    INSERT INTO public.user_license_points_audit (user_id, old_points, new_points, delta, event_type, created_at)
    VALUES (p_user_id, v_old_points, v_new_points, v_delta, p_event_type, p_custom_date);

    -- Обновляем историю (для графика)
    INSERT INTO public.user_license_points_history (user_id, points, recorded_at)
    VALUES (p_user_id, v_new_points, p_custom_date::DATE)
    ON CONFLICT (user_id, recorded_at) DO UPDATE SET points = EXCLUDED.points;
END;
$$;
