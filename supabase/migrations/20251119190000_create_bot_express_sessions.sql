-- =====================================================
-- bot_express_sessions: состояние экспресс-тестов в боте
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bot_express_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  language_code TEXT DEFAULT 'ru',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired')),
  question_snapshots JSONB NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_index INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 3,
  correct_count INT NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bot_express_sessions_user_id
  ON public.bot_express_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_bot_express_sessions_status
  ON public.bot_express_sessions(status);

CREATE INDEX IF NOT EXISTS idx_bot_express_sessions_created
  ON public.bot_express_sessions(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_bot_express_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bot_express_sessions ON public.bot_express_sessions;
CREATE TRIGGER trg_update_bot_express_sessions
  BEFORE UPDATE ON public.bot_express_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_express_sessions_timestamp();

ALTER TABLE public.bot_express_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles manage their bot express sessions"
  ON public.bot_express_sessions
  FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));


