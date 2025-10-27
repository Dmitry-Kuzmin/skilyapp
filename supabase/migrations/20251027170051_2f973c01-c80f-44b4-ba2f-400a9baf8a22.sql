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