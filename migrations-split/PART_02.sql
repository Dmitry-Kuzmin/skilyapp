-- ============================================
-- Безопасные миграции для Supabase
-- Часть 2
-- ============================================

-- Миграция 11/53: 20251029114526_094351da-526a-40bb-ba47-b0d7f0723ad3.sql
-- ============================================

-- Расширяем daily_bonus_def до 90 дней с разнообразными наградами
TRUNCATE TABLE daily_bonus_def;

-- Дни 1-7: Быстрая вовлеченность
INSERT INTO daily_bonus_def (day_number, reward, description) VALUES
(1, '{"xp": 10, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Первый шаг'),
(2, '{"xp": 15, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Продолжаем'),
(3, '{"xp": 20, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Набираем темп'),
(4, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost день!'),
(5, '{"xp": 30, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Почти неделя'),
(6, '{"xp": 0, "coins": 20, "boost": false, "badge": null}'::jsonb, 'День покупок'),
(7, '{"xp": 50, "coins": 10, "boost": false, "badge": "7day_streak"}'::jsonb, 'Недельный герой!'),

-- Дни 8-14
(8, '{"xp": 25, "coins": 10, "boost": false, "badge": null}'::jsonb, 'Вторая неделя'),
(9, '{"xp": 30, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Уверенный темп'),
(10, '{"xp": 35, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Десятка!'),
(11, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost заряд'),
(12, '{"xp": 40, "coins": 15, "boost": false, "badge": null}'::jsonb, 'Движение вперед'),
(13, '{"xp": 45, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Чертова дюжина'),
(14, '{"xp": 70, "coins": 20, "boost": false, "badge": "14day_streak"}'::jsonb, 'Две недели подряд!'),

-- Дни 15-21
(15, '{"xp": 35, "coins": 10, "boost": false, "badge": null}'::jsonb, 'Третья неделя'),
(16, '{"xp": 40, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Стабильность'),
(17, '{"xp": 45, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Продвижение'),
(18, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Усилитель'),
(19, '{"xp": 50, "coins": 15, "boost": false, "badge": null}'::jsonb, 'Награда дня'),
(20, '{"xp": 55, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Впечатляюще'),
(21, '{"xp": 80, "coins": 25, "boost": false, "badge": "21day_streak"}'::jsonb, 'Три недели!'),

-- Дни 22-30
(22, '{"xp": 45, "coins": 10, "boost": false, "badge": null}'::jsonb, 'Четвертая неделя'),
(23, '{"xp": 50, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Движение к цели'),
(24, '{"xp": 55, "coins": 15, "boost": false, "badge": null}'::jsonb, 'Награда'),
(25, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost мощь'),
(26, '{"xp": 60, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Ускорение'),
(27, '{"xp": 65, "coins": 20, "boost": false, "badge": null}'::jsonb, 'Приближение'),
(28, '{"xp": 70, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Месяц близко'),
(29, '{"xp": 75, "coins": 25, "boost": false, "badge": null}'::jsonb, 'Предпоследний'),
(30, '{"xp": 100, "coins": 30, "boost": true, "badge": "30day_streak"}'::jsonb, 'Месяц подряд! 🎉'),

-- Дни 31-60 (Этап закрепления)
(31, '{"xp": 50, "coins": 15, "boost": false, "badge": null}'::jsonb, 'Второй месяц'),
(32, '{"xp": 55, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Продолжаем путь'),
(33, '{"xp": 60, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Закрепление'),
(34, '{"xp": 65, "coins": 20, "boost": false, "badge": null}'::jsonb, 'Уверенность'),
(35, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Premium Boost'),
(36, '{"xp": 70, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Мастерство растет'),
(37, '{"xp": 75, "coins": 25, "boost": false, "badge": null}'::jsonb, 'Награда недели'),
(38, '{"xp": 80, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Прогресс'),
(39, '{"xp": 85, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Движение'),
(40, '{"xp": 90, "coins": 30, "boost": false, "badge": null}'::jsonb, 'Сорокадневный'),
(41, '{"xp": 60, "coins": 15, "boost": false, "badge": null}'::jsonb, 'Продолжение'),
(42, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Усилитель дня'),
(43, '{"xp": 70, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Вперед'),
(44, '{"xp": 75, "coins": 20, "boost": false, "badge": null}'::jsonb, 'Награда пути'),
(45, '{"xp": 80, "coins": 25, "boost": false, "badge": null}'::jsonb, 'Середина'),
(46, '{"xp": 85, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Прогресс'),
(47, '{"xp": 90, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Движение вперед'),
(48, '{"xp": 95, "coins": 30, "boost": false, "badge": null}'::jsonb, 'Награда'),
(49, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost заряд'),
(50, '{"xp": 100, "coins": 35, "boost": false, "badge": null}'::jsonb, 'Полтинник!'),
(51, '{"xp": 70, "coins": 20, "boost": false, "badge": null}'::jsonb, 'Дальше'),
(52, '{"xp": 75, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Стабильно'),
(53, '{"xp": 80, "coins": 25, "boost": false, "badge": null}'::jsonb, 'Награда'),
(54, '{"xp": 85, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Путь'),
(55, '{"xp": 90, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Движение'),
(56, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost мощь'),
(57, '{"xp": 95, "coins": 30, "boost": false, "badge": null}'::jsonb, 'Награда'),
(58, '{"xp": 100, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Прогресс'),
(59, '{"xp": 105, "coins": 35, "boost": false, "badge": null}'::jsonb, 'Близко к 60'),
(60, '{"xp": 120, "coins": 40, "boost": true, "badge": "60day_streak"}'::jsonb, 'Два месяца! 🔥'),

-- Дни 61-90 (Финальный этап)
(61, '{"xp": 80, "coins": 25, "boost": false, "badge": null}'::jsonb, 'Третий месяц'),
(62, '{"xp": 85, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Неостановимый'),
(63, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Мега Boost'),
(64, '{"xp": 90, "coins": 30, "boost": false, "badge": null}'::jsonb, 'Награда'),
(65, '{"xp": 95, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Путь мастера'),
(66, '{"xp": 100, "coins": 35, "boost": false, "badge": null}'::jsonb, 'Прогресс'),
(67, '{"xp": 105, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Движение'),
(68, '{"xp": 110, "coins": 40, "boost": false, "badge": null}'::jsonb, 'Награда'),
(69, '{"xp": 115, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Вперед'),
(70, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Premium Boost'),
(71, '{"xp": 120, "coins": 45, "boost": false, "badge": null}'::jsonb, 'Награда пути'),
(72, '{"xp": 90, "coins": 30, "boost": false, "badge": null}'::jsonb, 'Продолжение'),
(73, '{"xp": 95, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Стабильность'),
(74, '{"xp": 100, "coins": 35, "boost": false, "badge": null}'::jsonb, 'Награда'),
(75, '{"xp": 105, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Три четверти'),
(76, '{"xp": 110, "coins": 40, "boost": false, "badge": null}'::jsonb, 'Движение'),
(77, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost заряд'),
(78, '{"xp": 115, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Прогресс'),
(79, '{"xp": 120, "coins": 45, "boost": false, "badge": null}'::jsonb, 'Награда'),
(80, '{"xp": 125, "coins": 50, "boost": false, "badge": null}'::jsonb, 'Восьмидесятка!'),
(81, '{"xp": 100, "coins": 35, "boost": false, "badge": null}'::jsonb, 'Финальный рывок'),
(82, '{"xp": 105, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Близко к цели'),
(83, '{"xp": 110, "coins": 40, "boost": false, "badge": null}'::jsonb, 'Награда'),
(84, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Mega Boost'),
(85, '{"xp": 115, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Почти там'),
(86, '{"xp": 120, "coins": 45, "boost": false, "badge": null}'::jsonb, 'Предпоследняя неделя'),
(87, '{"xp": 125, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Еще чуть-чуть'),
(88, '{"xp": 130, "coins": 50, "boost": false, "badge": null}'::jsonb, 'Награда'),
(89, '{"xp": 135, "coins": 55, "boost": false, "badge": null}'::jsonb, 'Последний день перед финалом'),
(90, '{"xp": 200, "coins": 100, "boost": true, "badge": "90day_iron_will"}'::jsonb, 'ЖЕЛЕЗНАЯ ВОЛЯ! 🏆')
ON CONFLICT (day_number) DO NOTHING;

-- Добавляем поле для восстановления streak
ALTER TABLE user_daily_bonus ADD COLUMN IF NOT EXISTS streak_restore_available BOOLEAN DEFAULT true;
ALTER TABLE user_daily_bonus ADD COLUMN IF NOT EXISTS total_restores INTEGER DEFAULT 0;

-- Миграция 12/53: 20251030214723_c2e1af86-15f1-4631-8c64-642bcd1062f9.sql
-- ============================================

-- Create enum for question types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE public.question_type AS ENUM ('single', 'multiple', 'true_false', 'image');
  END IF;
END $$;

-- Create enum for difficulty levels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');
  END IF;
END $$;

-- ========================================
-- TABLE: topics
-- ========================================
CREATE TABLE IF NOT EXISTS public.topics (
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
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9B5CFF',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- TABLE: questions (new structure)
-- ========================================
CREATE TABLE IF NOT EXISTS public.questions_new (
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
CREATE TABLE IF NOT EXISTS public.answer_options (
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
CREATE TABLE IF NOT EXISTS public.question_tags (
  question_id UUID REFERENCES public.questions_new(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (question_id, tag_id)
);

-- ========================================
-- TABLE: user_progress
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_progress (
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
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions_new(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions_new(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_premium ON public.questions_new(is_premium);
CREATE INDEX IF NOT EXISTS idx_answer_options_question ON public.answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_question ON public.user_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_question ON public.question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON public.question_tags(tag_id);

-- ========================================
-- RLS POLICIES
-- ========================================

-- Topics: everyone can view
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view topics" ON public.topics;
CREATE POLICY "Anyone can view topics" ON public.topics
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
CREATE POLICY "Authenticated users can insert topics" ON public.topics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
CREATE POLICY "Authenticated users can update topics" ON public.topics
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;
CREATE POLICY "Authenticated users can delete topics" ON public.topics
  FOR DELETE
  TO authenticated
  USING (true);

-- Tags: everyone can view
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
CREATE POLICY "Anyone can view tags" ON public.tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.tags;
CREATE POLICY "Authenticated users can manage tags" ON public.tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Questions: everyone can view
ALTER TABLE public.questions_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions_new;
CREATE POLICY "Anyone can view questions" ON public.questions_new
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage questions" ON public.questions_new;
CREATE POLICY "Authenticated users can manage questions" ON public.questions_new
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Answer options: everyone can view
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view answer options" ON public.answer_options;
CREATE POLICY "Anyone can view answer options" ON public.answer_options
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage answers" ON public.answer_options;
CREATE POLICY "Authenticated users can manage answers" ON public.answer_options
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Question tags: everyone can view
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view question tags" ON public.question_tags;
CREATE POLICY "Anyone can view question tags" ON public.question_tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage question tags" ON public.question_tags;
CREATE POLICY "Authenticated users can manage question tags" ON public.question_tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- User progress: users can only see their own
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
CREATE POLICY "Users can insert their own progress" ON public.user_progress
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
CREATE POLICY "Users can update their own progress" ON public.user_progress
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
DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions_new;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions_new
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- SEED DATA: 10 Topics
-- ========================================
-- Ensure unique constraint exists on topics.number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE c.relname = 'topics'
    AND a.attname = 'number'
    AND i.indisunique = true
  ) THEN
    ALTER TABLE public.topics ADD CONSTRAINT topics_number_key UNIQUE (number);
  END IF;
END $$;

-- Insert topics with conditional order_index support
-- Use dynamic SQL to always include order_index if column exists
DO $$
DECLARE
  has_order_index BOOLEAN;
  sql_text TEXT;
BEGIN
  -- Check if order_index column exists using pg_attribute for more reliable check
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'topics'
    AND a.attname = 'order_index'
    AND a.attnum > 0
    AND NOT a.attisdropped
  ) INTO has_order_index;

  IF has_order_index THEN
    -- Column exists, use INSERT with order_index
    sql_text := '
      INSERT INTO public.topics (number, title_ru, title_es, title_en, cover_image, is_premium, gradient_from, gradient_to, order_index) VALUES
      (1, ''Определения и использование дорог'', ''Definiciones y uso de las vías'', ''Definitions and road use'', ''tema1.jpg'', FALSE, ''#00BFFF'', ''#39FF14'', 1),
      (2, ''Манёвры'', ''Maniobras'', ''Maneuvers'', ''tema2.jpg'', FALSE, ''#00BFFF'', ''#39FF14'', 2),
      (3, ''Сигналы'', ''Señales'', ''Signs'', ''tema3.jpg'', FALSE, ''#00BFFF'', ''#39FF14'', 3),
      (4, ''Освещение'', ''Alumbrado'', ''Lighting'', ''tema4.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 4),
      (5, ''Использование ТС'', ''El uso del vehículo'', ''Vehicle use'', ''tema5.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 5),
      (6, ''Документация'', ''Documentación'', ''Documentation'', ''tema6.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 6),
      (7, ''Аварии'', ''Los accidentes'', ''Accidents'', ''tema7.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 7),
      (8, ''Действия при аварии'', ''Comportamiento en caso de accidente'', ''Behavior in case of accident'', ''tema8.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 8),
      (9, ''Механика и обслуживание'', ''Mecánica y mantenimiento'', ''Mechanics and Maintenance'', ''tema9.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 9),
      (10, ''Техники вождения'', ''Tipos y técnicas de conducción'', ''Driving techniques'', ''tema10.jpg'', TRUE, ''#00BFFF'', ''#39FF14'', 10)
      ON CONFLICT (number) DO UPDATE SET 
        order_index = COALESCE(EXCLUDED.order_index, topics.order_index, EXCLUDED.number);
    ';
    EXECUTE sql_text;
  ELSE
    -- Column doesn't exist, use INSERT without order_index
    sql_text := '
      INSERT INTO public.topics (number, title_ru, title_es, title_en, cover_image, is_premium, gradient_from, gradient_to) VALUES
      (1, ''Определения и использование дорог'', ''Definiciones y uso de las vías'', ''Definitions and road use'', ''tema1.jpg'', FALSE, ''#00BFFF'', ''#39FF14''),
      (2, ''Манёвры'', ''Maniobras'', ''Maneuvers'', ''tema2.jpg'', FALSE, ''#00BFFF'', ''#39FF14''),
      (3, ''Сигналы'', ''Señales'', ''Signs'', ''tema3.jpg'', FALSE, ''#00BFFF'', ''#39FF14''),
      (4, ''Освещение'', ''Alumbrado'', ''Lighting'', ''tema4.jpg'', TRUE, ''#00BFFF'', ''#39FF14''),
      (5, ''Использование ТС'', ''El uso del vehículo'', ''Vehicle use'', ''tema5.jpg'', TRUE, ''#00BFFF'', ''#39FF14''),
      (6, ''Документация'', ''Documentación'', ''Documentation'', ''tema6.jpg'', TRUE, ''#00BFFF'', ''#39FF14''),
      (7, ''Аварии'', ''Los accidentes'', ''Accidents'', ''tema7.jpg'', TRUE, ''#00BFFF'', ''#39FF14''),
      (8, ''Действия при аварии'', ''Comportamiento en caso de accidente'', ''Behavior in case of accident'', ''tema8.jpg'', TRUE, ''#00BFFF'', ''#39FF14''),
      (9, ''Механика и обслуживание'', ''Mecánica y mantenimiento'', ''Mechanics and Maintenance'', ''tema9.jpg'', TRUE, ''#00BFFF'', ''#39FF14''),
      (10, ''Техники вождения'', ''Tipos y técnicas de conducción'', ''Driving techniques'', ''tema10.jpg'', TRUE, ''#00BFFF'', ''#39FF14'')
      ON CONFLICT (number) DO NOTHING;
    ';
    EXECUTE sql_text;
  END IF;
END $$;

-- ========================================
-- SEED DATA: Common Tags
-- ========================================
-- Ensure unique constraint exists on tags.name_ru
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE c.relname = 'tags'
    AND a.attname = 'name_ru'
    AND i.indisunique = true
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_name_ru_key UNIQUE (name_ru);
  END IF;
END $$;

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
('Технические требования', 'Requisitos técnicos', 'Technical requirements', '#A8E6CF', '🔧')
ON CONFLICT (name_ru) DO NOTHING;

-- Миграция 13/53: 20251101115315_44e86634-1f4e-4373-8175-65383e205147.sql
-- ============================================

-- Fix 1: Create role-based access control system
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policy for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Fix 2: Restrict profiles table access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (
  (user_id = auth.uid()) OR 
  (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
);

-- Fix 3: Fix achievements table
DELETE FROM public.achievements WHERE user_id IS NULL;

ALTER TABLE public.achievements ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can update their own achievements" ON public.achievements;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
CREATE POLICY "Users can view their own achievements" ON public.achievements
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.achievements;
CREATE POLICY "Users can insert their own achievements" ON public.achievements
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own achievements" ON public.achievements;
CREATE POLICY "Users can update their own achievements" ON public.achievements
FOR UPDATE USING (user_id = auth.uid());

-- Миграция 14/53: 20251101121121_11be829b-eeb3-427f-b11b-d6a050c0a7ca.sql
-- ============================================

-- Restrict content modification to admins only
-- Keep SELECT policies public so users can read content

-- Questions table
DROP POLICY IF EXISTS "Authenticated users can manage questions" ON public.questions_new;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions_new;
CREATE POLICY "Admins can manage questions" ON public.questions_new
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Answer options table
DROP POLICY IF EXISTS "Authenticated users can manage answers" ON public.answer_options;
DROP POLICY IF EXISTS "Admins can manage answers" ON public.answer_options;
CREATE POLICY "Admins can manage answers" ON public.answer_options
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Topics table
DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;
DROP POLICY IF EXISTS "Admins can manage topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tags table
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Language terms table
DROP POLICY IF EXISTS "Authenticated users can insert language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Authenticated users can update language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Authenticated users can delete language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Admins can manage language terms" ON public.language_terms;
CREATE POLICY "Admins can manage language terms" ON public.language_terms
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Road signs table
DROP POLICY IF EXISTS "Authenticated users can insert road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Authenticated users can update road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Authenticated users can delete road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Admins can manage road signs" ON public.road_signs;
CREATE POLICY "Admins can manage road signs" ON public.road_signs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add database-level constraints for input validation
ALTER TABLE user_progress 
  DROP CONSTRAINT IF EXISTS attempts_positive,
  DROP CONSTRAINT IF EXISTS time_positive,
  ADD CONSTRAINT attempts_positive CHECK (attempts > 0 AND attempts <= 10),
  ADD CONSTRAINT time_positive CHECK (time_spent_seconds >= 0 AND time_spent_seconds <= 7200);

ALTER TABLE game_sessions 
  DROP CONSTRAINT IF EXISTS score_range,
  DROP CONSTRAINT IF EXISTS duration_positive,
  DROP CONSTRAINT IF EXISTS total_questions_range,
  ADD CONSTRAINT score_range CHECK (score >= 0 AND score <= 100),
  ADD CONSTRAINT duration_positive CHECK (duration_seconds >= 0 AND duration_seconds <= 7200),
  ADD CONSTRAINT total_questions_range CHECK (total_questions > 0 AND total_questions <= 100);

ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS boosts_range,
  DROP CONSTRAINT IF EXISTS xp_positive,
  DROP CONSTRAINT IF EXISTS coins_positive,
  DROP CONSTRAINT IF EXISTS streak_positive,
  ADD CONSTRAINT boosts_range CHECK (boosts >= 0 AND boosts <= 100),
  ADD CONSTRAINT xp_positive CHECK (xp >= 0),
  ADD CONSTRAINT coins_positive CHECK (coins >= 0),
  ADD CONSTRAINT streak_positive CHECK (streak_days >= 0 AND streak_days <= 365);

-- Миграция 15/53: 20251101125216_b1077f38-4818-4207-80d8-61a1a1428481.sql
-- ============================================

-- Create duels table
CREATE TABLE IF NOT EXISTS public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_user UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  num_questions INTEGER NOT NULL CHECK (num_questions BETWEEN 5 AND 30),
  categories JSONB,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mix')),
  question_seed INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

-- Create duel_players table
CREATE TABLE IF NOT EXISTS public.duel_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_difficulty TEXT CHECK (bot_difficulty IN ('easy', 'medium', 'hard')),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  connected BOOLEAN NOT NULL DEFAULT true,
  estimated_latency_ms INTEGER CHECK (estimated_latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(duel_id, user_id),
  CHECK ((is_bot = false AND user_id IS NOT NULL) OR (is_bot = true))
);

-- Create duel_questions table
CREATE TABLE IF NOT EXISTS public.duel_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions_new(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  question_snapshot JSONB NOT NULL,
  correct_option_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(duel_id, position)
);

-- Create duel_answers table
CREATE TABLE IF NOT EXISTS public.duel_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES duel_players(id) ON DELETE CASCADE NOT NULL,
  duel_question_id UUID REFERENCES duel_questions(id) ON DELETE CASCADE NOT NULL,
  selected_option_id UUID,
  is_correct BOOLEAN NOT NULL,
  time_taken_ms INTEGER NOT NULL CHECK (time_taken_ms >= 0),
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  combo_at_time INTEGER NOT NULL DEFAULT 0 CHECK (combo_at_time >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, duel_question_id)
);

-- Create duel_stats table
CREATE TABLE IF NOT EXISTS public.duel_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_duels INTEGER NOT NULL DEFAULT 0 CHECK (total_duels >= 0),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  draws INTEGER NOT NULL DEFAULT 0 CHECK (draws >= 0),
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  avg_score NUMERIC(10,2) DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create daily_duel_limits table
CREATE TABLE IF NOT EXISTS public.daily_duel_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duels_played INTEGER NOT NULL DEFAULT 0 CHECK (duels_played >= 0),
  full_rewards_claimed INTEGER NOT NULL DEFAULT 0 CHECK (full_rewards_claimed >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_duels_code ON public.duels(code);
CREATE INDEX IF NOT EXISTS idx_duels_status ON public.duels(status);
CREATE INDEX IF NOT EXISTS idx_duels_host_user ON public.duels(host_user);
CREATE INDEX IF NOT EXISTS idx_duels_expires_at ON public.duels(expires_at);
CREATE INDEX IF NOT EXISTS idx_duel_players_duel_id ON public.duel_players(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_players_user_id ON public.duel_players(user_id);
CREATE INDEX IF NOT EXISTS idx_duel_questions_duel_id ON public.duel_questions(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_answers_player_id ON public.duel_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_duel_stats_user_id ON public.duel_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_duel_limits_user_date ON public.daily_duel_limits(user_id, date);

-- Enable RLS
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_duel_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duels
DROP POLICY IF EXISTS "Users can view duels they participate in" ON public.duels;
CREATE POLICY "Users can view duels they participate in" ON public.duels FOR SELECT
USING (
  id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
  OR status = 'waiting'
);

DROP POLICY IF EXISTS "Users can create duels" ON public.duels;
CREATE POLICY "Users can create duels" ON public.duels FOR INSERT
WITH CHECK (
  host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

DROP POLICY IF EXISTS "Host can update their duels" ON public.duels;
CREATE POLICY "Host can update their duels" ON public.duels FOR UPDATE
USING (
  host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policies for duel_players
DROP POLICY IF EXISTS "Users can view players in their duels" ON public.duel_players;
CREATE POLICY "Users can view players in their duels" ON public.duel_players FOR SELECT
USING (
  duel_id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

DROP POLICY IF EXISTS "Users can join duels as players" ON public.duel_players;
CREATE POLICY "Users can join duels as players" ON public.duel_players FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
  OR is_bot = true
);

DROP POLICY IF EXISTS "Users can update their player status" ON public.duel_players;
CREATE POLICY "Users can update their player status" ON public.duel_players FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policies for duel_questions
DROP POLICY IF EXISTS "Users can view questions in their duels" ON public.duel_questions;
CREATE POLICY "Users can view questions in their duels" ON public.duel_questions FOR SELECT
USING (
  duel_id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

-- RLS Policies for duel_answers
DROP POLICY IF EXISTS "Users can view answers in their duels" ON public.duel_answers;
CREATE POLICY "Users can view answers in their duels" ON public.duel_answers FOR SELECT
USING (
  duel_id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

DROP POLICY IF EXISTS "Users can insert their own answers" ON public.duel_answers;
CREATE POLICY "Users can insert their own answers" ON public.duel_answers FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

-- RLS Policies for duel_stats
DROP POLICY IF EXISTS "Users can view their own stats" ON public.duel_stats;
CREATE POLICY "Users can view their own stats" ON public.duel_stats FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

DROP POLICY IF EXISTS "Users can insert their own stats" ON public.duel_stats;
CREATE POLICY "Users can insert their own stats" ON public.duel_stats FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.duel_stats;
CREATE POLICY "Users can update their own stats" ON public.duel_stats FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policies for daily_duel_limits
DROP POLICY IF EXISTS "Users can view their own limits" ON public.daily_duel_limits;
CREATE POLICY "Users can view their own limits" ON public.daily_duel_limits FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

DROP POLICY IF EXISTS "Users can insert their own limits" ON public.daily_duel_limits;
CREATE POLICY "Users can insert their own limits" ON public.daily_duel_limits FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

DROP POLICY IF EXISTS "Users can update their own limits" ON public.daily_duel_limits;
CREATE POLICY "Users can update their own limits" ON public.daily_duel_limits FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- Enable realtime for duels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_players;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_answers;
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_duel_stats_updated_at ON public.duel_stats;
CREATE TRIGGER update_duel_stats_updated_at
BEFORE UPDATE ON public.duel_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_duel_limits_updated_at ON public.daily_duel_limits;
CREATE TRIGGER update_daily_duel_limits_updated_at
BEFORE UPDATE ON public.daily_duel_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Миграция 16/53: 20251101130542_63d9edfc-49ac-4c45-9e82-ff4718402a87.sql
-- ============================================

-- Fix RLS policies to avoid infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view players in their duels" ON public.duel_players;
DROP POLICY IF EXISTS "Users can join duels as players" ON public.duel_players;
DROP POLICY IF EXISTS "Users can update their player status" ON public.duel_players;

DROP POLICY IF EXISTS "Users can view duels they participate in" ON public.duels;
DROP POLICY IF EXISTS "Users can create duels" ON public.duels;
DROP POLICY IF EXISTS "Host can update their duels" ON public.duels;

DROP POLICY IF EXISTS "Users can view questions in their duels" ON public.duel_questions;
DROP POLICY IF EXISTS "Users can view answers in their duels" ON public.duel_answers;
DROP POLICY IF EXISTS "Users can insert their own answers" ON public.duel_answers;

DROP POLICY IF EXISTS "Users can view their own stats" ON public.duel_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.duel_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.duel_stats;

DROP POLICY IF EXISTS "Users can view their own limits" ON public.daily_duel_limits;
DROP POLICY IF EXISTS "Users can insert their own limits" ON public.daily_duel_limits;
DROP POLICY IF EXISTS "Users can update their own limits" ON public.daily_duel_limits;

-- Create simpler, non-recursive policies for duels
DROP POLICY IF EXISTS "Anyone authenticated can view waiting duels" ON public.duels;
CREATE POLICY "Anyone authenticated can view waiting duels" ON public.duels FOR SELECT
USING (status = 'waiting' OR host_user = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create duels" ON public.duels;
CREATE POLICY "Authenticated users can create duels" ON public.duels FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Host can update duels" ON public.duels;
CREATE POLICY "Host can update duels" ON public.duels FOR UPDATE
USING (host_user = auth.uid());

-- Create simpler policies for duel_players
DROP POLICY IF EXISTS "Anyone can view duel players" ON public.duel_players;
CREATE POLICY "Anyone can view duel players" ON public.duel_players FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can join duels" ON public.duel_players;
CREATE POLICY "Authenticated users can join duels" ON public.duel_players FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their player records" ON public.duel_players;
CREATE POLICY "Users can update their player records" ON public.duel_players FOR UPDATE
USING (user_id = auth.uid() OR is_bot = true);

-- Create simpler policies for duel_questions
DROP POLICY IF EXISTS "Anyone can view duel questions" ON public.duel_questions;
CREATE POLICY "Anyone can view duel questions" ON public.duel_questions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "System can insert duel questions" ON public.duel_questions;
CREATE POLICY "System can insert duel questions" ON public.duel_questions FOR INSERT
WITH CHECK (true);

-- Create simpler policies for duel_answers
DROP POLICY IF EXISTS "Anyone can view duel answers" ON public.duel_answers;
CREATE POLICY "Anyone can view duel answers" ON public.duel_answers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert answers" ON public.duel_answers;
CREATE POLICY "Authenticated users can insert answers" ON public.duel_answers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simpler policies for duel_stats
DROP POLICY IF EXISTS "Users can view all stats" ON public.duel_stats;
CREATE POLICY "Users can view all stats" ON public.duel_stats FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage stats" ON public.duel_stats;
CREATE POLICY "Authenticated users can manage stats" ON public.duel_stats FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simpler policies for daily_duel_limits
DROP POLICY IF EXISTS "Users can view all limits" ON public.daily_duel_limits;
CREATE POLICY "Users can view all limits" ON public.daily_duel_limits FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage limits" ON public.daily_duel_limits;
CREATE POLICY "Authenticated users can manage limits" ON public.daily_duel_limits FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Миграция 17/53: 20251101130828_821b3e4f-fcb3-4c92-8ec9-59f28aefc40b.sql
-- ============================================

-- Fix the foreign key constraint in duels table to reference profiles.id instead of profiles.user_id
ALTER TABLE duels DROP CONSTRAINT IF EXISTS duels_host_user_fkey;
ALTER TABLE duels ADD CONSTRAINT duels_host_user_fkey 
  FOREIGN KEY (host_user) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same fix for duel_players
ALTER TABLE duel_players DROP CONSTRAINT IF EXISTS duel_players_user_id_fkey;
ALTER TABLE duel_players ADD CONSTRAINT duel_players_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same fix for duel_stats
ALTER TABLE duel_stats DROP CONSTRAINT IF EXISTS duel_stats_user_id_fkey;
ALTER TABLE duel_stats ADD CONSTRAINT duel_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same fix for daily_duel_limits
ALTER TABLE daily_duel_limits DROP CONSTRAINT IF EXISTS daily_duel_limits_user_id_fkey;
ALTER TABLE daily_duel_limits ADD CONSTRAINT daily_duel_limits_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Grant admin role to kuzmin.public@gmail.com (only if user exists)
-- Ensure unique constraint exists on user_roles(user_id, role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    WHERE c.relname = 'user_roles'
    AND i.indisunique = true
    AND array_length(i.indkey, 1) = 2
    AND EXISTS (
      SELECT 1 FROM pg_attribute a1
      WHERE a1.attrelid = c.oid AND a1.attnum = i.indkey[0] AND a1.attname = 'user_id'
    )
    AND EXISTS (
      SELECT 1 FROM pg_attribute a2
      WHERE a2.attrelid = c.oid AND a2.attnum = i.indkey[1] AND a2.attname = 'role'
    )
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

INSERT INTO user_roles (user_id, role)
SELECT '0d897282-c18b-4140-bd77-fecb23cd1af1', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '0d897282-c18b-4140-bd77-fecb23cd1af1')
ON CONFLICT (user_id, role) DO NOTHING;

-- Миграция 18/53: 20251101131602_d8cf8664-04d8-4a5d-948d-29c88e3fa432.sql
-- ============================================

-- Fix RLS policies for duel_questions - restrict to players only
DROP POLICY IF EXISTS "Anyone can view duel questions" ON duel_questions;
DROP POLICY IF EXISTS "Players can view their duel questions" ON duel_questions;
CREATE POLICY "Players can view their duel questions" ON duel_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_players
      WHERE duel_players.duel_id = duel_questions.duel_id
        AND duel_players.user_id IN (
          SELECT id FROM profiles 
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
    )
  );

-- Fix RLS policies for duel_answers - restrict to players only
DROP POLICY IF EXISTS "Anyone can view duel answers" ON duel_answers;
DROP POLICY IF EXISTS "Players can view duel answers" ON duel_answers;
CREATE POLICY "Players can view duel answers" ON duel_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_players
      WHERE duel_players.duel_id = duel_answers.duel_id
        AND duel_players.user_id IN (
          SELECT id FROM profiles 
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
    )
  );

-- Create function to increment profile values
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id UUID,
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  )
  USING p_amount, p_profile_id;
END;
$$;

-- Create function to upsert duel stats
CREATE OR REPLACE FUNCTION public.upsert_duel_stats(
  p_user_id UUID,
  p_is_win BOOLEAN,
  p_is_draw BOOLEAN,
  p_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO duel_stats (
    user_id, total_duels, wins, draws, losses, 
    total_points, current_streak, best_streak, avg_score
  )
  VALUES (
    p_user_id, 1,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_draw THEN 1 ELSE 0 END,
    CASE WHEN NOT p_is_win AND NOT p_is_draw THEN 1 ELSE 0 END,
    p_score,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    p_score
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_duels = duel_stats.total_duels + 1,
    wins = duel_stats.wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    draws = duel_stats.draws + CASE WHEN p_is_draw THEN 1 ELSE 0 END,
    losses = duel_stats.losses + CASE WHEN NOT p_is_win AND NOT p_is_draw THEN 1 ELSE 0 END,
    total_points = duel_stats.total_points + p_score,
    current_streak = CASE 
      WHEN p_is_win THEN duel_stats.current_streak + 1 
      ELSE 0 
    END,
    best_streak = GREATEST(
      duel_stats.best_streak,
      CASE WHEN p_is_win THEN duel_stats.current_streak + 1 ELSE 0 END
    ),
    avg_score = (duel_stats.total_points + p_score)::numeric / (duel_stats.total_duels + 1),
    updated_at = NOW();
END;
$$;

-- Миграция 19/53: 20251101132537_15a5e02e-0c5e-459c-96a6-60563a8ad9a4.sql
-- ============================================

-- Создать таблицу определений типов бустов
CREATE TABLE IF NOT EXISTS public.boost_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT UNIQUE NOT NULL,
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  icon TEXT,
  cost_coins INTEGER NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Инвентарь бустов пользователя
CREATE TABLE IF NOT EXISTS public.boost_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, boost_type)
);

-- История использования бустов в дуэлях
CREATE TABLE IF NOT EXISTS public.duel_boosts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES duel_players(id) ON DELETE CASCADE,
  duel_question_id UUID REFERENCES duel_questions(id) ON DELETE SET NULL,
  boost_type TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавить поля в таблицу duel_answers
ALTER TABLE public.duel_answers 
  ADD COLUMN IF NOT EXISTS boost_used TEXT,
  ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false;

-- Изменить selected_option_id на nullable для пропусков
ALTER TABLE public.duel_answers 
  ALTER COLUMN selected_option_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.boost_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_boosts_used ENABLE ROW LEVEL SECURITY;

-- RLS политики для boost_definitions
DROP POLICY IF EXISTS "Anyone can view boost definitions" ON public.boost_definitions;
CREATE POLICY "Anyone can view boost definitions" ON public.boost_definitions FOR SELECT
  USING (true);

-- RLS политики для boost_inventory
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.boost_inventory;
CREATE POLICY "Users can view their own inventory" ON public.boost_inventory FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own inventory" ON public.boost_inventory;
CREATE POLICY "Users can insert their own inventory" ON public.boost_inventory FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can update their own inventory" ON public.boost_inventory;
CREATE POLICY "Users can update their own inventory" ON public.boost_inventory FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- RLS политики для duel_boosts_used
DROP POLICY IF EXISTS "Players can view boosts used in their duels" ON public.duel_boosts_used;
CREATE POLICY "Players can view boosts used in their duels" ON public.duel_boosts_used FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_players
      WHERE duel_players.duel_id = duel_boosts_used.duel_id
        AND duel_players.user_id IN (
          SELECT id FROM profiles 
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert boost usage" ON public.duel_boosts_used;
CREATE POLICY "Authenticated users can insert boost usage" ON public.duel_boosts_used FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Создать функцию для модификации инвентаря бустов
CREATE OR REPLACE FUNCTION public.modify_boost_inventory(
  p_user_id UUID,
  p_boost_type TEXT,
  p_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO boost_inventory (user_id, boost_type, quantity, updated_at)
  VALUES (p_user_id, p_boost_type, GREATEST(0, p_change), NOW())
  ON CONFLICT (user_id, boost_type) 
  DO UPDATE SET 
    quantity = GREATEST(0, boost_inventory.quantity + p_change),
    updated_at = NOW();
END;
$$;

-- Создать функцию для проверки наличия буста
CREATE OR REPLACE FUNCTION public.has_boost(
  p_user_id UUID,
  p_boost_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_quantity
  FROM boost_inventory
  WHERE user_id = p_user_id 
    AND boost_type = p_boost_type;
  
  RETURN COALESCE(v_quantity, 0) > 0;
END;
$$;

-- Наполнить таблицу определений бустов
-- Ensure table exists with type column and unique constraint
DO $$
BEGIN
  -- Проверяем, существует ли таблица
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'boost_definitions'
    AND n.nspname = 'public'
  ) THEN
    -- Таблица существует, проверяем наличие колонки type
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'boost_definitions'
      AND column_name = 'type'
    ) THEN
      -- Колонка type не существует, добавляем ее
      ALTER TABLE public.boost_definitions ADD COLUMN type TEXT;
    END IF;
    
    -- Проверяем, есть ли уникальный индекс на колонке type
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
      WHERE c.relname = 'boost_definitions'
      AND a.attname = 'type'
      AND i.indisunique = true
    ) THEN
      -- Если нет уникального ограничения, добавляем его
      ALTER TABLE public.boost_definitions ADD CONSTRAINT boost_definitions_type_key UNIQUE (type);
    END IF;
  END IF;
END $$;

INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins) VALUES
('fifty_fifty', '50/50', '50/50', 'Убирает 2 неправильных ответа', 'Elimina 2 respuestas incorrectas', '⚡', 10),
('time_extend', '+30 секунд', '+30 segundos', 'Добавляет 30 секунд к таймеру', 'Añade 30 segundos al temporizador', '⏱️', 15),
('hint', 'Подсказка', 'Pista', 'Показывает объяснение к вопросу', 'Muestra la explicación de la pregunta', '💡', 20),
('skip', 'Пропустить', 'Saltar', 'Пропустить вопрос без штрафа', 'Saltar pregunta sin penalización', '⏭️', 25)
ON CONFLICT (type) DO NOTHING;

-- Создать триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_boost_inventory_updated_at ON public.boost_inventory;
CREATE TRIGGER update_boost_inventory_updated_at
  BEFORE UPDATE ON public.boost_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Миграция 20/53: 20251101215710_8d22e4cd-28a5-4709-9032-acc532a7ec27.sql
-- ============================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Anyone authenticated can view waiting duels" ON duels;

-- Create new policy allowing players to view their duels
DROP POLICY IF EXISTS "Players can view their duels" ON duels;
CREATE POLICY "Players can view their duels" ON duels
FOR SELECT
USING (
  -- Host always sees their duel
  host_user = auth.uid()
  OR
  -- Player sees duel if they're participating
  EXISTS (
    SELECT 1 FROM duel_players
    WHERE duel_players.duel_id = duels.id
    AND duel_players.user_id IN (
      SELECT id FROM profiles
      WHERE profiles.user_id = auth.uid()
      OR profiles.telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
  OR
  -- Or duel is still waiting (for joining)
  status = 'waiting'
);

-- Set REPLICA IDENTITY FULL for complete data on updates
ALTER TABLE duels REPLICA IDENTITY FULL;
ALTER TABLE duel_players REPLICA IDENTITY FULL;
ALTER TABLE duel_questions REPLICA IDENTITY FULL;
ALTER TABLE duel_answers REPLICA IDENTITY FULL;

