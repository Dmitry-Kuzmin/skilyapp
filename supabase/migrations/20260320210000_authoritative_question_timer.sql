-- ============================================================
-- Авторитетный серверный таймер для вопросов дуэли
-- Логика: question_started_at пишется в БД при первом входе игрока на вопрос
-- Фронтенд при перезагрузке/reconnect читает это поле и пересчитывает остаток
-- ============================================================

-- Добавляем поле "когда игрок начал этот вопрос" в duel_answers
-- ON CONFLICT DO NOTHING — idempotent, перезагрузка не сбросит таймер
ALTER TABLE public.duel_answers
  ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ;

-- RPC: Зафиксировать начало вопроса (вызывается один раз при первом отображении вопроса)
-- Возвращает UNIX timestamp (ms) начала, чтобы фронтенд мог вычислить оставшееся время
CREATE OR REPLACE FUNCTION public.mark_question_started(
  p_duel_id        UUID,
  p_player_id      UUID,
  p_question_id    UUID -- duel_questions.id
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_started_at TIMESTAMPTZ;
  v_now                 TIMESTAMPTZ := now();
  v_question_started_at TIMESTAMPTZ;
  v_time_limit_ms       INTEGER     := 60000;
BEGIN
  -- 1. Проверяем, есть ли уже ответ/запись для этого игрока+вопроса
  SELECT question_started_at
    INTO v_existing_started_at
    FROM public.duel_answers
   WHERE player_id       = p_player_id
     AND duel_question_id = p_question_id
   LIMIT 1;

  IF FOUND AND v_existing_started_at IS NOT NULL THEN
    -- Уже зафиксировано — возвращаем существующее время (перезагрузка страницы)
    v_question_started_at := v_existing_started_at;
  ELSE
    -- Первый раз на этом вопросе — создаём/обновляем запись
    INSERT INTO public.duel_answers (
      id,
      duel_id,
      player_id,
      duel_question_id,
      selected_option_id,
      is_correct,
      time_taken_ms,
      points_awarded,
      combo_at_time,
      question_started_at,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_duel_id,
      p_player_id,
      p_question_id,
      NULL,     -- ответа ещё нет
      false,
      0,
      0,
      0,
      v_now,
      v_now
    )
    ON CONFLICT (player_id, duel_question_id) DO UPDATE
      SET question_started_at = CASE
            WHEN duel_answers.question_started_at IS NULL THEN v_now
            ELSE duel_answers.question_started_at  -- не перезаписываем!
          END
    RETURNING question_started_at INTO v_question_started_at;
  END IF;

  RETURN jsonb_build_object(
    'question_started_at', EXTRACT(EPOCH FROM v_question_started_at) * 1000, -- ms
    'server_now',          EXTRACT(EPOCH FROM v_now) * 1000,                  -- ms
    'time_limit_ms',       v_time_limit_ms,
    'elapsed_ms',          GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_question_started_at)) * 1000),
    'remaining_ms',        GREATEST(0, v_time_limit_ms - EXTRACT(EPOCH FROM (v_now - v_question_started_at)) * 1000)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_question_started(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_question_started IS
  'Фиксирует начало ответа игрока на вопрос дуэли. Idempotent: при повторном вызове (перезагрузка) возвращает изначальное время, не сбрасывая таймер.';
