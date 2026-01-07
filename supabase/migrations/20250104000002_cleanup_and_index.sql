-- 1. Удаляем дубликаты (оставляем первый попавшийся id для каждой пары вопрос/категория)
DELETE FROM dgt_questions
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY question_es, category ORDER BY id) AS rnum
        FROM dgt_questions
    ) t
    WHERE t.rnum > 1
);

-- 2. Теперь спокойно добавляем уникальный индекс
ALTER TABLE dgt_questions 
ADD CONSTRAINT dgt_questions_unique_question UNIQUE (question_es, category);
