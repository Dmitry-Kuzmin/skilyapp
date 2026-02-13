-- Приводим все вопросы России к единому коду 'russia'
UPDATE questions_new 
SET country = 'russia' 
WHERE country = 'ru';

-- Удаляем возможные дубликаты, которые могли появиться из-за разных кодов стран
-- (Скрипт импорта использует upsert по ID, так что это просто мера предосторожности)
DELETE FROM questions_new 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY country, (metadata->>'ticket_category'), (metadata->>'original_ticket_number'), (metadata->>'question_number') 
            ORDER BY created_at DESC
        ) as row_num
        FROM questions_new
        WHERE country = 'russia'
    ) t
    WHERE t.row_num > 1
);
