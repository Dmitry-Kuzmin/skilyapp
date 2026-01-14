-- Проверка связи вопросов с темами
-- Выполни в Supabase SQL Editor

-- 1. Проверяем, заполнен ли topic_id у испанских вопросов
SELECT 
    id,
    topic_id,
    metadata->>'topic_number' as topic_number_from_metadata,
    question_es
FROM questions_new
WHERE country = 'es'
LIMIT 5;

-- 2. Смотрим ID темы №1 из справочника topics
SELECT id, number, title_es
FROM topics
WHERE number = 1;

-- 3. ИСПРАВЛЕНИЕ: Связываем испанские вопросы с темами по номеру
UPDATE questions_new
SET topic_id = (
    SELECT id FROM topics WHERE number = (metadata->>'topic_number')::integer
)
WHERE country = 'es' 
  AND metadata->>'topic_number' IS NOT NULL
  AND topic_id IS NULL;

-- 4. Проверка после исправления
SELECT 
    COUNT(*) as total,
    COUNT(topic_id) as with_topic_id
FROM questions_new
WHERE country = 'es';
