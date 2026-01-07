-- Добавляем уникальное ограничение для предотвращения дубликатов вопросов
-- и возможности использования UPSERT

ALTER TABLE dgt_questions 
ADD CONSTRAINT dgt_questions_unique_question UNIQUE (question_es, category);
