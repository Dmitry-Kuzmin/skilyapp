-- ============================================================
-- Phase 2.1: атомарный UPSERT для Challenge Bank
-- ============================================================
-- Заменяет N+1 паттерн (SELECT + INSERT/UPDATE) в useTestInteraction
-- одним RPC. На один 30-вопросный тест экономит до 30 запросов.

CREATE OR REPLACE FUNCTION public.upsert_challenge_question(
  p_user_id UUID,
  p_question_id UUID
) RETURNS TABLE (
  was_new BOOLEAN,
  times_wrong INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_new_times_wrong INTEGER;
BEGIN
  -- Атомарный upsert: если запись есть — инкрементируем, иначе вставляем
  INSERT INTO public.user_challenge_questions (
    user_id, question_id, times_wrong, last_wrong_at,
    mastered, created_at, updated_at
  )
  VALUES (
    p_user_id, p_question_id, 1, NOW(),
    FALSE, NOW(), NOW()
  )
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET times_wrong = COALESCE(public.user_challenge_questions.times_wrong, 0) + 1,
        last_wrong_at = NOW(),
        mastered = FALSE,
        updated_at = NOW()
  RETURNING id, public.user_challenge_questions.times_wrong INTO v_existing_id, v_new_times_wrong;

  -- was_new = TRUE если times_wrong == 1 после операции (это было первое добавление)
  RETURN QUERY SELECT (v_new_times_wrong = 1) AS was_new, v_new_times_wrong;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_challenge_question(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.upsert_challenge_question IS
  'Атомарный UPSERT в Challenge Bank с инкрементом times_wrong. Заменяет N+1 SELECT+UPDATE/INSERT.';
