-- Проверяем структуру metadata для испанских вопросов
-- Чтобы понять, есть ли там поле topics

SELECT 
  id,
  metadata
FROM questions_new
WHERE country = 'es'
LIMIT 5;
