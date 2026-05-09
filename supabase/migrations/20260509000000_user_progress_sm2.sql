-- SM-2 lite spaced repetition fields on user_progress
-- + atomic record_answer RPC that increments counters and recomputes schedule

ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS easiness REAL NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days REAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrong_count INTEGER NOT NULL DEFAULT 0;

-- Index for SR due lookup
CREATE INDEX IF NOT EXISTS idx_user_progress_user_due
  ON public.user_progress (user_id, next_review_at);

-- Backfill from existing snapshot (one-time, idempotent guarded by repetitions=0 + counts=0)
UPDATE public.user_progress
SET
  correct_count = CASE WHEN is_correct THEN GREATEST(attempts, 1) ELSE 0 END,
  wrong_count   = CASE WHEN is_correct THEN 0 ELSE GREATEST(attempts, 1) END,
  repetitions   = CASE WHEN is_correct THEN 1 ELSE 0 END,
  interval_days = CASE WHEN is_correct THEN 1 ELSE 0 END,
  next_review_at = CASE
    WHEN is_correct THEN COALESCE(last_attempt_at, NOW()) + INTERVAL '1 day'
    ELSE COALESCE(last_attempt_at, NOW())
  END
WHERE repetitions = 0 AND correct_count = 0 AND wrong_count = 0 AND is_answered IS TRUE;

-- Atomic answer recording: upsert + SM-2 reschedule + counter increments
CREATE OR REPLACE FUNCTION public.record_answer(
  p_user_id UUID,
  p_question_id UUID,
  p_is_correct BOOLEAN,
  p_time_spent INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_easiness REAL;
  v_interval REAL;
  v_reps INTEGER;
  v_next TIMESTAMPTZ;
  v_quality INTEGER;
BEGIN
  -- Map binary correctness to SM-2 quality (0..5). 4 = correct hesitation, 1 = wrong.
  v_quality := CASE WHEN p_is_correct THEN 4 ELSE 1 END;

  -- Read existing row (or defaults)
  SELECT easiness, interval_days, repetitions
  INTO v_easiness, v_interval, v_reps
  FROM public.user_progress
  WHERE user_id = p_user_id AND question_id = p_question_id;

  IF NOT FOUND THEN
    v_easiness := 2.5;
    v_interval := 0;
    v_reps := 0;
  END IF;

  -- Update easiness factor (clamp at 1.3)
  v_easiness := GREATEST(
    1.3,
    v_easiness + (0.1 - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02))
  );

  IF p_is_correct THEN
    -- Successful recall: extend interval
    IF v_reps = 0 THEN
      v_interval := 1;
    ELSIF v_reps = 1 THEN
      v_interval := 6;
    ELSE
      v_interval := ROUND(v_interval * v_easiness);
    END IF;
    v_reps := v_reps + 1;
    v_next := NOW() + (v_interval || ' days')::INTERVAL;
  ELSE
    -- Lapse: short relearning delay (10 min), reset reps
    v_reps := 0;
    v_interval := 0;
    v_next := NOW() + INTERVAL '10 minutes';
  END IF;

  INSERT INTO public.user_progress AS up (
    user_id, question_id, is_answered, is_correct,
    attempts, last_attempt_at, time_spent_seconds,
    easiness, interval_days, repetitions, next_review_at,
    correct_count, wrong_count
  ) VALUES (
    p_user_id, p_question_id, TRUE, p_is_correct,
    1, NOW(), GREATEST(p_time_spent, 0),
    v_easiness, v_interval, v_reps, v_next,
    CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    CASE WHEN p_is_correct THEN 0 ELSE 1 END
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    is_answered        = TRUE,
    is_correct         = EXCLUDED.is_correct,
    attempts           = up.attempts + 1,
    last_attempt_at    = NOW(),
    time_spent_seconds = COALESCE(up.time_spent_seconds, 0) + GREATEST(p_time_spent, 0),
    easiness           = v_easiness,
    interval_days      = v_interval,
    repetitions        = v_reps,
    next_review_at     = v_next,
    correct_count      = up.correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    wrong_count        = up.wrong_count   + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    updated_at         = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_answer(UUID, UUID, BOOLEAN, INTEGER) TO authenticated, anon;
