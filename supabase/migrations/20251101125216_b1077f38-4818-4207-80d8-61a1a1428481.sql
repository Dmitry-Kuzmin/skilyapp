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
CREATE INDEX idx_duel_answers_duel_id ON public.duel_answers(duel_id);

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
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_answers;

-- Trigger for updated_at
CREATE TRIGGER update_duel_stats_updated_at
BEFORE UPDATE ON public.duel_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_duel_limits_updated_at
BEFORE UPDATE ON public.daily_duel_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();