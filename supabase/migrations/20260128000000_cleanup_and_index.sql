-- CLEANUP MIGRATION: Очистка базы от мусора и создание индекса
-- Эта миграция удаляет вопросы без ответов и создаёт уникальный индекс

BEGIN;

-- 1. Удаляем вопросы-сироты (без ответов)
DELETE FROM "public"."questions_new"
WHERE id NOT IN (SELECT DISTINCT question_id FROM "public"."answer_options");

-- 2. Удаляем сломанные вопросы (без правильных ответов)
DELETE FROM "public"."questions_new"
WHERE id IN (
    SELECT q.id 
    FROM "public"."questions_new" q
    JOIN "public"."answer_options" a ON a.question_id = q.id
    GROUP BY q.id
    HAVING COUNT(CASE WHEN a.is_correct THEN 1 END) = 0
);

-- 3. Чистим дубликаты ответов (на всякий случай)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY question_id, position 
    ORDER BY created_at ASC
  ) as rn
  FROM "public"."answer_options"
)
DELETE FROM "public"."answer_options"
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 4. Создаём индекс
CREATE UNIQUE INDEX IF NOT EXISTS answer_options_question_position_unique
ON "public"."answer_options"(question_id, position);

COMMIT;
