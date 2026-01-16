-- Проверяем ВСЕ поля таблицы questions_new для испанских вопросов
-- Чтобы понять, где хранятся темы

SELECT 
  id,
  country,
  question_es,
  topic,  -- может быть отдельное поле?
  category, -- или категория?
  metadata
FROM questions_new
WHERE country = 'es'
LIMIT 3;
