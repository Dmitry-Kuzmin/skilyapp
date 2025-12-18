-- ========================================
-- Таблицы для ПДД России
-- БЕЗ переводов - только русский язык
-- ========================================

-- ========================================
-- Таблица вопросов ПДД России
-- ========================================
CREATE TABLE IF NOT EXISTS public.pdd_russia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,  -- MD5 hash из репозитория для дедупликации
  ticket_number INTEGER CHECK (ticket_number >= 1 AND ticket_number <= 40),
  question_number INTEGER CHECK (question_number >= 1 AND question_number <= 20),
  ticket_category TEXT,  -- 'A,B', 'C,D', 'ALL'
  question_text TEXT NOT NULL,
  image_url TEXT,
  explanation TEXT,  -- answer_tip из JSON
  correct_answer_text TEXT,  -- correct_answer из JSON
  topics TEXT[],  -- массив тем из поля topic
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_number, question_number)
);

-- ========================================
-- Таблица ответов ПДД России
-- ========================================
CREATE TABLE IF NOT EXISTS public.pdd_russia_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.pdd_russia_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, position)
);

-- ========================================
-- Таблица дорожных знаков ПДД России
-- ========================================
CREATE TABLE IF NOT EXISTS public.pdd_russia_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- "Предупреждающие знаки", "Знаки приоритета", etc.
  number TEXT NOT NULL,  -- "1.1", "1.3.2", etc.
  title TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, number)
);

-- ========================================
-- Таблица штрафов ПДД России
-- ========================================
CREATE TABLE IF NOT EXISTS public.pdd_russia_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_part TEXT NOT NULL,  -- "12.8 ч. 3", "264.1 УК РФ"
  text TEXT NOT NULL,
  penalty TEXT NOT NULL,
  is_criminal BOOLEAN DEFAULT false,  -- true если УК РФ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- Индексы для производительности
-- ========================================
CREATE INDEX IF NOT EXISTS idx_pdd_russia_questions_ticket ON public.pdd_russia_questions(ticket_number);
CREATE INDEX IF NOT EXISTS idx_pdd_russia_questions_category ON public.pdd_russia_questions(ticket_category);
CREATE INDEX IF NOT EXISTS idx_pdd_russia_questions_source ON public.pdd_russia_questions(source_id);
CREATE INDEX IF NOT EXISTS idx_pdd_russia_questions_topics ON public.pdd_russia_questions USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_pdd_russia_answers_question ON public.pdd_russia_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_pdd_russia_signs_category ON public.pdd_russia_signs(category);
CREATE INDEX IF NOT EXISTS idx_pdd_russia_penalties_article ON public.pdd_russia_penalties(article_part);

-- ========================================
-- RLS Policies
-- ========================================
ALTER TABLE public.pdd_russia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdd_russia_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdd_russia_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdd_russia_penalties ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view PDD Russia questions"
  ON public.pdd_russia_questions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view PDD Russia answers"
  ON public.pdd_russia_answers
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view PDD Russia signs"
  ON public.pdd_russia_signs
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view PDD Russia penalties"
  ON public.pdd_russia_penalties
  FOR SELECT
  USING (true);

-- Только аутентифицированные могут управлять
CREATE POLICY "Authenticated users can manage PDD Russia questions"
  ON public.pdd_russia_questions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage PDD Russia answers"
  ON public.pdd_russia_answers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage PDD Russia signs"
  ON public.pdd_russia_signs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage PDD Russia penalties"
  ON public.pdd_russia_penalties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- Триггеры для updated_at
-- ========================================
CREATE TRIGGER update_pdd_russia_questions_updated_at
  BEFORE UPDATE ON public.pdd_russia_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdd_russia_signs_updated_at
  BEFORE UPDATE ON public.pdd_russia_signs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdd_russia_penalties_updated_at
  BEFORE UPDATE ON public.pdd_russia_penalties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Функции для работы с вопросами
-- ========================================

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

