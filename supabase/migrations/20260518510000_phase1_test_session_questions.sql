-- ============================================================
-- Phase 1.1: test_session_questions — snapshot pattern (по аналогии с duel_questions)
-- ============================================================
-- При старте сессии вопросы замораживаются в snapshot.
-- correct_option_ids хранится ОТДЕЛЬНО от snapshot — клиент его никогда не видит.
-- Snapshot отдаётся клиенту БЕЗ поля is_correct (см. test-manager).

CREATE TABLE IF NOT EXISTS public.test_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  question_id UUID NOT NULL,
  position INTEGER NOT NULL,
  question_snapshot JSONB NOT NULL,
  correct_option_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, position),
  UNIQUE(session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_test_session_questions_session
  ON public.test_session_questions(session_id);

ALTER TABLE public.test_session_questions ENABLE ROW LEVEL SECURITY;

-- Клиенту нельзя читать correct_option_ids напрямую — он получает snapshot через Edge Function.
-- Поэтому SELECT доступен только service_role. Authenticated не читают эту таблицу напрямую.
REVOKE ALL ON public.test_session_questions FROM anon, authenticated;

COMMENT ON TABLE public.test_session_questions IS
  'Snapshot вопросов сессии теста (по образцу duel_questions). Хранит замороженную версию вопроса и правильные ответы на сервере.';
COMMENT ON COLUMN public.test_session_questions.question_snapshot IS
  'JSONB снимок вопроса БЕЗ is_correct. Клиент получает только это.';
COMMENT ON COLUMN public.test_session_questions.correct_option_ids IS
  'JSONB array[uuid] — ID правильных опций. Никогда не уходит на клиент.';
