-- ========================================
-- Migration: Fix get_test_questions function
-- ========================================
-- Удаляем старую функцию и создаем новую с правильным типом возврата

-- Удаляем старую функцию, если она существует
DROP FUNCTION IF EXISTS public.get_test_questions(UUID);

-- Создаем функцию с правильным типом возврата
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
    AND q.source_id LIKE (v_prefix || '-%')
    AND q.topic_id = v_topic_id
    AND (
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

