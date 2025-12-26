CREATE OR REPLACE FUNCTION get_user_tickets_status(p_user_id UUID, p_country TEXT DEFAULT 'ru')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_country TEXT;
BEGIN
    -- Нормализуем код страны
    v_country := CASE 
        WHEN p_country = 'russia' THEN 'ru'
        WHEN p_country = 'spain' THEN 'es'
        ELSE p_country
    END;

    WITH ticket_stats AS (
        SELECT 
            (metadata->>'ticket_number')::TEXT as ticket_num,
            COUNT(*) as total_count,
            COUNT(up.id) as answered_count,
            COUNT(up.id) FILTER (WHERE up.is_correct = true) as correct_count
        FROM questions_new qn
        LEFT JOIN user_progress up ON up.question_id = qn.id AND up.user_id = p_user_id
        WHERE (qn.country = v_country OR qn.country = p_country OR p_country IS NULL)
          AND (metadata->>'ticket_number') IS NOT NULL
        GROUP BY 1
    )
    SELECT jsonb_object_agg(ticket_num, status_data)
    INTO v_result
    FROM (
        SELECT 
            ticket_num,
            jsonb_build_object(
                'answered', answered_count,
                'correct', correct_count,
                'total', total_count,
                'completed', (answered_count >= total_count AND total_count > 0),
                'score', CASE WHEN total_count > 0 THEN (correct_count * 100 / total_count) ELSE 0 END
            ) as status_data
        FROM ticket_stats
        WHERE ticket_num IS NOT NULL
    ) sub;
    
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
