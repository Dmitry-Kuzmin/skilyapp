-- ========================================
-- Migration: Create tests table for sequential test organization
-- ========================================
-- Tests are organized by source_id ranges (e.g., GS-1 to GS-30 = Test 1)

CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL, -- Порядковый номер теста в теме (1, 2, 3...)
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  description_en TEXT,
  source_id_prefix TEXT NOT NULL, -- Префикс source_id (например, "GS", "GG")
  source_id_start INTEGER NOT NULL, -- Начальный номер (например, 1)
  source_id_end INTEGER NOT NULL, -- Конечный номер (например, 30)
  questions_count INTEGER NOT NULL DEFAULT 30, -- Количество вопросов в тесте
  min_pass_percent INTEGER NOT NULL DEFAULT 80, -- Минимальный процент для прохождения
  order_index INTEGER NOT NULL, -- Для сортировки тестов
  required_test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL, -- Предыдущий тест, который нужно пройти
  is_unlocked_by_default BOOLEAN NOT NULL DEFAULT FALSE, -- Первый тест всегда открыт
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Уникальность: один тест на один номер в теме
  UNIQUE(topic_id, test_number),
  -- Проверка: source_id_end >= source_id_start
  CHECK (source_id_end >= source_id_start)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tests_topic_id ON public.tests(topic_id);
CREATE INDEX IF NOT EXISTS idx_tests_test_number ON public.tests(topic_id, test_number);
CREATE INDEX IF NOT EXISTS idx_tests_source_id_range ON public.tests(source_id_prefix, source_id_start, source_id_end);
CREATE INDEX IF NOT EXISTS idx_tests_order_index ON public.tests(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_tests_required_test_id ON public.tests(required_test_id);

-- RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tests"
  ON public.tests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tests"
  ON public.tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tests"
  ON public.tests FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tests"
  ON public.tests FOR DELETE
  TO authenticated
  USING (true);

-- Триггер для updated_at
CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.tests IS 'Sequential tests organized by source_id ranges (e.g., GS-1 to GS-30 = Test 1)';
COMMENT ON COLUMN public.tests.source_id_prefix IS 'Prefix of source_id (e.g., "GS", "GG")';
COMMENT ON COLUMN public.tests.source_id_start IS 'Starting number in source_id range (e.g., 1 for GS-1)';
COMMENT ON COLUMN public.tests.source_id_end IS 'Ending number in source_id range (e.g., 30 for GS-30)';
COMMENT ON COLUMN public.tests.required_test_id IS 'Previous test that must be passed to unlock this test';
COMMENT ON COLUMN public.tests.is_unlocked_by_default IS 'If true, this test is unlocked from the start (typically the first test)';

