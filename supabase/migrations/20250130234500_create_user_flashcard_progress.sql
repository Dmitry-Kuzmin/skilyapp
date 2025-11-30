-- ========================================
-- TABLE: user_flashcard_progress
-- ========================================
-- Таблица для отслеживания прогресса пользователя по флеш-карточкам
-- Использует алгоритм Spaced Repetition (как в Anki)

CREATE TABLE IF NOT EXISTS public.user_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  topic INTEGER NOT NULL, -- Для быстрого поиска по теме
  
  -- Система повторений (Spaced Repetition)
  ease_factor NUMERIC(5,2) DEFAULT 2.5 CHECK (ease_factor >= 1.3), -- Множитель сложности (как в Anki)
  interval_days INTEGER DEFAULT 0 CHECK (interval_days >= 0), -- Интервал до следующего повторения
  repetitions INTEGER DEFAULT 0 CHECK (repetitions >= 0), -- Количество успешных повторений
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_at TIMESTAMP WITH TIME ZONE, -- Когда показывать снова
  
  -- Статус карточки
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'review', 'mastered')),
  
  -- Оценка пользователя (1-4, как в Anki)
  -- 1 = Снова (Again) - показать снова через 1 минуту
  -- 2 = Трудно (Hard) - через 10 минут
  -- 3 = Хорошо (Good) - через 1 день
  -- 4 = Легко (Easy) - через 4 дня
  last_rating INTEGER CHECK (last_rating IN (1, 2, 3, 4)),
  
  -- Позиция в сессии (для продолжения с места остановки)
  last_position INTEGER DEFAULT 0 CHECK (last_position >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, flashcard_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_user_topic 
  ON public.user_flashcard_progress(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_next_review 
  ON public.user_flashcard_progress(user_id, next_review_at) 
  WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_status 
  ON public.user_flashcard_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_flashcard_id 
  ON public.user_flashcard_progress(flashcard_id);

-- RLS политики
ALTER TABLE public.user_flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свой прогресс
CREATE POLICY "Users can view their own flashcard progress"
  ON public.user_flashcard_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Пользователи могут создавать свой прогресс
CREATE POLICY "Users can insert their own flashcard progress"
  ON public.user_flashcard_progress
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Пользователи могут обновлять свой прогресс
CREATE POLICY "Users can update their own flashcard progress"
  ON public.user_flashcard_progress
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_flashcard_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_flashcard_progress_updated_at
  BEFORE UPDATE ON public.user_flashcard_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_flashcard_progress_updated_at();

-- Комментарии
COMMENT ON TABLE public.user_flashcard_progress IS 'Прогресс пользователя по флеш-карточкам с системой Spaced Repetition';
COMMENT ON COLUMN public.user_flashcard_progress.ease_factor IS 'Множитель сложности (как в Anki), минимум 1.3';
COMMENT ON COLUMN public.user_flashcard_progress.interval_days IS 'Интервал в днях до следующего повторения';
COMMENT ON COLUMN public.user_flashcard_progress.repetitions IS 'Количество успешных повторений подряд';
COMMENT ON COLUMN public.user_flashcard_progress.last_rating IS 'Последняя оценка: 1=Снова, 2=Трудно, 3=Хорошо, 4=Легко';
COMMENT ON COLUMN public.user_flashcard_progress.last_position IS 'Последняя позиция карточки в теме для продолжения изучения';


