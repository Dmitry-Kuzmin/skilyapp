
-- Update get_random_duel_questions to support 'ru_cd' country code for C/D category
-- and fix missing category_id column usage (mapping to topic_id)

CREATE OR REPLACE FUNCTION get_random_duel_questions(
    p_limit INT,
    p_categories UUID[] DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'spain'
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
DECLARE
    v_country_code TEXT;
    v_ticket_category TEXT;
BEGIN
    -- Map country + category
    IF p_country = 'ru_cd' THEN
       v_country_code := 'ru';
       v_ticket_category := 'C_D';
    ELSIF p_country = 'russia' OR p_country = 'ru' THEN
       v_country_code := 'ru';
       v_ticket_category := 'A_B'; -- Default A/B
    ELSE
       -- spain/es/others
       v_country_code := CASE WHEN p_country = 'spain' THEN 'es' ELSE COALESCE(p_country, 'es') END;
       v_ticket_category := NULL;
    END IF;

    RETURN QUERY
    SELECT 
        q.id,
        q.question_ru,
        q.question_es,
        q.question_en,
        q.image_url,
        q.difficulty,
        q.topic_id AS category_id, -- Map topic_id to category_id
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
        (q.country = v_country_code)
        AND (p_difficulty IS NULL OR p_difficulty = 'mix' OR q.difficulty = p_difficulty)
        AND (p_categories IS NULL OR q.topic_id = ANY(p_categories))
        -- C/D Filtering for Russia
        AND (
            v_ticket_category IS NULL OR
            (v_ticket_category = 'C_D' AND q.metadata->>'ticket_category' = 'C_D') OR
            (v_ticket_category = 'A_B' AND (q.metadata->>'ticket_category' IS NULL OR q.metadata->>'ticket_category' != 'C_D'))
        )
    ORDER BY random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
