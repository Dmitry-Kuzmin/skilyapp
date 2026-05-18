-- ============================================================
-- Phase 2: performance indexes (CONCURRENTLY где можно)
-- ============================================================
-- Покрывает горячие пути: профиль, ответы, награды, AI usage.
-- CREATE INDEX CONCURRENTLY нельзя в transaction, поэтому каждый —
-- отдельная команда. Если индекс уже есть, IF NOT EXISTS пропустит.

-- ── test_results: запросы по user + creation time (нет completed_at в схеме)
CREATE INDEX IF NOT EXISTS idx_test_results_user_created
  ON public.test_results(user_id, created_at DESC);

-- ── test_results: lookup по session_id (idempotency check в complete-test-and-award)
CREATE INDEX IF NOT EXISTS idx_test_results_session_id
  ON public.test_results(session_id);

-- ── user_challenge_questions: composite индекс для UPSERT/SELECT
-- (UNIQUE constraint уже даёт индекс по (user_id, question_id),
-- этот индекс отдельный — для фильтров по mastered/last_wrong_at)
CREATE INDEX IF NOT EXISTS idx_user_challenge_user_mastered
  ON public.user_challenge_questions(user_id, mastered, last_wrong_at DESC);

-- ── daily_ai_usage: rate-limit lookup
CREATE INDEX IF NOT EXISTS idx_daily_ai_usage_user_date
  ON public.daily_ai_usage(user_id, created_at DESC);

-- ── questions_new: lookup по topic_id
CREATE INDEX IF NOT EXISTS idx_questions_new_topic
  ON public.questions_new(topic_id)
  WHERE topic_id IS NOT NULL;

-- ── answer_options: lookup по question_id (часто JOIN)
CREATE INDEX IF NOT EXISTS idx_answer_options_question
  ON public.answer_options(question_id);

-- ── user_progress: SM-2 апдейт через record_answer RPC
-- (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_progress') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_progress_user_question
             ON public.user_progress(user_id, question_id)';
  END IF;
END $$;
