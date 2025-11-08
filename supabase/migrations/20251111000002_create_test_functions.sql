-- ========================================
-- Functions for test management
-- ========================================

-- Удаляем старую функцию, если она существует (для изменения типа возврата)
DROP FUNCTION IF EXISTS public.get_test_questions(UUID);

-- Function: Get questions for a test by source_id range
CREATE FUNCTION public.get_test_questions(p_test_id UUID)
RETURNS TABLE (
  question_id UUID,
  question_ru TEXT,
  question_es TEXT,
  question_en TEXT,
  image_url TEXT,
  explanation_ru TEXT,
  explanation_es TEXT,
  explanation_en TEXT,
  source_id TEXT,
  topic_id UUID,
  difficulty TEXT,
  sign_code TEXT
) AS $$
DECLARE
  v_prefix TEXT;
  v_start INTEGER;
  v_end INTEGER;
  v_topic_id UUID;
BEGIN
  -- Получаем параметры теста
  SELECT t.source_id_prefix, t.source_id_start, t.source_id_end, t.topic_id
  INTO v_prefix, v_start, v_end, v_topic_id
  FROM public.tests t
  WHERE t.id = p_test_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found: %', p_test_id;
  END IF;

  -- Возвращаем вопросы в диапазоне source_id
  RETURN QUERY
  SELECT 
    q.id AS question_id,
    q.question_ru,
    q.question_es,
    q.question_en,
    q.image_url,
    q.explanation_ru,
    q.explanation_es,
    q.explanation_en,
    q.source_id,
    q.topic_id,
    q.difficulty::TEXT AS difficulty,
    q.sign_code
  FROM public.questions_new q
  WHERE q.source_id IS NOT NULL
    AND q.source_id LIKE (v_prefix || '-%') -- Проверяем, что source_id начинается с префикса
    AND q.topic_id = v_topic_id
    AND (
      -- Извлекаем число из source_id (формат: "GS-1", "GS-2" и т.д.)
      (q.source_id ~ ('^' || v_prefix || '-(\d+)$'))
      AND (
        CAST(
          SUBSTRING(q.source_id FROM ('^' || v_prefix || '-(\d+)$')) AS INTEGER
        ) BETWEEN v_start AND v_end
      )
    )
  ORDER BY 
    CAST(
      SUBSTRING(q.source_id FROM ('^' || v_prefix || '-(\d+)$')) AS INTEGER
    ) NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_test_questions IS 'Returns questions for a test based on source_id range';

-- Function: Initialize user test progress (unlock default tests)
CREATE OR REPLACE FUNCTION public.initialize_user_test_progress(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Разблокируем все тесты, которые разблокированы по умолчанию
  INSERT INTO public.user_test_progress (user_id, test_id, status)
  SELECT 
    p_user_id,
    t.id,
    'unlocked'
  FROM public.tests t
  WHERE t.is_unlocked_by_default = true
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_test_progress utp 
      WHERE utp.user_id = p_user_id AND utp.test_id = t.id
    )
  ON CONFLICT (user_id, test_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.initialize_user_test_progress IS 'Initializes user test progress by unlocking default tests';

-- Function: Unlock next test after passing current test
CREATE OR REPLACE FUNCTION public.unlock_next_test(p_user_id UUID, p_test_id UUID)
RETURNS UUID AS $$
DECLARE
  v_next_test_id UUID;
  v_min_pass_percent INTEGER;
  v_user_score INTEGER;
  v_test_status TEXT;
BEGIN
  -- Получаем минимальный процент для прохождения текущего теста
  SELECT min_pass_percent INTO v_min_pass_percent
  FROM public.tests
  WHERE id = p_test_id;

  -- Получаем результат пользователя
  SELECT score, status INTO v_user_score, v_test_status
  FROM public.user_test_progress
  WHERE user_id = p_user_id AND test_id = p_test_id;

  -- Проверяем, прошел ли пользователь тест
  IF v_user_score IS NULL OR v_user_score < v_min_pass_percent THEN
    RETURN NULL; -- Тест не пройден
  END IF;

  -- Находим следующий тест (который требует прохождения текущего)
  SELECT id INTO v_next_test_id
  FROM public.tests
  WHERE required_test_id = p_test_id
  ORDER BY order_index
  LIMIT 1;

  -- Разблокируем следующий тест
  IF v_next_test_id IS NOT NULL THEN
    INSERT INTO public.user_test_progress (user_id, test_id, status)
    VALUES (p_user_id, v_next_test_id, 'unlocked')
    ON CONFLICT (user_id, test_id) 
    DO UPDATE SET status = 'unlocked';
  END IF;

  RETURN v_next_test_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.unlock_next_test IS 'Unlocks the next test after passing the current test';

-- Function: Update test progress after completion
CREATE OR REPLACE FUNCTION public.update_test_progress(
  p_user_id UUID,
  p_test_id UUID,
  p_correct_answers INTEGER,
  p_total_questions INTEGER,
  p_time_spent_seconds INTEGER
)
RETURNS void AS $$
DECLARE
  v_score INTEGER;
  v_min_pass_percent INTEGER;
  v_new_status TEXT;
  v_current_best_score INTEGER;
BEGIN
  -- Вычисляем процент правильных ответов
  v_score := ROUND((p_correct_answers::DECIMAL / p_total_questions::DECIMAL) * 100);

  -- Получаем минимальный процент для прохождения
  SELECT min_pass_percent INTO v_min_pass_percent
  FROM public.tests
  WHERE id = p_test_id;

  -- Определяем новый статус
  IF v_score >= v_min_pass_percent THEN
    v_new_status := 'passed';
  ELSE
    v_new_status := 'failed';
  END IF;

  -- Получаем текущий лучший результат
  SELECT best_score INTO v_current_best_score
  FROM public.user_test_progress
  WHERE user_id = p_user_id AND test_id = p_test_id;

  -- Обновляем прогресс
  INSERT INTO public.user_test_progress (
    user_id,
    test_id,
    status,
    score,
    correct_answers,
    total_questions,
    time_spent_seconds,
    completed_at,
    attempts_count,
    best_score
  )
  VALUES (
    p_user_id,
    p_test_id,
    v_new_status,
    v_score,
    p_correct_answers,
    p_total_questions,
    p_time_spent_seconds,
    now(),
    1,
    v_score
  )
  ON CONFLICT (user_id, test_id)
  DO UPDATE SET
    status = v_new_status,
    score = v_score,
    correct_answers = p_correct_answers,
    total_questions = p_total_questions,
    time_spent_seconds = p_time_spent_seconds + EXCLUDED.time_spent_seconds,
    completed_at = now(),
    attempts_count = user_test_progress.attempts_count + 1,
    best_score = GREATEST(COALESCE(user_test_progress.best_score, 0), v_score);

  -- Разблокируем следующий тест, если текущий пройден
  IF v_new_status = 'passed' THEN
    PERFORM public.unlock_next_test(p_user_id, p_test_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_test_progress IS 'Updates user test progress after test completion';

