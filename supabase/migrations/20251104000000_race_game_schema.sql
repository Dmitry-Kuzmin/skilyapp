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
DROP POLICY IF EXISTS "Users can view their own race sessions" ON public.race_sessions;
CREATE POLICY "Users can view their own race sessions"
ON public.race_sessions
FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id));

DROP POLICY IF EXISTS "Users can insert their own race sessions" ON public.race_sessions;
CREATE POLICY "Users can insert their own race sessions"
ON public.race_sessions
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id));

-- RLS Policies for race_questions
DROP POLICY IF EXISTS "Users can view questions from their sessions" ON public.race_questions;
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

DROP POLICY IF EXISTS "Users can insert questions to their sessions" ON public.race_questions;
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
DROP POLICY IF EXISTS "Users can view attempts from their sessions" ON public.race_attempts;
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

DROP POLICY IF EXISTS "Users can insert attempts to their sessions" ON public.race_attempts;
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
DROP POLICY IF EXISTS "Users can view their own race results" ON public.race_results;
CREATE POLICY "Users can view their own race results"
ON public.race_results
FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_results.user_id));

DROP POLICY IF EXISTS "Users can insert their own race results" ON public.race_results;
CREATE POLICY "Users can insert their own race results"
ON public.race_results
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_results.user_id));

-- RLS Policies for anti_fraud_logs (admin only)
DROP POLICY IF EXISTS "Only admins can view anti-fraud logs" ON public.anti_fraud_logs;
CREATE POLICY "Only admins can view anti-fraud logs"
ON public.anti_fraud_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert anti-fraud logs" ON public.anti_fraud_logs;
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
DROP TRIGGER IF EXISTS update_race_sessions_updated_at ON public.race_sessions;
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

