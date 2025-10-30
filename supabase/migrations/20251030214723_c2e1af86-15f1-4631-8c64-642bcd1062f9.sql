-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('single', 'multiple', 'true_false', 'image');

-- Create enum for difficulty levels
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- ========================================
-- TABLE: topics
-- ========================================
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  cover_image TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  gradient_from TEXT NOT NULL DEFAULT '#00BFFF',
  gradient_to TEXT NOT NULL DEFAULT '#39FF14',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- TABLE: tags
-- ========================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9B5CFF',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- TABLE: questions (new structure)
-- ========================================
CREATE TABLE public.questions_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  type question_type NOT NULL DEFAULT 'single',
  image_url TEXT,
  sign_code TEXT,
  source TEXT,
  percent_correct INTEGER DEFAULT 0 CHECK (percent_correct >= 0 AND percent_correct <= 100),
  question_ru TEXT NOT NULL,
  question_es TEXT NOT NULL,
  question_en TEXT NOT NULL,
  explanation_ru TEXT,
  explanation_es TEXT,
  explanation_en TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- TABLE: answer_options
-- ========================================
CREATE TABLE public.answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions_new(id) ON DELETE CASCADE NOT NULL,
  text_ru TEXT NOT NULL,
  text_es TEXT NOT NULL,
  text_en TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, position)
);

-- ========================================
-- TABLE: question_tags (many-to-many)
-- ========================================
CREATE TABLE public.question_tags (
  question_id UUID REFERENCES public.questions_new(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (question_id, tag_id)
);

-- ========================================
-- TABLE: user_progress
-- ========================================
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions_new(id) ON DELETE CASCADE NOT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  answer_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- ========================================
-- INDEXES for performance
-- ========================================
CREATE INDEX idx_questions_topic ON public.questions_new(topic_id);
CREATE INDEX idx_questions_difficulty ON public.questions_new(difficulty);
CREATE INDEX idx_questions_premium ON public.questions_new(is_premium);
CREATE INDEX idx_answer_options_question ON public.answer_options(question_id);
CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_question ON public.user_progress(question_id);
CREATE INDEX idx_question_tags_question ON public.question_tags(question_id);
CREATE INDEX idx_question_tags_tag ON public.question_tags(tag_id);

-- ========================================
-- RLS POLICIES
-- ========================================

-- Topics: everyone can view
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topics"
  ON public.topics
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert topics"
  ON public.topics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update topics"
  ON public.topics
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete topics"
  ON public.topics
  FOR DELETE
  TO authenticated
  USING (true);

-- Tags: everyone can view
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
  ON public.tags
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tags"
  ON public.tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Questions: everyone can view
ALTER TABLE public.questions_new ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON public.questions_new
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage questions"
  ON public.questions_new
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Answer options: everyone can view
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answer options"
  ON public.answer_options
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage answers"
  ON public.answer_options
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Question tags: everyone can view
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view question tags"
  ON public.question_tags
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage question tags"
  ON public.question_tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- User progress: users can only see their own
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can update their own progress"
  ON public.user_progress
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- ========================================
-- TRIGGERS for updated_at
-- ========================================
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions_new
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- SEED DATA: 10 Topics
-- ========================================
INSERT INTO public.topics (number, title_ru, title_es, title_en, cover_image, is_premium, gradient_from, gradient_to) VALUES
(1, 'Определения и использование дорог', 'Definiciones y uso de las vías', 'Definitions and road use', 'tema1.jpg', FALSE, '#00BFFF', '#39FF14'),
(2, 'Манёвры', 'Maniobras', 'Maneuvers', 'tema2.jpg', FALSE, '#00BFFF', '#39FF14'),
(3, 'Сигналы', 'Señales', 'Signs', 'tema3.jpg', FALSE, '#00BFFF', '#39FF14'),
(4, 'Освещение', 'Alumbrado', 'Lighting', 'tema4.jpg', TRUE, '#00BFFF', '#39FF14'),
(5, 'Использование ТС', 'El uso del vehículo', 'Vehicle use', 'tema5.jpg', TRUE, '#00BFFF', '#39FF14'),
(6, 'Документация', 'Documentación', 'Documentation', 'tema6.jpg', TRUE, '#00BFFF', '#39FF14'),
(7, 'Аварии', 'Los accidentes', 'Accidents', 'tema7.jpg', TRUE, '#00BFFF', '#39FF14'),
(8, 'Действия при аварии', 'Comportamiento en caso de accidente', 'Behavior in case of accident', 'tema8.jpg', TRUE, '#00BFFF', '#39FF14'),
(9, 'Механика и обслуживание', 'Mecánica y mantenimiento', 'Mechanics and Maintenance', 'tema9.jpg', TRUE, '#00BFFF', '#39FF14'),
(10, 'Техники вождения', 'Tipos y técnicas de conducción', 'Driving techniques', 'tema10.jpg', TRUE, '#00BFFF', '#39FF14');

-- ========================================
-- SEED DATA: Common Tags
-- ========================================
INSERT INTO public.tags (name_ru, name_es, name_en, color, icon) VALUES
('Приоритет', 'Prioridad', 'Priority', '#FF6B6B', '🚦'),
('Дорожные знаки', 'Señales de tráfico', 'Road signs', '#4ECDC4', '🛑'),
('Манёвры', 'Maniobras', 'Maneuvers', '#45B7D1', '🔄'),
('Скорость', 'Velocidad', 'Speed', '#FFA07A', '⚡'),
('Парковка', 'Estacionamiento', 'Parking', '#98D8C8', '🅿️'),
('Обгон', 'Adelantamiento', 'Overtaking', '#FFD93D', '➡️'),
('Пешеходы', 'Peatones', 'Pedestrians', '#6BCB77', '🚶'),
('Аварийные ситуации', 'Situaciones de emergencia', 'Emergency situations', '#FF4757', '🚨'),
('Документы', 'Documentos', 'Documents', '#95E1D3', '📄'),
('Технические требования', 'Requisitos técnicos', 'Technical requirements', '#A8E6CF', '🔧');