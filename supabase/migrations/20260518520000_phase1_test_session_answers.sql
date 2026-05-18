-- ============================================================
-- Phase 1.1: test_session_answers — audit log (по аналогии с duel_answers)
-- ============================================================
-- Каждый ответ пользователя на вопрос теста.
-- is_correct ВСЕГДА вычисляется на сервере путём сравнения selected_option_id
-- с correct_option_ids из test_session_questions.

CREATE TABLE IF NOT EXISTS public.test_session_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_session_question_id UUID NOT NULL REFERENCES public.test_session_questions(id) ON DELETE CASCADE,
  selected_option_id UUID,
  is_correct BOOLEAN NOT NULL,
  is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
  time_taken_ms INTEGER,
  client_reported_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(test_session_question_id)
);

CREATE INDEX IF NOT EXISTS idx_test_session_answers_session
  ON public.test_session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_test_session_answers_user_time
  ON public.test_session_answers(user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_session_answers_mismatch
  ON public.test_session_answers(user_id, answered_at DESC)
  WHERE client_reported_correct IS NOT NULL
    AND client_reported_correct <> is_correct;

ALTER TABLE public.test_session_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_test_answers" ON public.test_session_answers;
CREATE POLICY "users_read_own_test_answers" ON public.test_session_answers
  FOR SELECT
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.test_session_answers FROM anon, authenticated;
GRANT SELECT ON public.test_session_answers TO authenticated;

COMMENT ON TABLE public.test_session_answers IS
  'Server-validated answer log. INSERT only via Edge Functions (service role). Source of truth for score.';
COMMENT ON COLUMN public.test_session_answers.client_reported_correct IS
  'What client claimed; mismatch with is_correct indicates tampering attempt.';
