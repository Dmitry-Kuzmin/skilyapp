-- Migration: Fix test reward logic
-- New matrix:
--   Practice / module / blitz: XP +10, Coins 0 (or +1 if perfect), SP 0
--   Exam (passed ≥90%): XP +100, Coins +50 ONLY first exam of the day, SP 0
--   Exam (failed): XP +10, Coins 0, SP 0
--   Marathon / Mastery: XP +10 per round, Coins 0, SP 0
-- SP is NEVER awarded directly for tests (only via daily quests)

CREATE OR REPLACE FUNCTION public.process_test_completion(
  p_user_id               UUID,
  p_test_id               TEXT,
  p_session_id            TEXT,
  p_score                 INTEGER,   -- percentage 0-100
  p_questions_count       INTEGER,
  p_correct_count         INTEGER,
  p_test_duration_seconds INTEGER,
  p_premium_flag          BOOLEAN DEFAULT FALSE,
  p_double_sp_active      BOOLEAN DEFAULT FALSE,
  p_mode                  TEXT    DEFAULT 'practice'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins_reward  INTEGER := 0;
  v_xp_reward     INTEGER := 0;
  v_test_result_id UUID;
  v_is_exam       BOOLEAN;
  v_exam_passed   BOOLEAN;
  v_exams_today   INTEGER;
BEGIN
  -- Determine mode flags
  v_is_exam     := p_mode IN ('exam', 'exam-russia');
  v_exam_passed := v_is_exam AND p_score >= 90;

  -- ── XP ───────────────────────────────────────────────────────────────────
  IF v_exam_passed THEN
    v_xp_reward := 100;
  ELSE
    v_xp_reward := 10;
  END IF;

  -- ── Монеты ───────────────────────────────────────────────────────────────
  IF v_exam_passed THEN
    -- Coins only for the FIRST passed exam of the day
    SELECT COUNT(*)
    INTO   v_exams_today
    FROM   public.test_results
    WHERE  user_id    = p_user_id
      AND  created_at >= CURRENT_DATE
      AND  score      >= 90
      AND  coins_awarded > 0;

    IF v_exams_today = 0 THEN
      v_coins_reward := 50;
    END IF;
  ELSIF p_mode NOT IN ('marathon', 'mastery') AND p_score = 100 THEN
    -- Perfect practice run: +1 symbolic coin
    v_coins_reward := 1;
  END IF;

  -- ── Premium multiplier (coins only, XP stays flat) ───────────────────────
  IF p_premium_flag AND v_coins_reward > 0 THEN
    v_coins_reward := ROUND(v_coins_reward * 1.5)::INTEGER;
  END IF;

  -- ── Update balance atomically ─────────────────────────────────────────────
  -- increment_profile_stats(user_id, coins_delta, xp_delta, sp_delta)
  PERFORM public.increment_profile_stats(p_user_id, v_coins_reward, v_xp_reward, 0);

  -- ── Save test result ──────────────────────────────────────────────────────
  INSERT INTO public.test_results (
    user_id, test_id, session_id, score,
    questions_count, correct_count,
    test_duration_seconds, coins_awarded, sp_awarded
  )
  VALUES (
    p_user_id,
    CASE
      WHEN p_test_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN p_test_id::UUID
      ELSE NULL
    END,
    p_session_id,
    p_score,
    p_questions_count,
    p_correct_count,
    p_test_duration_seconds,
    v_coins_reward,
    0   -- SP always 0 for tests
  )
  RETURNING id INTO v_test_result_id;

  -- ── Close test session ────────────────────────────────────────────────────
  UPDATE public.test_sessions
  SET    status = 'completed', finished_at = NOW(), updated_at = NOW()
  WHERE  session_id = p_session_id;

  -- ── Achievements ──────────────────────────────────────────────────────────
  PERFORM public.update_user_achievement(p_user_id, 'novice',     1, false);
  PERFORM public.update_user_achievement(p_user_id, 'strategist', 1, false);

  IF v_is_exam THEN
    PERFORM public.update_user_achievement(p_user_id, 'examiner', 1, false);
    IF p_score = 100 THEN
      PERFORM public.update_user_achievement(p_user_id, 'pdd_genius', 1, true);
    END IF;
  END IF;

  -- ── Transaction log ───────────────────────────────────────────────────────
  IF v_coins_reward > 0 THEN
    INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
    VALUES (
      p_user_id,
      'coins_earned_test',
      v_coins_reward,
      jsonb_build_object('mode', p_mode, 'score', p_score, 'test_id', p_test_id)
    );
  END IF;

  -- ── Return ────────────────────────────────────────────────────────────────
  RETURN json_build_object(
    'coins_awarded',   v_coins_reward,
    'sp_awarded',      0,
    'xp_awarded',      v_xp_reward,
    'test_result_id',  v_test_result_id
  );
END;
$$;

-- Grant permissions (same as before)
GRANT EXECUTE ON FUNCTION public.process_test_completion(
  UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN, TEXT
) TO service_role, authenticated;
