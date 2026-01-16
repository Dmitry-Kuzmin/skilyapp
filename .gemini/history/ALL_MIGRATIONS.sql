-- ============================================
-- Объединенные миграции для Supabase
-- Всего миграций: 53
-- Создано автоматически
-- ============================================

-- ============================================
-- Миграция 1/53: 20251025190138_853a08b0-ea77-4dc3-a778-d1c9551865e5.sql
-- ============================================

-- Create terms table for storing test data
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spanish TEXT NOT NULL,
  russian TEXT NOT NULL,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('Лёгкая', 'Средняя', 'Сложная')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read terms (for games)
CREATE POLICY "Anyone can view terms" 
ON public.terms 
FOR SELECT 
USING (true);

-- Only authenticated admins can insert/update/delete terms
-- For now, we'll allow all authenticated users to manage terms
-- You can modify this later to check for admin role
CREATE POLICY "Authenticated users can insert terms" 
ON public.terms 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update terms" 
ON public.terms 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete terms" 
ON public.terms 
FOR DELETE 
TO authenticated
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_terms_updated_at
BEFORE UPDATE ON public.terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create game_sessions table to track game history
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own game sessions
CREATE POLICY "Users can view their own sessions" 
ON public.game_sessions 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can insert their own game sessions
CREATE POLICY "Users can insert their own sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- Миграция 2/53: 20251026075231_e3f57da0-3c46-4c81-acdd-220644d9d330.sql
-- ============================================

-- Drop old terms table and create new questions table
DROP TABLE IF EXISTS terms;

-- Create questions table with proper structure
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_es TEXT NOT NULL,
  topic_ru TEXT NOT NULL,
  question_es TEXT NOT NULL,
  question_ru TEXT NOT NULL,
  options_es TEXT[] NOT NULL,
  options_ru TEXT[] NOT NULL,
  correct_answer_es TEXT NOT NULL,
  correct_answer_ru TEXT NOT NULL,
  explanation_es TEXT,
  explanation_ru TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view questions" 
ON public.questions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update questions" 
ON public.questions 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete questions" 
ON public.questions 
FOR DELETE 
USING (true);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  max_progress INTEGER DEFAULT 1,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for achievements
CREATE POLICY "Users can view their own achievements" 
ON public.achievements 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own achievements" 
ON public.achievements 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own achievements" 
ON public.achievements 
FOR UPDATE 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Add trigger for questions updated_at
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Миграция 3/53: 20251026093842_402cedb4-10b4-4cc3-8632-35c3e979c2b2.sql
-- ============================================

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  language_code TEXT,
  platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'telegram')),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'pro')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies: users can read all profiles but only update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Create index for telegram_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Миграция 4/53: 20251026093855_aef0b50f-4926-413c-ac35-e69332e92604.sql
-- ============================================

-- Fix function search path security issue
ALTER FUNCTION update_updated_at_column() SET search_path = public;

-- ============================================
-- Миграция 5/53: 20251026100038_efe30d10-6b8d-4c68-9350-5a89c5278342.sql
-- ============================================

-- Add missing fields to profiles table for user settings and tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS clerk_id text,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boosts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{"theme": "light", "language": "en", "notifications": true}'::jsonb,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone DEFAULT now();

-- Create index for clerk_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON public.profiles(clerk_id);

-- Update RLS policy to allow users to update their own last_login
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint 
       OR clerk_id = auth.uid()::text);

-- ============================================
-- Миграция 6/53: 20251026102252_204e38c6-6ccc-406d-a6aa-83f1acf295f5.sql
-- ============================================

-- Create road_signs table
CREATE TABLE IF NOT EXISTS public.road_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_es TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  sign_type TEXT NOT NULL,
  sign_number TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create language_terms table
CREATE TABLE IF NOT EXISTS public.language_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_es TEXT NOT NULL,
  term_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  category UUID,
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.road_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_terms ENABLE ROW LEVEL SECURITY;

-- Create policies for road_signs (public read access)
CREATE POLICY "Anyone can view road signs"
ON public.road_signs
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert road signs"
ON public.road_signs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update road signs"
ON public.road_signs
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete road signs"
ON public.road_signs
FOR DELETE
USING (true);

-- Create policies for language_terms (public read access)
CREATE POLICY "Anyone can view language terms"
ON public.language_terms
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert language terms"
ON public.language_terms
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update language terms"
ON public.language_terms
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete language terms"
ON public.language_terms
FOR DELETE
USING (true);

-- ============================================
-- Миграция 7/53: 20251027155730_5da971da-b03c-4611-bac6-d3d0fb1c93de.sql
-- ============================================

-- Add user_id column to profiles table for Supabase Auth integration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on user_id to ensure one profile per auth user
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);

-- Update RLS policies to support both Telegram and Supabase Auth
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (
  (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json->>'telegram_id')::bigint)
  OR (user_id = auth.uid())
  OR (clerk_id = (auth.uid())::text)
);

-- Policy for selecting profiles (anyone can view)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Policy for inserting profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  (user_id = auth.uid())
  OR (telegram_id IS NOT NULL)
);

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    settings,
    platform
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'last_name',
    '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
    'web'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to link Telegram account to existing Supabase auth user
CREATE OR REPLACE FUNCTION public.link_telegram_to_user(
  _user_id UUID,
  _telegram_id BIGINT,
  _first_name TEXT,
  _last_name TEXT DEFAULT NULL,
  _username TEXT DEFAULT NULL,
  _photo_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    telegram_id = _telegram_id,
    first_name = COALESCE(_first_name, first_name),
    last_name = COALESCE(_last_name, last_name),
    username = COALESCE(_username, username),
    photo_url = COALESCE(_photo_url, photo_url),
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- ============================================
-- Миграция 8/53: 20251027162036_8ba30944-68f2-4d9a-9ed7-10e5b6656087.sql
-- ============================================

-- Make telegram_id nullable to allow email/password registration
ALTER TABLE public.profiles 
ALTER COLUMN telegram_id DROP NOT NULL;

-- Update the handle_new_user function to not require telegram_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    settings,
    platform,
    telegram_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'last_name',
    '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
    'web',
    NULL  -- Allow NULL for email/password users
  );
  RETURN NEW;
END;
$function$;

-- ============================================
-- Миграция 9/53: 20251027170051_2f973c01-c80f-44b4-ba2f-400a9baf8a22.sql
-- ============================================

-- Таблица для прогресса пользователя по испанским терминам
CREATE TABLE public.user_term_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES language_terms(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  times_practiced INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, term_id)
);

-- Таблица для прогресса пользователя по дорожным знакам
CREATE TABLE public.user_sign_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sign_id UUID NOT NULL REFERENCES road_signs(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  times_practiced INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sign_id)
);

-- Таблица для ежедневных заданий пользователя
CREATE TABLE public.daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL,
  reward INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_type, date)
);

-- Добавляем поля в profiles для статистики
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank TEXT NOT NULL DEFAULT 'Ученик',
ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Добавляем поля в game_sessions для деталей теста
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS mode TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS questions_data JSONB;

-- Enable RLS
ALTER TABLE public.user_term_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sign_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies для user_term_progress
CREATE POLICY "Users can view their own term progress"
ON public.user_term_progress FOR SELECT
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

CREATE POLICY "Users can insert their own term progress"
ON public.user_term_progress FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

CREATE POLICY "Users can update their own term progress"
ON public.user_term_progress FOR UPDATE
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

-- RLS Policies для user_sign_progress
CREATE POLICY "Users can view their own sign progress"
ON public.user_sign_progress FOR SELECT
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

CREATE POLICY "Users can insert their own sign progress"
ON public.user_sign_progress FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

CREATE POLICY "Users can update their own sign progress"
ON public.user_sign_progress FOR UPDATE
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

-- RLS Policies для daily_tasks
CREATE POLICY "Users can view their own daily tasks"
ON public.daily_tasks FOR SELECT
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

CREATE POLICY "Users can insert their own daily tasks"
ON public.daily_tasks FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

CREATE POLICY "Users can update their own daily tasks"
ON public.daily_tasks FOR UPDATE
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

-- Триггеры для обновления updated_at
CREATE TRIGGER update_user_term_progress_updated_at
BEFORE UPDATE ON public.user_term_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_sign_progress_updated_at
BEFORE UPDATE ON public.user_sign_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_tasks_updated_at
BEFORE UPDATE ON public.daily_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Миграция 10/53: 20251028100537_b28a6ef2-d923-4d3e-9606-c749722abdeb.sql
-- ============================================

-- Create daily_bonus_def table (predefined daily rewards)
CREATE TABLE public.daily_bonus_def (
  day_number INTEGER PRIMARY KEY,
  reward JSONB NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_daily_bonus table (user streak tracking)
CREATE TABLE public.user_daily_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_claimed_date DATE,
  total_claims INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.daily_bonus_def ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_bonus ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_bonus_def (everyone can view)
CREATE POLICY "Anyone can view daily bonus definitions"
  ON public.daily_bonus_def
  FOR SELECT
  USING (true);

-- RLS Policies for user_daily_bonus
CREATE POLICY "Users can view their own daily bonus"
  ON public.user_daily_bonus
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can insert their own daily bonus"
  ON public.user_daily_bonus
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can update their own daily bonus"
  ON public.user_daily_bonus
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_user_daily_bonus_updated_at
  BEFORE UPDATE ON public.user_daily_bonus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Populate daily_bonus_def with 7-day cycle
INSERT INTO public.daily_bonus_def (day_number, reward, description) VALUES
  (1, '{"xp": 10, "coins": 0}'::jsonb, 'Добро пожаловать! Начни новую серию'),
  (2, '{"xp": 15, "coins": 0}'::jsonb, 'Отлично! Продолжай в том же духе'),
  (3, '{"xp": 20, "coins": 0}'::jsonb, 'Три дня подряд — отличный темп!'),
  (4, '{"xp": 25, "coins": 5}'::jsonb, 'Четвёртый день! Ты на верном пути'),
  (5, '{"xp": 30, "coins": 10}'::jsonb, 'Почти неделя! Так держать'),
  (6, '{"xp": 35, "coins": 15}'::jsonb, 'Шестой день — ты великолепен!'),
  (7, '{"xp": 50, "coins": 25, "badge": "weekly_hero"}'::jsonb, '🏆 Недельный герой! Особая награда');

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
(90, '{"xp": 200, "coins": 100, "boost": true, "badge": "90day_iron_will"}'::jsonb, 'ЖЕЛЕЗНАЯ ВОЛЯ! 🏆');

-- Добавляем поле для восстановления streak
ALTER TABLE user_daily_bonus ADD COLUMN IF NOT EXISTS streak_restore_available BOOLEAN DEFAULT true;
ALTER TABLE user_daily_bonus ADD COLUMN IF NOT EXISTS total_restores INTEGER DEFAULT 0;

-- ============================================
-- Миграция 12/53: 20251030214723_c2e1af86-15f1-4631-8c64-642bcd1062f9.sql
-- ============================================

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

-- ============================================
-- Миграция 13/53: 20251101115315_44e86634-1f4e-4373-8175-65383e205147.sql
-- ============================================

-- Fix 1: Create role-based access control system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
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
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Fix 2: Restrict profiles table access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

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

CREATE POLICY "Users can view their own achievements" ON public.achievements
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own achievements" ON public.achievements
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own achievements" ON public.achievements
FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- Миграция 14/53: 20251101121121_11be829b-eeb3-427f-b11b-d6a050c0a7ca.sql
-- ============================================

-- Restrict content modification to admins only
-- Keep SELECT policies public so users can read content

-- Questions table
DROP POLICY IF EXISTS "Authenticated users can manage questions" ON public.questions_new;
CREATE POLICY "Admins can manage questions" ON public.questions_new
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Answer options table
DROP POLICY IF EXISTS "Authenticated users can manage answers" ON public.answer_options;
CREATE POLICY "Admins can manage answers" ON public.answer_options
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Topics table
DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tags table
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Language terms table
DROP POLICY IF EXISTS "Authenticated users can insert language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Authenticated users can update language terms" ON public.language_terms;
DROP POLICY IF EXISTS "Authenticated users can delete language terms" ON public.language_terms;
CREATE POLICY "Admins can manage language terms" ON public.language_terms
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Road signs table
DROP POLICY IF EXISTS "Authenticated users can insert road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Authenticated users can update road signs" ON public.road_signs;
DROP POLICY IF EXISTS "Authenticated users can delete road signs" ON public.road_signs;
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

-- ============================================
-- Миграция 15/53: 20251101125216_b1077f38-4818-4207-80d8-61a1a1428481.sql
-- ============================================

-- Create duels table
CREATE TABLE public.duels (
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
CREATE TABLE public.duel_players (
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
CREATE TABLE public.duel_questions (
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
CREATE TABLE public.duel_answers (
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
CREATE TABLE public.duel_stats (
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
CREATE TABLE public.daily_duel_limits (
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
CREATE INDEX idx_duels_code ON public.duels(code);
CREATE INDEX idx_duels_status ON public.duels(status);
CREATE INDEX idx_duels_host_user ON public.duels(host_user);
CREATE INDEX idx_duels_expires_at ON public.duels(expires_at);
CREATE INDEX idx_duel_players_duel_id ON public.duel_players(duel_id);
CREATE INDEX idx_duel_players_user_id ON public.duel_players(user_id);
CREATE INDEX idx_duel_questions_duel_id ON public.duel_questions(duel_id);
CREATE INDEX idx_duel_answers_player_id ON public.duel_answers(player_id);
CREATE INDEX idx_duel_stats_user_id ON public.duel_stats(user_id);
CREATE INDEX idx_daily_duel_limits_user_date ON public.daily_duel_limits(user_id, date);

-- Enable RLS
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_duel_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duels
CREATE POLICY "Users can view duels they participate in"
ON public.duels FOR SELECT
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

CREATE POLICY "Users can create duels"
ON public.duels FOR INSERT
WITH CHECK (
  host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

CREATE POLICY "Host can update their duels"
ON public.duels FOR UPDATE
USING (
  host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policies for duel_players
CREATE POLICY "Users can view players in their duels"
ON public.duel_players FOR SELECT
USING (
  duel_id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

CREATE POLICY "Users can join duels as players"
ON public.duel_players FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
  OR is_bot = true
);

CREATE POLICY "Users can update their player status"
ON public.duel_players FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policies for duel_questions
CREATE POLICY "Users can view questions in their duels"
ON public.duel_questions FOR SELECT
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
CREATE POLICY "Users can view answers in their duels"
ON public.duel_answers FOR SELECT
USING (
  duel_id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

CREATE POLICY "Users can insert their own answers"
ON public.duel_answers FOR INSERT
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
CREATE POLICY "Users can view their own stats"
ON public.duel_stats FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

CREATE POLICY "Users can insert their own stats"
ON public.duel_stats FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

CREATE POLICY "Users can update their own stats"
ON public.duel_stats FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policies for daily_duel_limits
CREATE POLICY "Users can view their own limits"
ON public.daily_duel_limits FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

CREATE POLICY "Users can insert their own limits"
ON public.daily_duel_limits FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

CREATE POLICY "Users can update their own limits"
ON public.daily_duel_limits FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- Enable realtime for duels
ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_answers;

-- Trigger for updated_at
CREATE TRIGGER update_duel_stats_updated_at
BEFORE UPDATE ON public.duel_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_duel_limits_updated_at
BEFORE UPDATE ON public.daily_duel_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
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
CREATE POLICY "Anyone authenticated can view waiting duels"
ON public.duels FOR SELECT
USING (status = 'waiting' OR host_user = auth.uid());

CREATE POLICY "Authenticated users can create duels"
ON public.duels FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Host can update duels"
ON public.duels FOR UPDATE
USING (host_user = auth.uid());

-- Create simpler policies for duel_players
CREATE POLICY "Anyone can view duel players"
ON public.duel_players FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join duels"
ON public.duel_players FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their player records"
ON public.duel_players FOR UPDATE
USING (user_id = auth.uid() OR is_bot = true);

-- Create simpler policies for duel_questions
CREATE POLICY "Anyone can view duel questions"
ON public.duel_questions FOR SELECT
USING (true);

CREATE POLICY "System can insert duel questions"
ON public.duel_questions FOR INSERT
WITH CHECK (true);

-- Create simpler policies for duel_answers
CREATE POLICY "Anyone can view duel answers"
ON public.duel_answers FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert answers"
ON public.duel_answers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simpler policies for duel_stats
CREATE POLICY "Users can view all stats"
ON public.duel_stats FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage stats"
ON public.duel_stats FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create simpler policies for daily_duel_limits
CREATE POLICY "Users can view all limits"
ON public.daily_duel_limits FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage limits"
ON public.daily_duel_limits FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
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
INSERT INTO user_roles (user_id, role)
SELECT '0d897282-c18b-4140-bd77-fecb23cd1af1', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '0d897282-c18b-4140-bd77-fecb23cd1af1')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- Миграция 18/53: 20251101131602_d8cf8664-04d8-4a5d-948d-29c88e3fa432.sql
-- ============================================

-- Fix RLS policies for duel_questions - restrict to players only
DROP POLICY IF EXISTS "Anyone can view duel questions" ON duel_questions;
CREATE POLICY "Players can view their duel questions"
  ON duel_questions FOR SELECT
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
CREATE POLICY "Players can view duel answers"
  ON duel_answers FOR SELECT
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

-- ============================================
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
CREATE POLICY "Anyone can view boost definitions"
  ON public.boost_definitions FOR SELECT
  USING (true);

-- RLS политики для boost_inventory
CREATE POLICY "Users can view their own inventory"
  ON public.boost_inventory FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can insert their own inventory"
  ON public.boost_inventory FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can update their own inventory"
  ON public.boost_inventory FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- RLS политики для duel_boosts_used
CREATE POLICY "Players can view boosts used in their duels"
  ON public.duel_boosts_used FOR SELECT
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

CREATE POLICY "Authenticated users can insert boost usage"
  ON public.duel_boosts_used FOR INSERT
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

CREATE TRIGGER update_boost_inventory_updated_at
  BEFORE UPDATE ON public.boost_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Миграция 20/53: 20251101215710_8d22e4cd-28a5-4709-9032-acc532a7ec27.sql
-- ============================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Anyone authenticated can view waiting duels" ON duels;

-- Create new policy allowing players to view their duels
CREATE POLICY "Players can view their duels"
ON duels
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

-- ============================================
-- Миграция 21/53: 20251102104340_ac3dfc8a-ce23-4b88-8fee-71a3cea0bb43.sql
-- ============================================

-- Fix RLS policy for duels table to support Telegram users properly
DROP POLICY IF EXISTS "Players can view their duels" ON duels;

CREATE POLICY "Players can view their duels" 
ON duels 
FOR SELECT 
USING (
  -- Host can always view (check both auth.uid and profile matching)
  (host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ))
  OR
  -- Players in the duel can view
  (EXISTS (
    SELECT 1 FROM duel_players 
    WHERE duel_players.duel_id = duels.id 
    AND duel_players.user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  ))
  OR
  -- Anyone can view waiting duels (for join)
  (status = 'waiting')
);

-- Also fix the Host can update duels policy
DROP POLICY IF EXISTS "Host can update duels" ON duels;

CREATE POLICY "Host can update duels" 
ON duels 
FOR UPDATE 
USING (
  host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- ============================================
-- Миграция 22/53: 20251102105038_d956014e-29b1-49de-83ca-5ccf206d2cec.sql
-- ============================================

-- Fix RLS policy for duel_questions to support Telegram users
DROP POLICY IF EXISTS "Players can view their duel questions" ON duel_questions;

CREATE POLICY "Players can view their duel questions" 
ON duel_questions 
FOR SELECT 
USING (
  -- Player is in the duel (works for both Telegram and email users)
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

-- ============================================
-- Миграция 23/53: 20251102132724_f773db25-91cf-4331-af12-adc6eca99aa1.sql
-- ============================================

-- Создание таблицы уведомлений для дуэлей
CREATE TABLE IF NOT EXISTS duel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duel_id uuid REFERENCES duels(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind')),
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_duel_notifications_user_id ON duel_notifications(user_id);
CREATE INDEX idx_duel_notifications_duel_id ON duel_notifications(duel_id);
CREATE INDEX idx_duel_notifications_created_at ON duel_notifications(created_at DESC);
CREATE INDEX idx_duel_notifications_is_read ON duel_notifications(is_read) WHERE is_read = false;

-- RLS политики
ALTER TABLE duel_notifications ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои уведомления
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Система может создавать уведомления
CREATE POLICY "System can create notifications"
  ON duel_notifications
  FOR INSERT
  WITH CHECK (true);

-- Пользователи могут обновлять свои уведомления (пометить как прочитанные)
CREATE POLICY "Users can update their own notifications"
  ON duel_notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Включаем realtime для таблицы уведомлений
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;

-- ============================================
-- Миграция 24/53: 20251102205805_25e7ccf5-265d-4bdc-8853-d7a4487571f4.sql
-- ============================================

-- Create avatars bucket for user profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  3145728, -- 3MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies for avatars bucket
CREATE POLICY "Users can view all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- Миграция 25/53: 20251103120000_simplify_notification_rls_for_realtime.sql
-- ============================================

-- Упрощение RLS политики для уведомлений для корректной работы realtime
-- Realtime требует простые условия

-- Удаляем существующую политику SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- Создаем функцию для получения profile_id текущего пользователя
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Создаем упрощенную политику с использованием функции
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- Включаем realtime для таблицы (только если еще не добавлена)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  END IF;
END $$;



-- ============================================
-- Миграция 26/53: 20251103232650_add_reminder_notification_type.sql
-- ============================================

-- Добавление типа 'reminder' для уведомлений
-- Обновление CHECK constraint для поддержки нового типа уведомлений

ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder'));



-- ============================================
-- Миграция 27/53: 20251103232700_fix_notification_rls.sql
-- ============================================

-- Упрощение RLS политики для уведомлений для корректной работы realtime
-- Политика SELECT должна быть простой для работы realtime

-- Удаляем старую политику SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- Создаем упрощенную политику SELECT
-- Используем прямой доступ к user_id для совместимости с realtime
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Проверяем, что realtime включен для таблицы (только если еще не добавлена)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  END IF;
END $$;



-- ============================================
-- Миграция 28/53: 20251104000000_allow_profiles_read_for_duels.sql
-- ============================================

-- Разрешить чтение профилей для участников дуэли
-- Это необходимо для отображения имени соперника в игре

-- Удаляем старую политику, которая ограничивает чтение только своего профиля
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем новую политику, которая разрешает чтение всех профилей
-- Это безопасно, так как мы показываем только first_name и username
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Также создаем политику для чтения своего профиля (для обратной совместимости)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
  );




-- ============================================
-- Миграция 29/53: 20251104000000_race_game_schema.sql
-- ============================================

-- ============================================
-- Race Game Database Schema
-- Based on Technical Specification
-- ============================================

-- Race sessions table
CREATE TABLE IF NOT EXISTS public.race_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID,
  difficulty TEXT,
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_ts TIMESTAMP WITH TIME ZONE,
  start_time_ms INTEGER NOT NULL DEFAULT 60000,
  end_time_ms INTEGER,
  final_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'consecutive_misses')),
  device_fingerprint TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Race questions table (track which questions were shown in session)
CREATE TABLE IF NOT EXISTS public.race_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.race_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  term_id UUID REFERENCES public.language_terms(id) ON DELETE SET NULL,
  sent_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_correct_translation BOOLEAN NOT NULL,
  translation_shown TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Race attempts table (track all answer attempts)
CREATE TABLE IF NOT EXISTS public.race_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.race_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL UNIQUE, -- Idempotency key
  chosen_bool BOOLEAN NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_ms INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  combo_count INTEGER NOT NULL DEFAULT 0,
  time_delta_ms INTEGER NOT NULL,
  server_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_ts TIMESTAMP WITH TIME ZONE,
  is_suspect BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Race results table (final results after session ends)
CREATE TABLE IF NOT EXISTS public.race_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.race_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  total_answered INTEGER NOT NULL DEFAULT 0,
  max_combo INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2),
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT CHECK (reason IN ('time_up', 'consecutive_misses', 'manual', 'connection_lost')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Anti-fraud logs table
CREATE TABLE IF NOT EXISTS public.anti_fraud_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.race_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('suspect_attempt', 'rate_limit', 'multi_account', 'pattern_anomaly', 'device_match', 'ip_match')),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'block')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_fingerprint TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_race_sessions_user_id ON public.race_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_race_sessions_session_id ON public.race_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_race_sessions_status ON public.race_sessions(status);
CREATE INDEX IF NOT EXISTS idx_race_sessions_created_at ON public.race_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_race_questions_session_id ON public.race_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_race_questions_question_id ON public.race_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_race_attempts_session_id ON public.race_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_race_attempts_attempt_id ON public.race_attempts(attempt_id);
CREATE INDEX IF NOT EXISTS idx_race_attempts_is_suspect ON public.race_attempts(is_suspect);

CREATE INDEX IF NOT EXISTS idx_race_results_session_id ON public.race_results(session_id);
CREATE INDEX IF NOT EXISTS idx_race_results_user_id ON public.race_results(user_id);
CREATE INDEX IF NOT EXISTS idx_race_results_finished_at ON public.race_results(finished_at);

CREATE INDEX IF NOT EXISTS idx_anti_fraud_logs_session_id ON public.anti_fraud_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_anti_fraud_logs_user_id ON public.anti_fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_anti_fraud_logs_event_type ON public.anti_fraud_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_anti_fraud_logs_created_at ON public.anti_fraud_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anti_fraud_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for race_sessions
CREATE POLICY "Users can view their own race sessions"
ON public.race_sessions
FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id));

CREATE POLICY "Users can insert their own race sessions"
ON public.race_sessions
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id));

-- RLS Policies for race_questions
CREATE POLICY "Users can view questions from their sessions"
ON public.race_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.race_sessions
    WHERE race_sessions.id = race_questions.session_id
    AND auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id)
  )
);

CREATE POLICY "Users can insert questions to their sessions"
ON public.race_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.race_sessions
    WHERE race_sessions.id = race_questions.session_id
    AND auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id)
  )
);

-- RLS Policies for race_attempts
CREATE POLICY "Users can view attempts from their sessions"
ON public.race_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.race_sessions
    WHERE race_sessions.id = race_attempts.session_id
    AND auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id)
  )
);

CREATE POLICY "Users can insert attempts to their sessions"
ON public.race_attempts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.race_sessions
    WHERE race_sessions.id = race_attempts.session_id
    AND auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id)
  )
);

-- RLS Policies for race_results
CREATE POLICY "Users can view their own race results"
ON public.race_results
FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_results.user_id));

CREATE POLICY "Users can insert their own race results"
ON public.race_results
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_results.user_id));

-- RLS Policies for anti_fraud_logs (admin only)
CREATE POLICY "Only admins can view anti-fraud logs"
ON public.anti_fraud_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert anti-fraud logs"
ON public.anti_fraud_logs
FOR INSERT
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_race_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for race_sessions updated_at
CREATE TRIGGER update_race_sessions_updated_at
BEFORE UPDATE ON public.race_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_race_sessions_updated_at();

-- Function to calculate accuracy and finalize race results
CREATE OR REPLACE FUNCTION public.finalize_race_session(
  p_session_id UUID,
  p_reason TEXT DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
  v_result_id UUID;
  v_total_points INTEGER;
  v_correct_count INTEGER;
  v_incorrect_count INTEGER;
  v_total_answered INTEGER;
  v_max_combo INTEGER;
  v_user_id UUID;
  v_accuracy NUMERIC;
BEGIN
  -- Get session stats
  SELECT 
    rs.user_id,
    COUNT(CASE WHEN ra.is_correct THEN 1 END)::INTEGER,
    COUNT(CASE WHEN NOT ra.is_correct THEN 1 END)::INTEGER,
    COUNT(*)::INTEGER,
    COALESCE(MAX(ra.combo_count), 0)::INTEGER,
    COALESCE(SUM(ra.points_awarded), 0)::INTEGER
  INTO
    v_user_id,
    v_correct_count,
    v_incorrect_count,
    v_total_answered,
    v_max_combo,
    v_total_points
  FROM public.race_sessions rs
  LEFT JOIN public.race_attempts ra ON ra.session_id = rs.id
  WHERE rs.id = p_session_id
  GROUP BY rs.user_id;

  -- Calculate accuracy
  IF v_total_answered > 0 THEN
    v_accuracy := ROUND((v_correct_count::NUMERIC / v_total_answered::NUMERIC) * 100, 2);
  ELSE
    v_accuracy := 0;
  END IF;

  -- Calculate rewards (XP and coins)
  -- XP: 2 per correct answer
  -- Coins: floor(total_points / 8), max 50
  DECLARE
    v_xp INTEGER := v_correct_count * 2;
    v_coins INTEGER := LEAST(FLOOR(v_total_points / 8.0), 50);
  BEGIN
    -- Insert race result
    INSERT INTO public.race_results (
      session_id,
      user_id,
      total_points,
      correct_count,
      incorrect_count,
      total_answered,
      max_combo,
      xp_awarded,
      coins_awarded,
      accuracy_percentage,
      reason
    ) VALUES (
      p_session_id,
      v_user_id,
      v_total_points,
      v_correct_count,
      v_incorrect_count,
      v_total_answered,
      v_max_combo,
      v_xp,
      v_coins,
      v_accuracy,
      p_reason
    )
    RETURNING id INTO v_result_id;

    -- Update session status
    UPDATE public.race_sessions
    SET 
      status = 'completed',
      end_ts = now(),
      end_time_ms = EXTRACT(EPOCH FROM (now() - start_ts))::INTEGER * 1000,
      final_points = v_total_points
    WHERE id = p_session_id;

    -- TODO: Award XP and coins to user profile
    -- This should be done in a separate transaction or via edge function

    RETURN v_result_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ============================================
-- Миграция 30/53: 20251104000001_fix_notification_rls_final.sql
-- ============================================

-- Финальное исправление RLS политики для уведомлений
-- Упрощаем политику для максимальной совместимости с Realtime

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функцию, если она есть (может мешать)
DROP FUNCTION IF EXISTS get_user_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id в duel_notifications
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Нужно сравнить с текущим profile_id пользователя
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
    )
  );

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;

-- Проверяем, что таблица в publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'duel_notifications';




-- ============================================
-- Миграция 31/53: 20251104000002_fix_realtime_binding_mismatch.sql
-- ============================================

-- Исправление ошибки "mismatch between server and client bindings"
-- Проблема: фильтр в клиенте (user_id=eq.${profileId}) не совпадает с RLS политикой на сервере
-- Решение: использовать RLS политику, которая работает с прямым сравнением user_id

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем старые функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем функцию для получения profile_id текущего пользователя
-- Эта функция будет использоваться в RLS политике
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Создаем политику, которая использует функцию для прямого сравнения
-- Это должно работать с фильтром user_id=eq.${profileId} на клиенте
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_current_profile_id());

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;

-- Проверяем, что таблица в publication
DO $$
DECLARE
  table_in_publication boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'duel_notifications'
  ) INTO table_in_publication;
  
  IF NOT table_in_publication THEN
    RAISE EXCEPTION 'Table duel_notifications is not in supabase_realtime publication';
  ELSE
    RAISE NOTICE 'Table duel_notifications is in supabase_realtime publication';
  END IF;
END $$;



-- ============================================
-- Миграция 32/53: 20251104000003_fix_realtime_simple_rls.sql
-- ============================================

-- Финальное исправление: упрощенная RLS политика для Realtime
-- Проблема: функции в RLS политике могут не работать с Realtime фильтрами
-- Решение: использовать простую политику без функций, которая работает напрямую

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Мы сравниваем его с текущим profile_id пользователя через подзапрос
-- Это должно работать с Realtime, так как подзапрос вычисляется на сервере
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
      LIMIT 1
    )
  );

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;




-- ============================================
-- Миграция 33/53: 20251104120000_final_notification_and_profiles_fix.sql
-- ============================================

-- ФИНАЛЬНАЯ МИГРАЦИЯ: Исправление RLS политик для уведомлений и профилей
-- Применяет все необходимые исправления для работы уведомлений и отображения имен

-- ============================================
-- 1. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- ============================================
-- Разрешить чтение профилей для участников дуэли (для отображения имен)

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
-- Это необходимо для отображения имени соперника в дуэли
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Также создаем политику для чтения своего профиля (для обратной совместимости)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
  );

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================
-- Упрощенная политика для работы с Realtime (без фильтров на клиенте)

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Используем подзапрос для получения текущего profile_id пользователя
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
      LIMIT 1
    )
  );

-- ============================================
-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

-- Убеждаемся, что realtime включен для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;

-- Проверяем, что таблица в publication
DO $$
DECLARE
  table_in_publication boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'duel_notifications'
  ) INTO table_in_publication;
  
  IF NOT table_in_publication THEN
    RAISE EXCEPTION 'Table duel_notifications is not in supabase_realtime publication';
  ELSE
    RAISE NOTICE '✅ Table duel_notifications is in supabase_realtime publication';
  END IF;
END $$;

-- ============================================
-- 4. ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================

-- Проверяем, что политики созданы
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    RAISE NOTICE '✅ Profiles policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Profiles policy not found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    RAISE NOTICE '✅ Notifications policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Notifications policy not found';
  END IF;
END $$;




-- ============================================
-- Миграция 34/53: 20251104130000_rollback_fix_rls_policies.sql
-- ============================================

-- ОТКАТ И ИСПРАВЛЕНИЕ: Восстановление работоспособности RLS политик
-- Эта миграция откатывает проблемные изменения и восстанавливает работоспособность

-- ============================================
-- 1. ВОССТАНОВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- ============================================
-- Возвращаем политику, которая разрешает чтение всех профилей (для отображения имен)

-- Удаляем все политики profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
-- Это необходимо для отображения имени соперника в дуэли
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================
-- Используем простую политику БЕЗ подзапросов для совместимости с Realtime

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику БЕЗ подзапросов
-- Это критично для работы с Realtime - подзапросы могут вызывать binding mismatch
-- Используем прямую проверку через функцию, которая возвращает profile_id
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Политика с использованием функции (без подзапроса в USING)
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- ============================================
-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

-- Убеждаемся, что realtime включен для таблицы
-- Удаляем из publication, если есть, затем добавляем
DO $$
BEGIN
  -- Пытаемся удалить из publication (если есть)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE duel_notifications;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Игнорируем ошибку, если таблицы нет в publication
  END;
  
  -- Добавляем в publication
  ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
END $$;




-- ============================================
-- Миграция 35/53: 20251104140000_fix_question_seed_bigint.sql
-- ============================================

-- ============================================
-- ИСПРАВЛЕНИЕ: Изменение типа question_seed с INTEGER на BIGINT
-- ============================================
-- Проблема: question_seed генерируется как Date.now() * 1000,
-- что дает значение больше 2 миллиардов (превышает INTEGER)
-- Решение: Изменить тип колонки на BIGINT

-- Изменяем тип колонки question_seed с INTEGER на BIGINT
ALTER TABLE public.duels 
  ALTER COLUMN question_seed TYPE BIGINT;

-- Проверяем, что изменение применено
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'duels' 
      AND column_name = 'question_seed' 
      AND data_type = 'bigint'
  ) THEN
    RAISE NOTICE '✅ Колонка question_seed успешно изменена на BIGINT';
  ELSE
    RAISE EXCEPTION '❌ Ошибка: колонка question_seed не изменена на BIGINT';
  END IF;
END $$;




-- ============================================
-- Миграция 36/53: 20251105000000_add_test_result_notification_type.sql
-- ============================================

-- Добавление типа 'test_result' для уведомлений о результатах тестов
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder', 'test_result'));



-- ============================================
-- Миграция 37/53: 20251105221723_ecc56e56-4fb5-442b-96cf-e34cffea6238.sql
-- ============================================

-- Добавление типа 'test_result' для уведомлений о результатах тестов
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder', 'test_result'));

-- ============================================
-- Миграция 38/53: 20251106084202_db892fdc-403c-47a0-a6a4-baa31489d9fa.sql
-- ============================================

-- Drop the legacy questions table with overly permissive RLS policies
-- All data has been migrated to questions_new
DROP TABLE IF EXISTS questions CASCADE;

-- Drop the legacy answer_options table (associated with old questions)
DROP TABLE IF EXISTS answer_options CASCADE;


-- ============================================
-- Миграция 39/53: 20251106085708_2e14f2ac-8eb9-47ac-9249-64a7c15191da.sql
-- ============================================

-- Create road race routes table
CREATE TABLE road_race_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  total_distance INTEGER NOT NULL DEFAULT 100,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  question_mix JSONB NOT NULL DEFAULT '{"signs": 40, "terms": 30, "questions": 30}'::jsonb,
  icon TEXT,
  gradient_from TEXT NOT NULL DEFAULT '#FF6B6B',
  gradient_to TEXT NOT NULL DEFAULT '#FFA500',
  checkpoint_interval INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create race sessions table
CREATE TABLE road_race_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES road_race_routes(id),
  total_distance INTEGER NOT NULL,
  distance_completed INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  incorrect_answers INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  max_speed INTEGER NOT NULL DEFAULT 0,
  avg_speed INTEGER NOT NULL DEFAULT 0,
  fuel_remaining INTEGER NOT NULL DEFAULT 100,
  combo_max INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  checkpoints_reached INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create leaderboard table
CREATE TABLE road_race_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES road_race_routes(id),
  score INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  avg_speed INTEGER NOT NULL,
  accuracy_percent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, route_id)
);

-- Create achievements table
CREATE TABLE road_race_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE road_race_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_race_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_race_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for routes
CREATE POLICY "Anyone can view routes"
  ON road_race_routes FOR SELECT
  USING (true);

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON road_race_sessions FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

CREATE POLICY "Users can insert their own sessions"
  ON road_race_sessions FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

CREATE POLICY "Users can update their own sessions"
  ON road_race_sessions FOR UPDATE
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

-- RLS Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON road_race_leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own leaderboard entries"
  ON road_race_leaderboard FOR ALL
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

-- RLS Policies for achievements
CREATE POLICY "Users can view their own achievements"
  ON road_race_achievements FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

CREATE POLICY "System can create achievements"
  ON road_race_achievements FOR INSERT
  WITH CHECK (true);

-- Insert default routes
INSERT INTO road_race_routes (name_ru, name_es, name_en, description_ru, description_es, description_en, total_distance, difficulty, is_premium, question_mix, gradient_from, gradient_to, icon) VALUES
  ('Маршрут Испании', 'Ruta de España', 'Spain Route', 'Проедь через всю Испанию и изучи все знаки', 'Recorre toda España y aprende todas las señales', 'Drive through Spain and learn all the signs', 100, 'medium', false, '{"signs": 40, "terms": 30, "questions": 30}'::jsonb, '#FF6B6B', '#FFA500', 'MapPin'),
  ('Путь водителя', 'Camino del Conductor', 'Driver''s Path', 'Полный курс подготовки к экзамену', 'Curso completo de preparación para el examen', 'Complete exam preparation course', 150, 'hard', false, '{"signs": 30, "terms": 30, "questions": 40}'::jsonb, '#9B5CFF', '#FF6B9D', 'Car'),
  ('Знаковый марафон', 'Maratón de Señales', 'Sign Marathon', 'Специализация на дорожных знаках', 'Especialización en señales de tráfico', 'Specialization in road signs', 80, 'easy', false, '{"signs": 70, "terms": 20, "questions": 10}'::jsonb, '#00BFFF', '#39FF14', 'Shield'),
  ('Экспресс-подготовка', 'Preparación Exprés', 'Express Prep', 'Интенсивный курс для премиум пользователей', 'Curso intensivo para usuarios premium', 'Intensive course for premium users', 200, 'hard', true, '{"signs": 35, "terms": 35, "questions": 30}'::jsonb, '#FFD700', '#FF1493', 'Zap');

-- ============================================
-- Миграция 40/53: 20251106090745_fa7a02b1-cb5e-49d6-bb99-3d95ae07f38d.sql
-- ============================================

-- Create answer_options table for questions_new
CREATE TABLE IF NOT EXISTS public.answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions_new(id) ON DELETE CASCADE,
  text_ru TEXT NOT NULL,
  text_es TEXT NOT NULL,
  text_en TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing answer options
CREATE POLICY "Anyone can view answer options"
  ON public.answer_options
  FOR SELECT
  USING (true);

-- Create policy for admins to manage answer options
CREATE POLICY "Admins can manage answer options"
  ON public.answer_options
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id 
  ON public.answer_options(question_id);

CREATE INDEX IF NOT EXISTS idx_answer_options_position 
  ON public.answer_options(question_id, position);

-- ============================================
-- Миграция 41/53: 20251106170000_add_source_id_to_questions.sql
-- ============================================

-- Add source_id column to questions_new table for Google Sheets synchronization
-- This allows upsert operations based on source_id from Google Sheets

ALTER TABLE public.questions_new
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Create unique index on source_id to enable upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_new_source_id 
ON public.questions_new(source_id) 
WHERE source_id IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.questions_new.source_id IS 'Unique identifier from Google Sheets (e.g., GS-1, GS-2) for synchronization';



-- ============================================
-- Миграция 42/53: 20251107000000_update_topics_for_learning_map.sql
-- ============================================

-- ========================================
-- Migration: Update topics table for learning map
-- ========================================
-- Add fields for learning map functionality:
-- - unlock_condition: JSONB for unlock conditions
-- - description: TEXT for topic description
-- - order_index: INTEGER (alias for number, for consistency)

-- Add description field
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add unlock_condition field (JSONB)
-- Structure: { "required_topics": [1, 2], "min_score": 80, "skip_test_id": "uuid" }
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS unlock_condition JSONB DEFAULT '{"required_topics": [], "min_score": 0}'::jsonb;

-- Add order_index as alias for number (for consistency with subtopics)
-- We'll keep number for backward compatibility, but add order_index
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Populate order_index from number for existing records
UPDATE public.topics
SET order_index = number
WHERE order_index IS NULL;

-- Make order_index NOT NULL after populating
ALTER TABLE public.topics
ALTER COLUMN order_index SET NOT NULL;

-- Create index on order_index for faster sorting
CREATE INDEX IF NOT EXISTS idx_topics_order_index ON public.topics(order_index);

-- Add comment for documentation
COMMENT ON COLUMN public.topics.unlock_condition IS 'JSON object with unlock conditions: required_topics (array of topic numbers), min_score (integer), skip_test_id (UUID)';
COMMENT ON COLUMN public.topics.order_index IS 'Order of topic in learning map (same as number for backward compatibility)';



-- ============================================
-- Миграция 43/53: 20251107000001_create_subtopics.sql
-- ============================================

-- ========================================
-- Migration: Create subtopics table
-- ========================================
-- Subtopics represent individual learning units within a topic
-- Types: 'material', 'test', 'terms'

-- Create enum for subtopic types
CREATE TYPE public.subtopic_type AS ENUM ('material', 'test', 'terms');

-- Create subtopics table
CREATE TABLE IF NOT EXISTS public.subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  type public.subtopic_type NOT NULL,
  content_id UUID, -- Reference to material, test, or terms collection
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topic_id, order_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON public.subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_order_index ON public.subtopics(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subtopics_type ON public.subtopics(type);

-- Enable RLS
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view subtopics"
  ON public.subtopics
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert subtopics"
  ON public.subtopics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subtopics"
  ON public.subtopics
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete subtopics"
  ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_subtopics_updated_at
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.subtopics IS 'Subtopics represent individual learning units within a topic (materials, tests, or terms)';
COMMENT ON COLUMN public.subtopics.type IS 'Type of subtopic: material (learning content), test (quiz), or terms (vocabulary)';
COMMENT ON COLUMN public.subtopics.content_id IS 'Reference to specific content: material ID, test ID, or NULL for terms (filtered by topic_id)';
COMMENT ON COLUMN public.subtopics.is_required IS 'Whether this subtopic must be completed to finish the parent topic';



-- ============================================
-- Миграция 44/53: 20251107000002_create_materials.sql
-- ============================================

-- ========================================
-- Migration: Create materials table
-- ========================================
-- Materials store learning content (HTML/Markdown) converted from PDFs

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ru TEXT NOT NULL, -- HTML/Markdown content
  content_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  source_pdf TEXT, -- Optional: link to original PDF file
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs: ["url1", "url2"]
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id ON public.materials(subtopic_id);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view materials"
  ON public.materials
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert materials"
  ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete materials"
  ON public.materials
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.materials IS 'Learning materials (HTML/Markdown content) converted from PDFs';
COMMENT ON COLUMN public.materials.content_ru IS 'HTML or Markdown content in Russian';
COMMENT ON COLUMN public.materials.images IS 'JSON array of image URLs extracted from PDF';
COMMENT ON COLUMN public.materials.source_pdf IS 'Optional link to original PDF file for reference';



-- ============================================
-- Миграция 45/53: 20251107000003_create_topic_tests.sql
-- ============================================

-- ========================================
-- Migration: Create topic_tests table
-- ========================================
-- Tests for topics and subtopics, including skip tests

CREATE TABLE IF NOT EXISTS public.topic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE, -- Nullable: can be topic-level test
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  min_pass_percent INTEGER NOT NULL DEFAULT 80, -- Minimum score to pass (0-100)
  is_skip_test BOOLEAN NOT NULL DEFAULT FALSE, -- If true, this test allows skipping previous topics
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure skip tests are topic-level only
  CONSTRAINT skip_test_must_be_topic_level CHECK (
    (is_skip_test = FALSE) OR (subtopic_id IS NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_tests_topic_id ON public.topic_tests(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_subtopic_id ON public.topic_tests(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_skip_test ON public.topic_tests(is_skip_test);

-- Enable RLS
ALTER TABLE public.topic_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view topic tests"
  ON public.topic_tests
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert topic tests"
  ON public.topic_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update topic tests"
  ON public.topic_tests
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete topic tests"
  ON public.topic_tests
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_topic_tests_updated_at
  BEFORE UPDATE ON public.topic_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.topic_tests IS 'Tests for topics and subtopics, including skip tests for unlocking topics';
COMMENT ON COLUMN public.topic_tests.is_skip_test IS 'If true, passing this test allows skipping required topics';
COMMENT ON COLUMN public.topic_tests.min_pass_percent IS 'Minimum percentage score (0-100) required to pass the test';



-- ============================================
-- Миграция 46/53: 20251107000004_create_user_topic_progress.sql
-- ============================================

-- ========================================
-- Migration: Create user_topic_progress table
-- ========================================
-- Tracks user progress through topics and subtopics

CREATE TABLE IF NOT EXISTS public.user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE, -- Nullable: can track topic-level progress
  score INTEGER DEFAULT 0, -- Score achieved (0-100)
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure unique progress per user per subtopic (or topic if subtopic is null)
  UNIQUE(user_id, subtopic_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_id ON public.user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_topic_id ON public.user_topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_subtopic_id ON public.user_topic_progress(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_completed ON public.user_topic_progress(user_id, completed);

-- Enable RLS
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own topic progress"
  ON public.user_topic_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can insert their own topic progress"
  ON public.user_topic_progress
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can update their own topic progress"
  ON public.user_topic_progress
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can delete their own topic progress"
  ON public.user_topic_progress
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_user_topic_progress_updated_at
  BEFORE UPDATE ON public.user_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.user_topic_progress IS 'Tracks user progress through topics and subtopics';
COMMENT ON COLUMN public.user_topic_progress.score IS 'Score achieved (0-100) for the subtopic or topic';
COMMENT ON COLUMN public.user_topic_progress.completed IS 'Whether the subtopic/topic has been completed';



-- ============================================
-- Миграция 47/53: 20251107000005_update_language_terms.sql
-- ============================================

-- ========================================
-- Migration: Update language_terms table
-- ========================================
-- Add topic_id to link terms with topics

-- Add topic_id column
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_language_terms_topic_id ON public.language_terms(topic_id);

-- Add comment for documentation
COMMENT ON COLUMN public.language_terms.topic_id IS 'Optional link to topic for organizing terms by learning path';



-- ============================================
-- Миграция 48/53: 20251107100112_dabf4f52-64d6-49a4-a7a3-a015cc93cdc0.sql
-- ============================================

-- ========================================
-- Migration: Learning Map System
-- ========================================
-- This migration creates the complete learning map system including:
-- 1. source_id for questions_new (Google Sheets sync)
-- 2. topics table enhancements (descriptions, unlock conditions, order_index)
-- 3. subtopics table (learning units within topics)
-- 4. materials table (learning content)
-- 5. topic_tests table (tests for topics/subtopics)
-- 6. user_topic_progress table (progress tracking)
-- 7. material_versions table (version history)
-- 8. editor role support

-- ========================================
-- 1. Add source_id to questions_new table
-- ========================================
ALTER TABLE public.questions_new
ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_new_source_id 
ON public.questions_new(source_id) 
WHERE source_id IS NOT NULL;

COMMENT ON COLUMN public.questions_new.source_id IS 'Unique identifier from Google Sheets (e.g., GS-1, GS-2) for synchronization';

-- ========================================
-- 2. Update topics table for learning map
-- ========================================
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS unlock_condition JSONB DEFAULT '{"required_topics": [], "min_score": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS order_index INTEGER;

UPDATE public.topics
SET order_index = number
WHERE order_index IS NULL;

ALTER TABLE public.topics
ALTER COLUMN order_index SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_order_index ON public.topics(order_index);

COMMENT ON COLUMN public.topics.unlock_condition IS 'JSON object with unlock conditions: required_topics (array of topic numbers), min_score (integer), skip_test_id (UUID)';
COMMENT ON COLUMN public.topics.order_index IS 'Order of topic in learning map (same as number for backward compatibility)';

-- ========================================
-- 3. Create subtopics table
-- ========================================
DO $$ BEGIN
  CREATE TYPE public.subtopic_type AS ENUM ('material', 'test', 'terms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  type public.subtopic_type NOT NULL,
  content_id UUID,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topic_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON public.subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_order_index ON public.subtopics(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subtopics_type ON public.subtopics(type);

ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subtopics" ON public.subtopics;
CREATE POLICY "Anyone can view subtopics"
  ON public.subtopics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert subtopics" ON public.subtopics;
CREATE POLICY "Admins and editors can insert subtopics"
  ON public.subtopics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and editors can update subtopics" ON public.subtopics;
CREATE POLICY "Admins and editors can update subtopics"
  ON public.subtopics FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete subtopics" ON public.subtopics;
CREATE POLICY "Admins can delete subtopics"
  ON public.subtopics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_subtopics_updated_at ON public.subtopics;
CREATE TRIGGER update_subtopics_updated_at
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.subtopics IS 'Subtopics represent individual learning units within a topic (materials, tests, or terms)';

-- ========================================
-- 4. Create materials table
-- ========================================
DO $$ BEGIN
  CREATE TYPE public.material_type AS ENUM ('theory', 'test', 'terms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ru TEXT NOT NULL,
  content_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content JSONB,
  html_preview TEXT,
  type public.material_type DEFAULT 'theory',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_pdf TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id ON public.materials(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_is_published ON public.materials(is_published);
CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON public.materials(updated_by);
CREATE INDEX IF NOT EXISTS idx_materials_version ON public.materials(version);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
CREATE POLICY "Anyone can view materials"
  ON public.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert materials" ON public.materials;
CREATE POLICY "Admins and editors can insert materials"
  ON public.materials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and editors can update materials" ON public.materials;
CREATE POLICY "Admins and editors can update materials"
  ON public.materials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials"
  ON public.materials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.materials IS 'Learning materials (HTML/Markdown content) converted from PDFs';

-- ========================================
-- 5. Create topic_tests table
-- ========================================
CREATE TABLE IF NOT EXISTS public.topic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE,
  title_ru TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  min_pass_percent INTEGER NOT NULL DEFAULT 80,
  is_skip_test BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT skip_test_must_be_topic_level CHECK (
    (is_skip_test = FALSE) OR (subtopic_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_topic_tests_topic_id ON public.topic_tests(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_subtopic_id ON public.topic_tests(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tests_skip_test ON public.topic_tests(is_skip_test);

ALTER TABLE public.topic_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view topic tests" ON public.topic_tests;
CREATE POLICY "Anyone can view topic tests"
  ON public.topic_tests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can insert topic tests"
  ON public.topic_tests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can update topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can update topic tests"
  ON public.topic_tests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete topic tests" ON public.topic_tests;
CREATE POLICY "Authenticated users can delete topic tests"
  ON public.topic_tests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_topic_tests_updated_at ON public.topic_tests;
CREATE TRIGGER update_topic_tests_updated_at
  BEFORE UPDATE ON public.topic_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.topic_tests IS 'Tests for topics and subtopics, including skip tests for unlocking topics';

-- ========================================
-- 6. Create user_topic_progress table
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subtopic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_id ON public.user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_topic_id ON public.user_topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_subtopic_id ON public.user_topic_progress(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_completed ON public.user_topic_progress(user_id, completed);

ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can view their own topic progress"
  ON public.user_topic_progress FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can insert their own topic progress"
  ON public.user_topic_progress FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can update their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can update their own topic progress"
  ON public.user_topic_progress FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can delete their own topic progress" ON public.user_topic_progress;
CREATE POLICY "Users can delete their own topic progress"
  ON public.user_topic_progress FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP TRIGGER IF EXISTS update_user_topic_progress_updated_at ON public.user_topic_progress;
CREATE TRIGGER update_user_topic_progress_updated_at
  BEFORE UPDATE ON public.user_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_topic_progress IS 'Tracks user progress through topics and subtopics';

-- ========================================
-- 7. Update language_terms table
-- ========================================
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_language_terms_topic_id ON public.language_terms(topic_id);

COMMENT ON COLUMN public.language_terms.topic_id IS 'Optional link to topic for organizing terms by learning path';

-- ========================================
-- 8. Create material_versions table
-- ========================================
CREATE TABLE IF NOT EXISTS public.material_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  html_preview TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_versions_material_id ON public.material_versions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_versions_version ON public.material_versions(material_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_material_versions_updated_by ON public.material_versions(updated_by);

ALTER TABLE public.material_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view material versions" ON public.material_versions;
CREATE POLICY "Anyone can view material versions"
  ON public.material_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert material versions" ON public.material_versions;
CREATE POLICY "Admins and editors can insert material versions"
  ON public.material_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete material versions" ON public.material_versions;
CREATE POLICY "Admins can delete material versions"
  ON public.material_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.material_versions IS 'Version history for materials (stores last 3 versions)';

-- ============================================
-- Миграция 49/53: 20251108000000_update_materials_for_editor.sql
-- ============================================

-- ========================================
-- Migration: Update materials table for visual editor
-- ========================================
-- Add fields for TipTap editor: content (JSONB), html_preview (TEXT), type (ENUM), is_published (BOOLEAN), version (INTEGER), updated_by (UUID)

-- Create enum for material types (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_type') THEN
    CREATE TYPE public.material_type AS ENUM ('theory', 'test', 'terms');
  END IF;
END $$;

-- Add new columns to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS content JSONB, -- JSON TipTap content
ADD COLUMN IF NOT EXISTS html_preview TEXT, -- HTML version for preview
ADD COLUMN IF NOT EXISTS type public.material_type DEFAULT 'theory', -- Type of material
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE, -- Draft/published status
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1, -- Content version
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL; -- Editor ID

-- Migrate existing content_ru to content JSONB (if exists)
-- Convert HTML/Markdown to TipTap JSON format
-- For now, we'll keep content_ru as is and populate content later
UPDATE public.materials
SET content = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', COALESCE(content_ru, ''))
      )
    )
  )
)
WHERE content IS NULL AND content_ru IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_is_published ON public.materials(is_published);
CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON public.materials(updated_by);
CREATE INDEX IF NOT EXISTS idx_materials_version ON public.materials(version);

-- Update RLS policies for editors
-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can update materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can delete materials" ON public.materials;

-- Create new policies for admins and editors
CREATE POLICY "Admins and editors can insert materials"
  ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins and editors can update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete materials
CREATE POLICY "Admins can delete materials"
  ON public.materials
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comments for documentation
COMMENT ON COLUMN public.materials.content IS 'TipTap JSON content';
COMMENT ON COLUMN public.materials.html_preview IS 'HTML version for preview';
COMMENT ON COLUMN public.materials.type IS 'Type of material: theory, test, or terms';
COMMENT ON COLUMN public.materials.is_published IS 'Whether material is published (true) or draft (false)';
COMMENT ON COLUMN public.materials.version IS 'Content version number';
COMMENT ON COLUMN public.materials.updated_by IS 'ID of user who last updated the material';



-- ============================================
-- Миграция 50/53: 20251108000001_create_material_versions.sql
-- ============================================

-- ========================================
-- Migration: Create material_versions table
-- ========================================
-- Stores version history for materials (last 3 versions)

CREATE TABLE IF NOT EXISTS public.material_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- JSON TipTap content
  html_preview TEXT NOT NULL, -- HTML version
  version INTEGER NOT NULL, -- Version number
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Editor ID
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_versions_material_id ON public.material_versions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_versions_version ON public.material_versions(material_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_material_versions_updated_by ON public.material_versions(updated_by);

-- Enable RLS
ALTER TABLE public.material_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view material versions"
  ON public.material_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and editors can insert material versions"
  ON public.material_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete versions (for cleanup)
CREATE POLICY "Admins can delete material versions"
  ON public.material_versions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON TABLE public.material_versions IS 'Version history for materials (stores last 3 versions)';
COMMENT ON COLUMN public.material_versions.content IS 'TipTap JSON content at this version';
COMMENT ON COLUMN public.material_versions.html_preview IS 'HTML preview at this version';
COMMENT ON COLUMN public.material_versions.version IS 'Version number';



-- ============================================
-- Миграция 51/53: 20251108000002_add_editor_role.sql
-- ============================================

-- ========================================
-- Migration: Add editor role to app_role enum
-- ========================================
-- Add 'editor' role to existing app_role enum

-- Add 'editor' to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'app_role' 
    AND EXISTS (
      SELECT 1 FROM pg_enum WHERE enumlabel = 'editor' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'app_role'
      )
    )
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TYPE public.app_role IS 'User roles: admin (full access), editor (can edit but not delete), user (read-only)';



-- ============================================
-- Миграция 52/53: 20251108000003_setup_storage.sql
-- ============================================

-- ========================================
-- Migration: Setup Supabase Storage for materials
-- ========================================
-- Create storage bucket for materials images
-- Note: This migration creates the bucket structure, but actual bucket creation
-- should be done through Supabase Dashboard or Storage API

-- Create a function to check if storage bucket exists
CREATE OR REPLACE FUNCTION public.storage_bucket_exists(bucket_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = bucket_name
  );
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.storage_bucket_exists IS 'Check if a storage bucket exists';

-- Note: Actual bucket creation should be done via:
-- 1. Supabase Dashboard: Storage > Create bucket > name: 'materials'
-- 2. Or via Storage API in application code
-- 3. Bucket should be public for reading images, but only admins/editors can upload

-- Storage policies should be set via Supabase Dashboard:
-- - Public read access for bucket 'materials'
-- - Upload access only for authenticated users with admin/editor role
-- - Path: /materials/images/{material_id}/{filename}



-- ============================================
-- Миграция 53/53: 20251108000004_update_rls_for_editors.sql
-- ============================================

-- ========================================
-- Migration: Update RLS policies for editors
-- ========================================
-- Editors can edit materials but not delete them
-- Only admins can delete materials

-- Update subtopics policies
DROP POLICY IF EXISTS "Authenticated users can insert subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Authenticated users can update subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Authenticated users can delete subtopics" ON public.subtopics;

CREATE POLICY "Admins and editors can insert subtopics"
  ON public.subtopics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins and editors can update subtopics"
  ON public.subtopics
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete subtopics
CREATE POLICY "Admins can delete subtopics"
  ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update topics policies (if not already updated)
DROP POLICY IF EXISTS "Authenticated users can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can update topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can delete topics" ON public.topics;

-- Check if admin policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Admins can manage topics'
  ) THEN
    CREATE POLICY "Admins can manage topics"
      ON public.topics
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Update materials policies (if not already updated in 20251108000000)
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins and editors can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admins and editors can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;

-- Recreate with editor support
CREATE POLICY "Admins and editors can insert materials"
  ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins and editors can update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Only admins can delete materials
CREATE POLICY "Admins can delete materials"
  ON public.materials
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON POLICY "Admins and editors can insert subtopics" ON public.subtopics IS 'Editors can create subtopics';
COMMENT ON POLICY "Admins and editors can update subtopics" ON public.subtopics IS 'Editors can update subtopics';
COMMENT ON POLICY "Admins can delete subtopics" ON public.subtopics IS 'Only admins can delete subtopics';
COMMENT ON POLICY "Admins and editors can insert materials" ON public.materials IS 'Editors can create materials';
COMMENT ON POLICY "Admins and editors can update materials" ON public.materials IS 'Editors can update materials';
COMMENT ON POLICY "Admins can delete materials" ON public.materials IS 'Only admins can delete materials';



