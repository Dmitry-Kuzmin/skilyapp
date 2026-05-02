-- Migration: Remove coin awards for tests
-- New economy:
--   Tests/Exams: ONLY XP + SP (no coins)
--   Coins earned via: shop purchase, duel wins, watching ads
-- Rationale: Coins must be a true F2P paid currency.
--   Mass-earning coins from learning loop devalues the shop.

CREATE OR REPLACE FUNCTION public.process_test_completion(
  p_user_id               UUID,
  p_test_id               TEXT,
  p_session_id            TEXT,
  p_score                 INTEGER,
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
  v_xp_reward     INTEGER := 0;
  v_test_result_id UUID;
  v_is_exam       BOOLEAN;
  v_exam_passed   BOOLEAN;
BEGIN
  v_is_exam     := p_mode IN ('exam', 'exam-russia');
  v_exam_passed := v_is_exam AND p_score >= 90;

  -- ── XP (личный прогресс) ─────────────────────────────────────────────────
  IF v_exam_passed THEN
    v_xp_reward := 100;
  ELSIF p_score = 100 THEN
    v_xp_reward := 30;
  ELSE
    v_xp_reward := 10;
  END IF;

  -- ── НИКАКИХ МОНЕТ за тесты — экономика монет вынесена в шоп/дуэли/рекламу
  -- Update balance: only XP, coins=0, sp=0 (SP считается через season-sp Edge Function)
  PERFORM public.increment_profile_stats(p_user_id, 0, v_xp_reward, 0);

  -- Save result
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
    p_session_id, p_score, p_questions_count, p_correct_count,
    p_test_duration_seconds, 0, 0
  )
  RETURNING id INTO v_test_result_id;

  -- Close session
  UPDATE public.test_sessions
  SET    status = 'completed', finished_at = NOW(), updated_at = NOW()
  WHERE  session_id = p_session_id;

  -- Achievements
  PERFORM public.update_user_achievement(p_user_id, 'novice',     1, false);
  PERFORM public.update_user_achievement(p_user_id, 'strategist', 1, false);

  IF v_is_exam THEN
    PERFORM public.update_user_achievement(p_user_id, 'examiner', 1, false);
    IF p_score = 100 THEN
      PERFORM public.update_user_achievement(p_user_id, 'pdd_genius', 1, true);
    END IF;
  END IF;

  RETURN json_build_object(
    'coins_awarded',   0,
    'sp_awarded',      0,
    'xp_awarded',      v_xp_reward,
    'test_result_id',  v_test_result_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_test_completion(
  UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN, TEXT
) TO service_role, authenticated;
