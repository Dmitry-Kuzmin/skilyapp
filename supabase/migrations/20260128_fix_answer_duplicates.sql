-- Миграция: Защита от дубликатов в answer_options
-- Добавляет уникальный индекс по (question_id, position)

-- 1. Сначала удаляем существующие дубликаты (если есть)
-- Оставляем самую старую запись для каждой пары (question_id, position)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY question_id, position 
    ORDER BY created_at ASC
  ) as rn
  FROM answer_options
)
DELETE FROM answer_options
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Создаем уникальный индекс для предотвращения будущих дубликатов
-- Это позволит делать UPSERT с onConflict: 'question_id,position'
CREATE UNIQUE INDEX IF NOT EXISTS answer_options_question_position_unique
ON answer_options(question_id, position);

-- 3. Комментарий для документации
COMMENT ON INDEX answer_options_question_position_unique IS 
'Предотвращает дубликаты ответов: один ответ на каждую позицию вопроса. Используется для UPSERT синхронизации.';
