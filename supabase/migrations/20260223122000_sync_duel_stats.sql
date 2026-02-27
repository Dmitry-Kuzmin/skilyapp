-- Эдинственный правильный скрипт для синхронизации дуэлей
CREATE OR REPLACE FUNCTION public.sync_all_duel_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_user RECORD;
    v_processed_count INT := 0;
    v_result JSONB;
BEGIN
    FOR v_user IN 
        SELECT id FROM profiles
    LOOP
        -- Подсчитываем реальную стату для пользователя
        WITH user_duels AS (
            SELECT 
                d.id as duel_id,
                d.winner_id,
                d.is_draw,
                dp.score
            FROM duel_players dp
            JOIN duels d ON d.id = dp.duel_id
            WHERE dp.user_id = v_user.id
            AND d.status = 'finished'
        ),
        aggregated_stats AS (
            SELECT 
                COUNT(*) as total_count,
                COUNT(CASE WHEN winner_id = v_user.id THEN 1 END) as wins_count,
                COUNT(CASE WHEN is_draw = true THEN 1 END) as draws_count,
                COUNT(CASE WHEN winner_id != v_user.id AND is_draw = false THEN 1 END) as losses_count,
                COALESCE(SUM(score), 0) as total_points
            FROM user_duels
        )
        -- Обновляем duel_stats
        UPDATE duel_stats
        SET 
            total_duels = aggregated_stats.total_count,
            wins = aggregated_stats.wins_count,
            draws = aggregated_stats.draws_count,
            losses = aggregated_stats.losses_count,
            total_points = aggregated_stats.total_points,
            avg_score = CASE WHEN aggregated_stats.total_count > 0 
                             THEN (aggregated_stats.total_points::NUMERIC / aggregated_stats.total_count) 
                             ELSE 0 END,
            updated_at = NOW()
        FROM aggregated_stats
        WHERE user_id = v_user.id AND aggregated_stats.total_count > 0;

        -- Если записи не было, но дуэли есть, вставляем
        INSERT INTO duel_stats (user_id, total_duels, wins, draws, losses, total_points, avg_score, updated_at)
        SELECT 
            v_user.id, 
            total_count, 
            wins_count, 
            draws_count, 
            losses_count, 
            total_points,
            CASE WHEN total_count > 0 THEN (total_points::NUMERIC / total_count) ELSE 0 END,
            NOW()
        FROM (
            SELECT 
                COUNT(*) as total_count,
                COUNT(CASE WHEN winner_id = v_user.id THEN 1 END) as wins_count,
                COUNT(CASE WHEN is_draw = true THEN 1 END) as draws_count,
                COUNT(CASE WHEN winner_id != v_user.id AND is_draw = false THEN 1 END) as losses_count,
                COALESCE(SUM(score), 0) as total_points
            FROM (
                SELECT 
                    d.winner_id,
                    d.is_draw,
                    dp.score
                FROM duel_players dp
                JOIN duels d ON d.id = dp.duel_id
                WHERE dp.user_id = v_user.id
                AND d.status = 'finished'
            ) ud
        ) s
        WHERE s.total_count > 0
        ON CONFLICT (user_id) DO NOTHING;
        
        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_users', v_processed_count
    );
END;
$$;
