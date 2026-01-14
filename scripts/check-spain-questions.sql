-- Проверка испанских вопросов в базе
-- Выполни в Supabase SQL Editor

-- 1. Сколько всего испанских вопросов?
SELECT COUNT(*) as total_questions
FROM questions_new
WHERE country = 'es';

-- 2. Разбивка по темам
SELECT 
    metadata->>'topic_number' as topic,
    COUNT(*) as questions_count
FROM questions_new
WHERE country = 'es'
GROUP BY metadata->>'topic_number'
ORDER BY (metadata->>'topic_number')::int;

-- 3. Есть ли поле topic_id?
SELECT 
    id,
    metadata->>'topic_number' as topic_number,
    metadata->>'question_number' as question_number,
    question_es
FROM questions_new
WHERE country = 'es'
LIMIT 5;
