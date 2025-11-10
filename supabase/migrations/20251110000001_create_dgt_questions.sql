-- ========================================
-- TABLE: dgt_questions
-- Таблица для хранения вопросов экзаменов DGT (A1, B, D)
-- ========================================

CREATE TABLE IF NOT EXISTS public.dgt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Категория экзамена
  category TEXT NOT NULL CHECK (category IN ('A1', 'B', 'D')),
  
  -- Вопрос и варианты ответов (на испанском из оригинальной базы)
  question_es TEXT NOT NULL,
  option_a_es TEXT NOT NULL,
  option_b_es TEXT NOT NULL,
  option_c_es TEXT NOT NULL,
  
  -- Правильный ответ (a, b, или c)
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c')),
  
  -- Объяснение
  explanation_es TEXT,
  
  -- Изображение (если есть)
  image_filename TEXT,
  
  -- Метаданные
  source TEXT DEFAULT 'anki-carnet-conducir',
  times_shown INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_dgt_questions_category ON public.dgt_questions(category);
CREATE INDEX IF NOT EXISTS idx_dgt_questions_created_at ON public.dgt_questions(created_at);

-- ========================================
-- TABLE: dgt_test_sessions
-- Таблица для хранения сессий прохождения тестов
-- ========================================

CREATE TABLE IF NOT EXISTS public.dgt_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Пользователь
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Параметры теста
  category TEXT NOT NULL CHECK (category IN ('A1', 'B', 'D')),
  total_questions INTEGER NOT NULL,
  
  -- Результаты
  correct_answers INTEGER DEFAULT 0,
  incorrect_answers INTEGER DEFAULT 0,
  unanswered INTEGER DEFAULT 0,
  
  -- Прогресс
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  score_percentage DECIMAL(5,2),
  
  -- Время
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dgt_test_sessions_user_id ON public.dgt_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dgt_test_sessions_category ON public.dgt_test_sessions(category);
CREATE INDEX IF NOT EXISTS idx_dgt_test_sessions_status ON public.dgt_test_sessions(status);

-- ========================================
-- TABLE: dgt_test_answers
-- Таблица для хранения ответов пользователя
-- ========================================

CREATE TABLE IF NOT EXISTS public.dgt_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связь с сессией и вопросом
  session_id UUID REFERENCES public.dgt_test_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.dgt_questions(id) ON DELETE CASCADE NOT NULL,
  
  -- Ответ пользователя
  user_answer TEXT CHECK (user_answer IN ('a', 'b', 'c')),
  is_correct BOOLEAN,
  
  -- Время ответа
  time_spent_seconds INTEGER,
  answered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Уникальность: один ответ на вопрос в рамках одной сессии
  UNIQUE(session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_dgt_test_answers_session_id ON public.dgt_test_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_dgt_test_answers_question_id ON public.dgt_test_answers(question_id);

-- ========================================
-- RLS POLICIES
-- ========================================

-- Включаем RLS
ALTER TABLE public.dgt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dgt_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dgt_test_answers ENABLE ROW LEVEL SECURITY;

-- Политики для dgt_questions (все могут читать)
CREATE POLICY "Anyone can view dgt questions"
  ON public.dgt_questions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert dgt questions"
  ON public.dgt_questions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dgt questions"
  ON public.dgt_questions
  FOR UPDATE
  USING (true);

-- Политики для dgt_test_sessions
CREATE POLICY "Users can view their own test sessions"
  ON public.dgt_test_sessions
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create their own test sessions"
  ON public.dgt_test_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own test sessions"
  ON public.dgt_test_sessions
  FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Политики для dgt_test_answers
CREATE POLICY "Users can view their own test answers"
  ON public.dgt_test_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dgt_test_sessions
      WHERE dgt_test_sessions.id = dgt_test_answers.session_id
      AND (dgt_test_sessions.user_id = auth.uid() OR dgt_test_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create their own test answers"
  ON public.dgt_test_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dgt_test_sessions
      WHERE dgt_test_sessions.id = dgt_test_answers.session_id
      AND (dgt_test_sessions.user_id = auth.uid() OR dgt_test_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update their own test answers"
  ON public.dgt_test_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dgt_test_sessions
      WHERE dgt_test_sessions.id = dgt_test_answers.session_id
      AND (dgt_test_sessions.user_id = auth.uid() OR dgt_test_sessions.user_id IS NULL)
    )
  );

-- ========================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С ТЕСТАМИ
-- ========================================

-- Функция для получения случайных вопросов для теста
CREATE OR REPLACE FUNCTION get_random_dgt_questions(
  p_category TEXT,
  p_limit INTEGER DEFAULT 30
)
RETURNS SETOF public.dgt_questions
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.dgt_questions
  WHERE category = p_category
  ORDER BY RANDOM()
  LIMIT p_limit;
$$;

-- Функция для обновления статистики вопроса
CREATE OR REPLACE FUNCTION update_dgt_question_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_answer IS NOT NULL THEN
    UPDATE public.dgt_questions
    SET 
      times_shown = times_shown + 1,
      times_correct = times_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Триггер для обновления статистики
CREATE TRIGGER update_dgt_question_stats_trigger
AFTER INSERT OR UPDATE ON public.dgt_test_answers
FOR EACH ROW
EXECUTE FUNCTION update_dgt_question_stats();

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_dgt_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_dgt_questions_updated_at
BEFORE UPDATE ON public.dgt_questions
FOR EACH ROW
EXECUTE FUNCTION update_dgt_updated_at_column();

