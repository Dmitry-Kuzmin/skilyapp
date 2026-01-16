-- Проверяем ещё раз количество вопросов по темам для Испании
-- После нашей реализации

WITH topics_extracted AS (
  SELECT 
    id,
    substring(metadata->>'test_id' from '^topic-(\d+)_') as topic_number
  FROM questions_new
  WHERE country = 'es'
    AND metadata->>'test_id' LIKE 'topic-%'
)
SELECT 
  topic_number,
  COUNT(*) as question_count
FROM topics_extracted
WHERE topic_number IS NOT NULL
GROUP BY topic_number
ORDER BY topic_number;
