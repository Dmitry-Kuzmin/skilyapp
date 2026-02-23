-- Fix Dashboard RPC and Grants
-- 1. Correct process_license_event to remove missing country_code
CREATE OR REPLACE FUNCTION public.process_license_event(p_user_id UUID, p_event_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points SMALLINT;
    v_points_delta INTEGER := 0;
    v_new_points INTEGER;
    v_result JSONB;
    v_last_daily DATE;
BEGIN
    -- Get current user state (Removed country_code as it is not in profiles)
    SELECT license_points, last_daily_point_at INTO v_current_points, v_last_daily
    FROM profiles WHERE id = p_user_id;

    -- Define rules
    CASE p_event_type
        WHEN 'daily_login' THEN 
            -- Check if already got points today
            IF v_last_daily IS NOT NULL AND v_last_daily = CURRENT_DATE THEN
                v_points_delta := 0;
            ELSE
                v_points_delta := 1;
            END IF;
        WHEN 'topic_perfect' THEN v_points_delta := 1;
        WHEN 'marathon_completed' THEN v_points_delta := 2;
        WHEN 'exam_pass' THEN v_points_delta := 1;
        WHEN 'exam_fail' THEN v_points_delta := -2;
        WHEN 'critical_error' THEN v_points_delta := -2; 
        WHEN 'inactivity_decay' THEN v_points_delta := -1;
        WHEN 'rehabilitation_pass' THEN 
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

    -- CAP for passive growth: Daily login can now take you to 10
    IF p_event_type = 'daily_login' THEN
        IF v_current_points < 10 AND v_new_points > 10 THEN
            v_new_points := 10;
        ELSIF v_current_points >= 10 THEN
            v_new_points := v_current_points;
        END IF;

        IF v_points_delta > 0 OR v_new_points >= 10 THEN
             UPDATE profiles SET last_daily_point_at = CURRENT_DATE WHERE id = p_user_id;
        END IF;
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
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[process_license_event] failed: %', SQLERRM;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 2. Ensure get_dashboard_super_v2 has proper grants and path
GRANT EXECUTE ON FUNCTION public.get_dashboard_super_v2(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_license_event(UUID, TEXT) TO authenticated, anon;

-- Extra layer of safety for unread_notifications_count
-- If duel_notifications table doesn't exist yet, we don't want the RPC to fail
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'duel_notifications') THEN
        CREATE TABLE IF NOT EXISTS public.duel_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            duel_id UUID,
            type TEXT,
            title TEXT,
            message TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        -- Basic grants
        GRANT SELECT, UPDATE ON public.duel_notifications TO authenticated, anon;
    END IF;
END $$;
