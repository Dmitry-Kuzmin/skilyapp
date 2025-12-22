import json
import http.client

# Read .env.local
env = {}
with open('.env.local', 'r') as f:
    for line in f:
        if '=' in line:
            parts = line.strip().split('=', 1)
            if len(parts) == 2:
                key, val = parts
                env[key] = val.strip('"').strip("'")

# Clean drop and correct create
sql = """
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT oid, proname, proargtypes::regtype[] as args FROM pg_proc WHERE proname = 'get_dashboard_super')
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regclass || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_dashboard_super(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    profile_data JSON;
    stats_data JSON;
    readiness_data JSON;
    bonus_data JSON;
    active_season_data JSON;
    season_progress_data JSON;
    premium_data JSON;
    notif_count INT;
    v_subscription_status TEXT;
    v_subscription_expires_at TIMESTAMPTZ;
    v_premium_forever_purchased_at TIMESTAMPTZ;
BEGIN
    -- Profile + Premium fields
    SELECT json_build_object(
        'id', id,
        'rank', rank,
        'xp', xp,
        'coins', coins,
        'boosts', boosts,
        'streak_days', streak_days,
        'photo_url', photo_url,
        'first_name', first_name,
        'last_name', last_name,
        'username', username,
        'settings', settings,
        'win_streak', win_streak
    ),
    subscription_status,
    subscription_expires_at,
    premium_forever_purchased_at
    INTO profile_data, v_subscription_status, v_subscription_expires_at, v_premium_forever_purchased_at 
    FROM profiles WHERE id = p_user_id;

    -- Premium data
    IF profile_data IS NOT NULL THEN
        SELECT json_build_object(
            'subscription_status', v_subscription_status,
            'subscription_end_date', v_subscription_expires_at,
            'is_premium', CASE 
                WHEN v_subscription_status = 'lifetime' THEN true
                WHEN v_subscription_status = 'pro' AND (v_subscription_expires_at IS NULL OR v_subscription_expires_at > NOW()) THEN true
                WHEN v_subscription_status = 'active' AND v_subscription_expires_at > NOW() THEN true
                WHEN v_subscription_status = 'trial' AND v_subscription_expires_at > NOW() THEN true
                WHEN v_premium_forever_purchased_at IS NOT NULL THEN true
                ELSE false
            END,
            'trial_days_remaining', CASE 
                WHEN v_subscription_status = 'trial' AND v_subscription_expires_at > NOW() 
                THEN EXTRACT(DAY FROM (v_subscription_expires_at - NOW()))
                ELSE 0
            END
        ) INTO premium_data;
    ELSE
        premium_data := json_build_object('is_premium', false);
    END IF;

    -- Stats (from game_sessions)
    SELECT json_build_object(
        'tests_completed', (SELECT COUNT(*) FROM game_sessions WHERE user_id = p_user_id),
        'total_questions', (SELECT COALESCE(SUM(total_questions), 0) FROM game_sessions WHERE user_id = p_user_id),
        'correct_answers', (SELECT COALESCE(SUM(score), 0) FROM game_sessions WHERE user_id = p_user_id),
        'accuracy', (SELECT CASE WHEN SUM(total_questions) > 0 THEN ROUND(SUM(score)::NUMERIC / SUM(total_questions) * 100) ELSE 0 END FROM game_sessions WHERE user_id = p_user_id)
    ) INTO stats_data;

    -- Readiness
    SELECT json_build_object(
        'topics_covered_percent', 0,
        'unique_questions_answered', (SELECT COUNT(DISTINCT question_id) FROM game_answers WHERE user_id = p_user_id),
        'topics_with_answers', 0
    ) INTO readiness_data;

    -- Daily Bonus (with exception handling)
    BEGIN
        SELECT json_build_object(
            'id', id,
            'current_streak', current_streak,
            'last_claimed_date', last_claimed_date,
            'total_claims', total_claims,
            'can_claim', (last_claimed_date IS NULL OR last_claimed_date < CURRENT_DATE)
        ) INTO bonus_data FROM user_daily_bonus WHERE user_id = p_user_id;
    EXCEPTION WHEN others THEN
        bonus_data := NULL;
    END;

    -- Active Season (with exception handling)
    BEGIN
        SELECT json_build_object(
            'id', id,
            'season_number', season_number,
            'name_ru', name_ru,
            'name_es', name_es,
            'name_en', name_en,
            'theme', theme,
            'start_date', start_date,
            'end_date', end_date,
            'days_remaining', COALESCE(EXTRACT(DAY FROM (end_date - NOW())), 0)
        ) INTO active_season_data FROM duel_pass_seasons WHERE is_active = true AND NOW() BETWEEN start_date AND end_date LIMIT 1;
    EXCEPTION WHEN others THEN
        active_season_data := NULL;
    END;

    -- Season Progress (with exception handling)
    BEGIN
        IF active_season_data IS NOT NULL THEN
            SELECT row_to_json(sp) INTO season_progress_data FROM user_season_progress sp 
            WHERE user_id = p_user_id AND season_id = (active_season_data->>'id')::INT;
        ELSE
            season_progress_data := NULL;
        END IF;
    EXCEPTION WHEN others THEN
        season_progress_data := NULL;
    END;

    -- Notifications (with exception handling)
    BEGIN
        SELECT COUNT(*) INTO notif_count FROM duel_notifications 
        WHERE user_id = p_user_id AND (is_read IS FALSE OR is_read IS NULL);
    EXCEPTION WHEN others THEN
        notif_count := 0;
    END;

    SELECT json_build_object(
        'profile', profile_data,
        'stats', stats_data,
        'readiness', readiness_data,
        'daily_bonus', bonus_data,
        'premium', premium_data,
        'active_season', active_season_data,
        'season_progress', season_progress_data,
        'unread_notifications_count', notif_count
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO service_role;
"""

host = "yffjnqegeiorunyvcxkn.supabase.co"
path = "/functions/v1/apply-sql"
headers = {
    "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
    "Content-Type": "application/json"
}
body = json.dumps({"sql": sql})

conn = http.client.HTTPSConnection(host)
conn.request("POST", path, body, headers)
response = conn.getresponse()
print(response.status, response.reason)
print(response.read().decode())
conn.close()
