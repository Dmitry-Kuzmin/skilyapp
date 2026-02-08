-- Проверка структуры metadata для вопросов России
-- Посмотрим что в ticket_category

SELECT 
    id,
    country,
    metadata->>'ticket_category' as ticket_category,
    metadata->>'ticket_number' as ticket_number,
    metadata->>'question_number' as question_number,
    metadata->>'original_ticket_number' as original_ticket_number,
    SUBSTRING(question_ru, 1, 50) as question_preview
FROM questions_new 
WHERE country = 'ru'
LIMIT 20;

-- Посмотрим распределение по ticket_category
SELECT 
    metadata->>'ticket_category' as category,
    COUNT(*) as count
FROM questions_new 
WHERE country = 'ru'
GROUP BY metadata->>'ticket_category'
ORDER BY count DESC;
