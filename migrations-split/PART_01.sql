-- ============================================
-- Безопасные миграции для Supabase
-- Часть 1
-- ============================================

-- Миграция 1/53: 20251025190138_853a08b0-ea77-4dc3-a778-d1c9551865e5.sql
-- ============================================

-- Create terms table for storing test data
CREATE TABLE IF NOT EXISTS public.terms (
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
DROP POLICY IF EXISTS "Anyone can view terms" ON public.terms;
CREATE POLICY "Anyone can view terms" ON public.terms 
FOR SELECT 
USING (true);

-- Only authenticated admins can insert/update/delete terms
-- For now, we'll allow all authenticated users to manage terms
-- You can modify this later to check for admin role
DROP POLICY IF EXISTS "Authenticated users can insert terms" ON public.terms;
CREATE POLICY "Authenticated users can insert terms" ON public.terms 
FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update terms" ON public.terms;
CREATE POLICY "Authenticated users can update terms" ON public.terms 
FOR UPDATE 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete terms" ON public.terms;
CREATE POLICY "Authenticated users can delete terms" ON public.terms 
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
DROP TRIGGER IF EXISTS update_terms_updated_at ON public.language_terms;
CREATE TRIGGER update_terms_updated_at
BEFORE UPDATE ON public.terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create game_sessions table to track game history
CREATE TABLE IF NOT EXISTS public.game_sessions (
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
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.game_sessions;
CREATE POLICY "Users can view their own sessions" ON public.game_sessions 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can insert their own game sessions
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.game_sessions;
CREATE POLICY "Users can insert their own sessions" ON public.game_sessions 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Миграция 2/53: 20251026075231_e3f57da0-3c46-4c81-acdd-220644d9d330.sql
-- ============================================

-- Drop old terms table and create new questions table
DROP TABLE IF EXISTS terms;

-- Create questions table with proper structure
CREATE TABLE IF NOT EXISTS public.questions (
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
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Anyone can view questions" ON public.questions 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;
CREATE POLICY "Authenticated users can insert questions" ON public.questions 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update questions" ON public.questions;
CREATE POLICY "Authenticated users can update questions" ON public.questions 
FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete questions" ON public.questions;
CREATE POLICY "Authenticated users can delete questions" ON public.questions 
FOR DELETE 
USING (true);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
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
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
CREATE POLICY "Users can view their own achievements" ON public.achievements 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.achievements;
CREATE POLICY "Users can insert their own achievements" ON public.achievements 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own achievements" ON public.achievements;
CREATE POLICY "Users can update their own achievements" ON public.achievements 
FOR UPDATE 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Add trigger for questions updated_at
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
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

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Миграция 4/53: 20251026093855_aef0b50f-4926-413c-ac35-e69332e92604.sql
-- ============================================

-- Fix function search path security issue
ALTER FUNCTION update_updated_at_column() SET search_path = public;

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
DROP POLICY IF EXISTS "Anyone can view road signs" ON public.road_signs;
CREATE POLICY "Anyone can view road signs" ON public.road_signs
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert road signs" ON public.road_signs;
CREATE POLICY "Authenticated users can insert road signs" ON public.road_signs
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update road signs" ON public.road_signs;
CREATE POLICY "Authenticated users can update road signs" ON public.road_signs
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete road signs" ON public.road_signs;
CREATE POLICY "Authenticated users can delete road signs" ON public.road_signs
FOR DELETE
USING (true);

-- Create policies for language_terms (public read access)
DROP POLICY IF EXISTS "Anyone can view language terms" ON public.language_terms;
CREATE POLICY "Anyone can view language terms" ON public.language_terms
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert language terms" ON public.language_terms;
CREATE POLICY "Authenticated users can insert language terms" ON public.language_terms
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update language terms" ON public.language_terms;
CREATE POLICY "Authenticated users can update language terms" ON public.language_terms
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete language terms" ON public.language_terms;
CREATE POLICY "Authenticated users can delete language terms" ON public.language_terms
FOR DELETE
USING (true);

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

-- Миграция 9/53: 20251027170051_2f973c01-c80f-44b4-ba2f-400a9baf8a22.sql
-- ============================================

-- Таблица для прогресса пользователя по испанским терминам
CREATE TABLE IF NOT EXISTS public.user_term_progress (
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
CREATE TABLE IF NOT EXISTS public.user_sign_progress (
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
CREATE TABLE IF NOT EXISTS public.daily_tasks (
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
DROP POLICY IF EXISTS "Users can view their own term progress" ON public.user_term_progress;
CREATE POLICY "Users can view their own term progress" ON public.user_term_progress FOR SELECT
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

DROP POLICY IF EXISTS "Users can insert their own term progress" ON public.user_term_progress;
CREATE POLICY "Users can insert their own term progress" ON public.user_term_progress FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

DROP POLICY IF EXISTS "Users can update their own term progress" ON public.user_term_progress;
CREATE POLICY "Users can update their own term progress" ON public.user_term_progress FOR UPDATE
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

-- RLS Policies для user_sign_progress
DROP POLICY IF EXISTS "Users can view their own sign progress" ON public.user_sign_progress;
CREATE POLICY "Users can view their own sign progress" ON public.user_sign_progress FOR SELECT
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

DROP POLICY IF EXISTS "Users can insert their own sign progress" ON public.user_sign_progress;
CREATE POLICY "Users can insert their own sign progress" ON public.user_sign_progress FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

DROP POLICY IF EXISTS "Users can update their own sign progress" ON public.user_sign_progress;
CREATE POLICY "Users can update their own sign progress" ON public.user_sign_progress FOR UPDATE
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

-- RLS Policies для daily_tasks
DROP POLICY IF EXISTS "Users can view their own daily tasks" ON public.daily_tasks;
CREATE POLICY "Users can view their own daily tasks" ON public.daily_tasks FOR SELECT
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

DROP POLICY IF EXISTS "Users can insert their own daily tasks" ON public.daily_tasks;
CREATE POLICY "Users can insert their own daily tasks" ON public.daily_tasks FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

DROP POLICY IF EXISTS "Users can update their own daily tasks" ON public.daily_tasks;
CREATE POLICY "Users can update their own daily tasks" ON public.daily_tasks FOR UPDATE
USING (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
));

-- Триггеры для обновления updated_at
DROP TRIGGER IF EXISTS update_user_term_progress_updated_at ON public.user_term_progress;
CREATE TRIGGER update_user_term_progress_updated_at
BEFORE UPDATE ON public.user_term_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sign_progress_updated_at ON public.user_sign_progress;
CREATE TRIGGER update_user_sign_progress_updated_at
BEFORE UPDATE ON public.user_sign_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_tasks_updated_at ON public.daily_tasks;
CREATE TRIGGER update_daily_tasks_updated_at
BEFORE UPDATE ON public.daily_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Миграция 10/53: 20251028100537_b28a6ef2-d923-4d3e-9606-c749722abdeb.sql
-- ============================================

-- Create daily_bonus_def table (predefined daily rewards)
CREATE TABLE IF NOT EXISTS public.daily_bonus_def (
  day_number INTEGER PRIMARY KEY,
  reward JSONB NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_daily_bonus table (user streak tracking)
CREATE TABLE IF NOT EXISTS public.user_daily_bonus (
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
DROP POLICY IF EXISTS "Anyone can view daily bonus definitions" ON public.daily_bonus_def;
CREATE POLICY "Anyone can view daily bonus definitions" ON public.daily_bonus_def
  FOR SELECT
  USING (true);

-- RLS Policies for user_daily_bonus
DROP POLICY IF EXISTS "Users can view their own daily bonus" ON public.user_daily_bonus;
CREATE POLICY "Users can view their own daily bonus" ON public.user_daily_bonus
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can insert their own daily bonus" ON public.user_daily_bonus;
CREATE POLICY "Users can insert their own daily bonus" ON public.user_daily_bonus
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

DROP POLICY IF EXISTS "Users can update their own daily bonus" ON public.user_daily_bonus;
CREATE POLICY "Users can update their own daily bonus" ON public.user_daily_bonus
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_daily_bonus_updated_at ON public.user_daily_bonus;
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
  (7, '{"xp": 50, "coins": 25, "badge": "weekly_hero"}'::jsonb, '🏆 Недельный герой! Особая награда')
ON CONFLICT (day_number) DO NOTHING;

