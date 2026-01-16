-- Проверяем фильтр по metadata->test_id для Испании
-- Чтобы понять, работает ли LIKE фильтр

SELECT 
  id,
  question_es,
  metadata->>'test_id' as test_id
FROM questions_new
WHERE country = 'es'
  AND metadata->>'test_id' LIKE '%topic-01_%'
LIMIT 5;
