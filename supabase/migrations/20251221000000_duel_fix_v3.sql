-- Migration: Duel Fix v3.2
-- 1. DROP trigger first to allow dropping the function
DROP TRIGGER IF EXISTS on_duel_finished_payout ON duels;

-- 2. DROP functions with CASCADE just in case, and to handle parameter changes
DROP FUNCTION IF EXISTS get_random_duel_questions(INT, UUID[], TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_super(UUID) CASCADE;
DROP FUNCTION IF EXISTS handle_duel_payout_atomic() CASCADE;

-- 1. get_random_duel_questions
CREATE OR REPLACE FUNCTION get_random_duel_questions(
    p_limit INT,
    p_categories UUID[] DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    question_ru TEXT,
    question_es TEXT,
    question_en TEXT,
    image_url TEXT,
    difficulty TEXT,
    category_id UUID,
    answer_options JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.question_ru,
        q.question_es,
        q.question_en,
        q.image_url,
        q.difficulty,
        q.category_id,
        COALESCE(
            (
                SELECT json_agg(json_build_object(
                    'id', ao.id,
                    'text_ru', ao.text_ru,
                    'text_es', ao.text_es,
                    'text_en', ao.text_en,
                    'is_correct', ao.is_correct,
                    'position', ao.position
                ) ORDER BY ao.position)
                FROM answer_options ao
                WHERE ao.question_id = q.id
            ),
            '[]'::json
        ) as answer_options
    FROM questions_new q
    WHERE 
        (p_difficulty IS NULL OR p_difficulty = 'mix' OR q.difficulty = p_difficulty)
        AND (p_categories IS NULL OR q.category_id = ANY(p_categories))
    ORDER BY random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. get_dashboard_super
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

-- 3. handle_duel_payout_atomic
CREATE OR REPLACE FUNCTION handle_duel_payout_atomic()
RETURNS TRIGGER AS $$
DECLARE
    player RECORD;
    is_draw_bool BOOLEAN;
    win_bonus INT := 0;
BEGIN
    -- Only handle 'finished' status
    IF NEW.status != 'finished' OR OLD.status = 'finished' THEN
        RETURN NEW;
    END IF;

    is_draw_bool := COALESCE(NEW.is_draw, false);

    -- Draw processing
    IF is_draw_bool THEN
        FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
            -- Refund bet if any
            IF NEW.bet_amount > 0 AND player.is_bot IS FALSE THEN
                UPDATE profiles SET coins = coins + NEW.bet_amount WHERE id = player.user_id;
                
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, NEW.bet_amount, 'refund')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
            END IF;

            -- Base reward for draw (10 coins)
            IF player.is_bot IS FALSE THEN
                UPDATE profiles SET coins = coins + 10 WHERE id = player.user_id;
                
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, 10, 'base_payout')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
            END IF;
        END LOOP;
    -- Win processing
    ELSIF NEW.winner_id IS NOT NULL THEN
        FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
            IF player.user_id = NEW.winner_id AND player.is_bot IS FALSE THEN
                -- Payout (2x bet or 20 base)
                win_bonus := CASE WHEN NEW.bet_amount > 0 THEN NEW.bet_amount * 2 ELSE 20 END;
                
                UPDATE profiles SET 
                    coins = coins + win_bonus,
                    xp = xp + 50,
                    win_streak = win_streak + 1
                WHERE id = player.user_id;

                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, win_bonus, 'win_payout')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
                
            ELSIF player.is_bot IS FALSE THEN
                -- Reset win streak for the loser
                UPDATE profiles SET win_streak = 0 WHERE id = player.user_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
-- IMPORTANT: Trigger must be created AFTER the function
DROP TRIGGER IF EXISTS on_duel_finished_payout ON duels;
CREATE TRIGGER on_duel_finished_payout
AFTER UPDATE ON duels
FOR EACH ROW
EXECUTE FUNCTION handle_duel_payout_atomic();

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_random_duel_questions(INT, UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_random_duel_questions(INT, UUID[], TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_super(UUID) TO anon;
GRANT EXECUTE ON FUNCTION handle_duel_payout_atomic() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_duel_payout_atomic() TO anon;
GRANT EXECUTE ON FUNCTION handle_duel_payout_atomic() TO service_role;
