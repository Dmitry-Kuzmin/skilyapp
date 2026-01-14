-- RPC функция для подсчета вопросов по темам
-- Выполни в Supabase Dashboard -> SQL Editor

CREATE OR REPLACE FUNCTION get_topic_question_counts(p_country TEXT)
RETURNS TABLE (
  topic_number INTEGER,
  question_count BIGINT
) 
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (metadata->>'topic_number')::integer AS topic_number,
    COUNT(*)::bigint AS question_count
  FROM questions_new
  WHERE country = p_country
  GROUP BY metadata->>'topic_number'
  ORDER BY (metadata->>'topic_number')::integer;
END;
$function$;

-- Проверка (должна вернуть: topic_number=1, question_count=30)
SELECT * FROM get_topic_question_counts('es');
