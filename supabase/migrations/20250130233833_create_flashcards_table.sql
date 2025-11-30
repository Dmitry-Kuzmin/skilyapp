-- ========================================
-- TABLE: flashcards
-- ========================================
-- Таблица для хранения флеш-карточек для быстрого изучения тем
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE NOT NULL, -- Уникальный идентификатор из Google Sheets для синхронизации
  topic INTEGER NOT NULL, -- Номер темы (соответствует topics.number)
  question_ru TEXT NOT NULL,
  question_es TEXT NOT NULL,
  question_eng TEXT NOT NULL,
  answer_ru TEXT NOT NULL,
  answer_es TEXT NOT NULL,
  answer_eng TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON public.flashcards(topic);
CREATE INDEX IF NOT EXISTS idx_flashcards_source_id ON public.flashcards(source_id);

-- RLS политики
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Все пользователи могут читать карточки
CREATE POLICY "Anyone can view flashcards"
  ON public.flashcards
  FOR SELECT
  USING (true);

-- Только админы могут изменять карточки (через edge functions)
CREATE POLICY "Only admins can modify flashcards"
  ON public.flashcards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = profiles.id
        AND user_roles.role = 'admin'
      )
    )
  );

-- Комментарии
COMMENT ON TABLE public.flashcards IS 'Флеш-карточки для быстрого изучения тем';
COMMENT ON COLUMN public.flashcards.source_id IS 'Уникальный идентификатор из Google Sheets для синхронизации';
COMMENT ON COLUMN public.flashcards.topic IS 'Номер темы (соответствует topics.number)';


