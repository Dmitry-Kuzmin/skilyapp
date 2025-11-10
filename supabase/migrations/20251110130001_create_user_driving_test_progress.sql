-- ========================================
-- Migration: Create user_driving_test_progress table
-- ========================================
-- Таблица для отслеживания прогресса пользователя по тестам DGT

CREATE TABLE IF NOT EXISTS public.user_driving_test_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL CHECK (license_type IN ('A1', 'B', 'D')),
  session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_completed_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER NOT NULL DEFAULT 0,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  incorrect_answers INTEGER NOT NULL DEFAULT 0,
  skipped_questions INTEGER NOT NULL DEFAULT 0,
  score_percent NUMERIC(5,2) DEFAULT 0 CHECK (score_percent >= 0 AND score_percent <= 100),
  time_spent_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  answers_data JSONB DEFAULT '[]'::jsonb, -- Массив ответов пользователя
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_driving_test_progress_user_id ON public.user_driving_test_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_driving_test_progress_license_type ON public.user_driving_test_progress(user_id, license_type);
CREATE INDEX IF NOT EXISTS idx_user_driving_test_progress_completed ON public.user_driving_test_progress(user_id, is_completed);

-- RLS
ALTER TABLE public.user_driving_test_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own driving test progress"
  ON public.user_driving_test_progress FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can insert their own driving test progress"
  ON public.user_driving_test_progress FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can update their own driving test progress"
  ON public.user_driving_test_progress FOR UPDATE
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can delete their own driving test progress"
  ON public.user_driving_test_progress FOR DELETE
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

-- Триггер для updated_at
CREATE TRIGGER update_user_driving_test_progress_updated_at
  BEFORE UPDATE ON public.user_driving_test_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_driving_test_progress IS 'User progress for Spanish driving license practice tests';
COMMENT ON COLUMN public.user_driving_test_progress.answers_data IS 'JSON array storing user answers: [{question_id, user_answer, correct_answer, is_correct, time_spent}]';

