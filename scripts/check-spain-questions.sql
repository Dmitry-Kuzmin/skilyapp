-- 📊 СТАТИСТИКА ВОПРОСОВ ПО ИСПАНИИ
-- Скопируй этот код в Supabase SQL Editor и нажми Run

-- 1. Общее количество вопросов для Испании
SELECT 
  count(*) as "Всего вопросов (Испания)", 
  count(*) filter (where topic_id is null) as "Без темы"
FROM questions_new 
WHERE country = 'spain';

-- 2. Детальная разбивка по темам (название темы + кол-во)
SELECT 
  t.name as "Тема", 
  count(q.id) as "Кол-во вопросов"
FROM questions_new q
LEFT JOIN topics t ON q.topic_id = t.id
WHERE q.country = 'spain'
GROUP BY t.name
ORDER BY count(q.id) DESC;

-- 3. Пример вопросов (первые 5)
SELECT 
  id, 
  substring(question->>'ru' from 1 for 50) as "Вопрос (RU)",
  topic_id
FROM questions_new 
WHERE country = 'spain' 
LIMIT 5;
