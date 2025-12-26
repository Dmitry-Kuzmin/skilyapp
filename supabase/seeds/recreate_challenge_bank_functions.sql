-- 1. Drop old signatures to avoid conflicts
DROP FUNCTION IF EXISTS get_challenge_bank_questions(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS get_challenge_bank_stats(UUID);

-- 2. Create new signatures
CREATE OR REPLACE FUNCTION get_challenge_bank_questions(
  p_user_id UUID,
  p_country TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 30,
  p_only_not_mastered BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  question_ru TEXT,
  question_es TEXT,
  question_en TEXT,
  image_url TEXT,
  explanation_ru TEXT,
  explanation_es TEXT,
  explanation_en TEXT,
  times_wrong INTEGER,
  times_reviewed INTEGER,
  last_wrong_at TIMESTAMP WITH TIME ZONE,
  mastered BOOLEAN,
  topic_title_ru TEXT,
  topic_title_es TEXT,
  country TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.question_ru,
    q.question_es,
    q.question_en,
    q.image_url,
    q.explanation_ru,
    q.explanation_es,
    q.explanation_en,
    ucq.times_wrong,
    ucq.times_reviewed,
    ucq.last_wrong_at,
    ucq.mastered,
    t.title_ru as topic_title_ru,
    t.title_es as topic_title_es,
    q.country
  FROM user_challenge_questions ucq
  JOIN questions_new q ON q.id = ucq.question_id
  LEFT JOIN topics t ON t.id = q.topic_id
  WHERE ucq.user_id = p_user_id
    AND (p_country IS NULL OR q.country = p_country)
    AND (NOT p_only_not_mastered OR ucq.mastered = false)
  ORDER BY ucq.last_wrong_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_challenge_bank_stats(
  p_user_id UUID,
  p_country TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_questions INTEGER,
  mastered_questions INTEGER,
  needs_practice INTEGER,
  avg_wrong_count NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_questions,
    COUNT(*) FILTER (WHERE ucq.mastered = true)::INTEGER as mastered_questions,
    COUNT(*) FILTER (WHERE ucq.mastered = false)::INTEGER as needs_practice,
    ROUND(AVG(ucq.times_wrong)::NUMERIC, 2) as avg_wrong_count
  FROM user_challenge_questions ucq
  JOIN questions_new q ON q.id = ucq.question_id
  WHERE ucq.user_id = p_user_id
    AND (p_country IS NULL OR q.country = p_country);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
