-- Fix RLS for duel_questions to ensure users can download questions
ALTER TABLE public.duel_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view questions" ON public.duel_questions;

CREATE POLICY "Users can view questions"
ON public.duel_questions
FOR SELECT
TO authenticated, anon
USING (true);

-- Ensure get_dashboard_super exists (fixing 404 error)
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
    notif_count INT;
BEGIN
    -- Profile
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
    ) INTO profile_data FROM profiles WHERE id = p_user_id;

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

    -- Daily Bonus
    SELECT json_build_object(
        'id', id,
        'current_streak', current_streak,
        'last_claimed_date', last_claimed_date,
        'total_claims', total_claims,
        'can_claim', (last_claimed_date IS NULL OR last_claimed_date < CURRENT_DATE)
    ) INTO bonus_data FROM user_daily_bonus WHERE user_id = p_user_id;

    -- Active Season
    SELECT json_build_object(
        'id', id,
        'season_number', season_number,
        'name_ru', name_ru,
        'name_es', name_es,
        'name_en', name_en,
        'theme', theme,
        'start_date', start_date,
        'end_date', end_date,
        'days_remaining', EXTRACT(DAY FROM (end_date - NOW()))
    ) INTO active_season_data FROM duel_seasons WHERE NOW() BETWEEN start_date AND end_date LIMIT 1;

    -- Season Progress
    SELECT row_to_json(sp) INTO season_progress_data FROM duel_season_progress sp 
    WHERE user_id = p_user_id AND season_id = (active_season_data->>'id')::INT;

    -- Notifications
    SELECT COUNT(*) INTO notif_count FROM duel_notifications 
    WHERE profile_id = p_user_id AND (is_read IS FALSE OR is_read IS NULL);

    SELECT json_build_object(
        'profile', profile_data,
        'stats', stats_data,
        'readiness', readiness_data,
        'daily_bonus', bonus_data,
        'active_season', active_season_data,
        'season_progress', season_progress_data,
        'unread_notifications_count', notif_count
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions specifically for this function
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO service_role;
