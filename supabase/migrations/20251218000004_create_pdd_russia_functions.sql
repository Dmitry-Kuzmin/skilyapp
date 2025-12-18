-- ========================================
-- Функции для работы с вопросами ПДД России
-- ========================================
-- Эти функции должны были быть в 20251218000002, но если их нет - применяем отдельно

-- Получить билет целиком
CREATE OR REPLACE FUNCTION public.get_pdd_russia_ticket(
  p_ticket_number INTEGER
)
RETURNS TABLE (
  id UUID,
  ticket_number INTEGER,
  question_number INTEGER,
  question_text TEXT,
  image_url TEXT,
  explanation TEXT,
  correct_answer_text TEXT,
  topics TEXT[],
  answers JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.ticket_number,
    q.question_number,
    q.question_text,
    q.image_url,
    q.explanation,
    q.correct_answer_text,
    q.topics,
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'text', a.answer_text,
        'is_correct', a.is_correct,
        'position', a.position
      ) ORDER BY a.position
    ) as answers
  FROM public.pdd_russia_questions q
  LEFT JOIN public.pdd_russia_answers a ON a.question_id = q.id
  WHERE q.ticket_number = p_ticket_number
  GROUP BY q.id, q.ticket_number, q.question_number, q.question_text, 
           q.image_url, q.explanation, q.correct_answer_text, q.topics
  ORDER BY q.question_number;
END;
$$;

-- Получить вопрос по source_id
CREATE OR REPLACE FUNCTION public.get_pdd_russia_question_by_source(
  p_source_id TEXT
)
RETURNS TABLE (
  id UUID,
  ticket_number INTEGER,
  question_number INTEGER,
  question_text TEXT,
  image_url TEXT,
  explanation TEXT,
  topics TEXT[],
  answers JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.ticket_number,
    q.question_number,
    q.question_text,
    q.image_url,
    q.explanation,
    q.topics,
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'text', a.answer_text,
        'is_correct', a.is_correct,
        'position', a.position
      ) ORDER BY a.position
    ) as answers
  FROM public.pdd_russia_questions q
  LEFT JOIN public.pdd_russia_answers a ON a.question_id = q.id
  WHERE q.source_id = p_source_id
  GROUP BY q.id, q.ticket_number, q.question_number, q.question_text, 
           q.image_url, q.explanation, q.topics;
END;
$$;


