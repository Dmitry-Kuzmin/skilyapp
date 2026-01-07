-- Добавление колонок для многоязычности в таблицу dgt_questions

ALTER TABLE dgt_questions
ADD COLUMN IF NOT EXISTS question_en TEXT,
ADD COLUMN IF NOT EXISTS question_ru TEXT,

ADD COLUMN IF NOT EXISTS option_a_en TEXT,
ADD COLUMN IF NOT EXISTS option_a_ru TEXT,

ADD COLUMN IF NOT EXISTS option_b_en TEXT,
ADD COLUMN IF NOT EXISTS option_b_ru TEXT,

ADD COLUMN IF NOT EXISTS option_c_en TEXT,
ADD COLUMN IF NOT EXISTS option_c_ru TEXT,

ADD COLUMN IF NOT EXISTS explanation_en TEXT,
ADD COLUMN IF NOT EXISTS explanation_ru TEXT,

ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS schema_url TEXT,
ADD COLUMN IF NOT EXISTS schema_filename TEXT;

-- Комментарии к колонкам (опционально, для документации)
COMMENT ON COLUMN dgt_questions.question_en IS 'Перевод вопроса на английский';
COMMENT ON COLUMN dgt_questions.question_ru IS 'Перевод вопроса на русский';
COMMENT ON COLUMN dgt_questions.explanation_ru IS 'Адаптированное объяснение на русском';
