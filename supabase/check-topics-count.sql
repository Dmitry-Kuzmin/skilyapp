-- Проверяем количество вопросов по темам в таблице questions_new
-- Этот запрос показывает, сколько вопросов в каждой теме

WITH topics_unnested AS (
  SELECT 
    jsonb_array_elements_text(metadata->'topics') AS topic_name
  FROM questions_new
  WHERE country = 'ru'
    AND metadata->'topics' IS NOT NULL
)
SELECT 
  topic_name,
  COUNT(*) as question_count
FROM topics_unnested
GROUP BY topic_name
ORDER BY question_count DESC;
