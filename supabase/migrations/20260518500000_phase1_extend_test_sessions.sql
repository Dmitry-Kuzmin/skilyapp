-- ============================================================
-- Phase 1.1: Extend test_sessions for server-authoritative tests
-- ============================================================
-- The existing test_sessions table only tracked basic lifecycle.
-- We add fields needed for snapshot-based, server-validated tests:
--   - server-computed score/correct_count (never trust client)
--   - test_id (for sequential tests) + country/topic (for filtering)
--   - completed_at, anti-cheat flags

ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS correct_count INTEGER,
  ADD COLUMN IF NOT EXISTS test_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS topic_id UUID,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS speed_cheat_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_correct_count INTEGER,
  ADD COLUMN IF NOT EXISTS questions_snapshot_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_test_sessions_user_completed
  ON public.test_sessions(user_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_sessions_session_id
  ON public.test_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_test_sessions_mismatch
  ON public.test_sessions(user_id, completed_at DESC)
  WHERE client_correct_count IS NOT NULL
    AND client_correct_count <> correct_count;

ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_test_sessions" ON public.test_sessions;
CREATE POLICY "users_read_own_test_sessions" ON public.test_sessions
  FOR SELECT
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.test_sessions FROM anon, authenticated;

COMMENT ON COLUMN public.test_sessions.client_correct_count IS
  'What client claimed at completion. If <> correct_count it indicates a tampering attempt — flag and shadow-ban.';
COMMENT ON COLUMN public.test_sessions.speed_cheat_detected IS
  'TRUE when test was completed faster than the legal minimum (5s/question). Rewards are zeroed.';
