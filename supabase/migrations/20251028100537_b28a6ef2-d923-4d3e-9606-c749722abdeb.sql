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