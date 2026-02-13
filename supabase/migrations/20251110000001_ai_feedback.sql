-- Таблица для хранения оценок AI ответов
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Кто оценил
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- Для неавторизованных пользователей
  
  -- Контекст
  question TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  topic_number INTEGER,
  test_question_id UUID, -- Если из теста
  
  -- Оценка
  rating SMALLINT CHECK (rating IN (-1, 1)), -- -1 = 👎, 1 = 👍
  
  -- Дополнительно
  comment TEXT, -- Опциональный комментарий пользователя
  response_time_ms INTEGER, -- Время генерации ответа
  model_used TEXT, -- Какая модель ответила (groq, gemini)
  used_knowledge BOOLEAN DEFAULT false, -- Использовались ли учебники
  
  -- Метаданные
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_topic ON public.ai_feedback(topic_number);

-- RLS политики
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.ai_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.ai_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.ai_feedback;

-- Все могут добавлять фидбек
CREATE POLICY "Anyone can submit feedback"
  ON public.ai_feedback
  FOR INSERT
  WITH CHECK (true);

-- Пользователи видят только свой фидбек
CREATE POLICY "Users can view own feedback"
  ON public.ai_feedback
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- Админы видят весь фидбек (через RPC функцию has_role)
CREATE POLICY "Admins can view all feedback"
  ON public.ai_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.has_role(auth.uid(), 'admin') as hr
      WHERE hr = true
    )
  );

COMMENT ON TABLE public.ai_feedback IS 'Оценки качества AI ответов для анализа и улучшения';

