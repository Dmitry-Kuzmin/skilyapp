-- ========================================
-- Migration: Create driving_test_questions table
-- ========================================
-- Таблица для хранения вопросов экзамена на водительские права (из базы Anki)

CREATE TABLE IF NOT EXISTS public.driving_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_type TEXT NOT NULL CHECK (license_type IN ('A1', 'B', 'D')), -- Тип прав
  question_number INTEGER NOT NULL, -- Порядковый номер вопроса в базе
  image_filename TEXT, -- Название файла изображения
  question_text TEXT NOT NULL, -- Текст вопроса
  option_a TEXT NOT NULL, -- Вариант ответа A
  option_b TEXT NOT NULL, -- Вариант ответа B
  option_c TEXT NOT NULL, -- Вариант ответа C
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c')), -- Правильный ответ
  explanation TEXT, -- Объяснение правильного ответа
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Уникальность: один вопрос на тип прав и номер
  UNIQUE(license_type, question_number)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_driving_test_questions_license_type ON public.driving_test_questions(license_type);
CREATE INDEX IF NOT EXISTS idx_driving_test_questions_question_number ON public.driving_test_questions(license_type, question_number);

-- RLS
ALTER TABLE public.driving_test_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view driving test questions"
  ON public.driving_test_questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert driving test questions"
  ON public.driving_test_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update driving test questions"
  ON public.driving_test_questions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete driving test questions"
  ON public.driving_test_questions FOR DELETE
  TO authenticated
  USING (true);

-- Триггер для updated_at
CREATE TRIGGER update_driving_test_questions_updated_at
  BEFORE UPDATE ON public.driving_test_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.driving_test_questions IS 'Questions for Spanish driving license exam (A1, B, D)';
COMMENT ON COLUMN public.driving_test_questions.license_type IS 'Type of license: A1 (motorcycle), B (car), D (bus)';
COMMENT ON COLUMN public.driving_test_questions.correct_answer IS 'Correct answer option: a, b, or c';

