-- Очистка испанских вопросов из базы данных
-- Выполни этот SQL в Supabase Dashboard -> SQL Editor

-- Шаг 1: Удаляем варианты ответов для испанских вопросов
DELETE FROM answer_options 
WHERE question_id IN (
    SELECT id FROM questions_new WHERE country = 'es'
);

-- Шаг 2: Удаляем сами испанские вопросы
DELETE FROM questions_new 
WHERE country = 'es';

-- Проверка: Должно вернуть 0 вопросов для Испании
SELECT country, COUNT(*) as total
FROM questions_new
GROUP BY country;
