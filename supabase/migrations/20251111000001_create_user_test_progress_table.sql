-- ========================================
-- Migration: Create user_test_progress table
-- ========================================
-- Tracks user progress for each test

CREATE TABLE IF NOT EXISTS public.user_test_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed', 'passed', 'failed')),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  attempts_count INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0 CHECK (best_score >= 0 AND best_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_test_progress_user_id ON public.user_test_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_test_progress_test_id ON public.user_test_progress(test_id);
CREATE INDEX IF NOT EXISTS idx_user_test_progress_status ON public.user_test_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_test_progress_topic ON public.user_test_progress(user_id, test_id);

-- RLS
ALTER TABLE public.user_test_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test progress"
  ON public.user_test_progress FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can insert their own test progress"
  ON public.user_test_progress FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Users can update their own test progress"
  ON public.user_test_progress FOR UPDATE
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

-- Триггер для updated_at
CREATE TRIGGER update_user_test_progress_updated_at
  BEFORE UPDATE ON public.user_test_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_test_progress IS 'User progress for sequential tests';
COMMENT ON COLUMN public.user_test_progress.status IS 'Test status: locked, unlocked, in_progress, completed, passed, failed';
COMMENT ON COLUMN public.user_test_progress.best_score IS 'Best score achieved across all attempts';

