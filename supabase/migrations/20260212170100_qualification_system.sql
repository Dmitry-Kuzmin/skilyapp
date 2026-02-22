-- Migration: Advanced License Points Logic (Qualification System)
-- Handles complex rules for points and gating

CREATE OR REPLACE FUNCTION public.process_license_event(p_user_id UUID, p_event_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points SMALLINT;
    v_points_delta INTEGER := 0;
    v_new_points INTEGER;
    v_country_code TEXT;
    v_result JSONB;
BEGIN
    -- Get current user state
    SELECT license_points, country_code INTO v_current_points, v_country_code
    FROM profiles WHERE id = p_user_id;

    -- Define rules
    CASE p_event_type
        WHEN 'daily_login' THEN 
            -- Check if already processed today to avoid double points
            IF EXISTS (
                SELECT 1 FROM user_license_points_history 
                WHERE user_id = p_user_id AND recorded_at = CURRENT_DATE
            ) THEN
                v_points_delta := 0;
            ELSE
                v_points_delta := 1;
            END IF;
        WHEN 'topic_perfect' THEN v_points_delta := 1;
        WHEN 'marathon_completed' THEN v_points_delta := 2;
        WHEN 'exam_pass' THEN v_points_delta := 1;
        WHEN 'exam_fail' THEN v_points_delta := -2;
        WHEN 'critical_error' THEN v_points_delta := -2; -- E.g., running a red light in simulation
        WHEN 'inactivity_decay' THEN v_points_delta := -1; -- NEW: Regular decay for not studying
        WHEN 'rehabilitation_pass' THEN 
            -- Special case: restore to 6 points from 0
            v_new_points := 6;
            v_points_delta := 6 - v_current_points;
        ELSE
            v_points_delta := 0;
    END CASE;

    -- Calculate new points with caps
    IF p_event_type != 'rehabilitation_pass' THEN
        v_new_points := v_current_points + v_points_delta;
    END IF;

    -- Clamping (Total min 0, max 15)
    v_new_points := GREATEST(0, LEAST(15, v_new_points));

    -- CAP for passive growth: Daily login can now take you to 10 (Exam unlock)
    -- This allows active users to eventually unlock exams just by visiting,
    -- but they still need tests to reach 15 (Expert).
    IF p_event_type = 'daily_login' AND v_current_points < 10 AND v_new_points > 10 THEN
        v_new_points := 10;
    ELSIF p_event_type = 'daily_login' AND v_current_points >= 10 THEN
        -- Don't add points via daily_login if already at 10 or more, 
        -- but DON'T reduce points either!
        v_new_points := v_current_points;
    END IF;

    -- Update profile
    UPDATE profiles SET license_points = v_new_points WHERE id = p_user_id;

    -- Record in history
    INSERT INTO user_license_points_history (user_id, points, recorded_at)
    VALUES (p_user_id, v_new_points, CURRENT_DATE)
    ON CONFLICT (user_id, recorded_at) DO UPDATE SET points = EXCLUDED.points;

    -- Build return data
    v_result := jsonb_build_object(
        'old_points', v_current_points,
        'new_points', v_new_points,
        'delta', v_points_delta,
        'event', p_event_type,
        'exam_unlocked', v_new_points >= 10
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_license_event(UUID, TEXT) TO authenticated;
