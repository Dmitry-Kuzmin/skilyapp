-- ============================================
-- Безопасные миграции для Supabase
-- Часть 3
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
CREATE INDEX IF NOT EXISTS idx_duel_notifications_user_id ON duel_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_duel_notifications_duel_id ON duel_notifications(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_notifications_created_at ON duel_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duel_notifications_is_read ON duel_notifications(is_read) WHERE is_read = false;

-- RLS политики
ALTER TABLE duel_notifications ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои уведомления
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Система может создавать уведомления
DROP POLICY IF EXISTS "System can create notifications" ON duel_notifications;
CREATE POLICY "System can create notifications" ON duel_notifications
  FOR INSERT
  WITH CHECK (true);

-- Пользователи могут обновлять свои уведомления (пометить как прочитанные)
DROP POLICY IF EXISTS "Users can update their own notifications" ON duel_notifications;
CREATE POLICY "Users can update their own notifications" ON duel_notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Включаем realtime для таблицы уведомлений
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

-- Миграция 24/53: 20251102205805_25e7ccf5-265d-4bdc-8853-d7a4487571f4.sql
-- ============================================

-- Create avatars bucket for user profile photos
-- Ensure unique constraint exists on storage.buckets.id (should be PRIMARY KEY, but check anyway)
-- Note: storage.buckets.id is PRIMARY KEY by default, so ON CONFLICT should work
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  3145728, -- 3MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
CREATE POLICY "Users can view all avatars" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

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
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
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



-- Миграция 26/53: 20251103232650_add_reminder_notification_type.sql
-- ============================================

-- Добавление типа 'reminder' для уведомлений
-- Обновление CHECK constraint для поддержки нового типа уведомлений

ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder'));



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



-- Миграция 28/53: 20251104000000_allow_profiles_read_for_duels.sql
-- ============================================

-- Разрешить чтение профилей для участников дуэли
-- Это необходимо для отображения имени соперника в игре

-- Удаляем старую политику, которая ограничивает чтение только своего профиля
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем новую политику, которая разрешает чтение всех профилей
-- Это безопасно, так как мы показываем только first_name и username
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT
  USING (true);

-- Также создаем политику для чтения своего профиля (для обратной совместимости)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
  );




-- Миграция 29/53: 20251104000000_race_game_schema.sql
-- ============================================

-- Race Game Database Schema
-- Based on Technical Specification

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
CREATE POLICY "Users can view their own race sessions" ON public.race_sessions
FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id));

DROP POLICY IF EXISTS "Users can insert their own race sessions" ON public.race_sessions;
CREATE POLICY "Users can insert their own race sessions" ON public.race_sessions
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id));

-- RLS Policies for race_questions
DROP POLICY IF EXISTS "Users can view questions from their sessions" ON public.race_questions;
CREATE POLICY "Users can view questions from their sessions" ON public.race_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.race_sessions
    WHERE race_sessions.id = race_questions.session_id
    AND auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id)
  )
);

DROP POLICY IF EXISTS "Users can insert questions to their sessions" ON public.race_questions;
CREATE POLICY "Users can insert questions to their sessions" ON public.race_questions
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
CREATE POLICY "Users can view attempts from their sessions" ON public.race_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.race_sessions
    WHERE race_sessions.id = race_attempts.session_id
    AND auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_sessions.user_id)
  )
);

DROP POLICY IF EXISTS "Users can insert attempts to their sessions" ON public.race_attempts;
CREATE POLICY "Users can insert attempts to their sessions" ON public.race_attempts
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
CREATE POLICY "Users can view their own race results" ON public.race_results
FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_results.user_id));

DROP POLICY IF EXISTS "Users can insert their own race results" ON public.race_results;
CREATE POLICY "Users can insert their own race results" ON public.race_results
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = race_results.user_id));

-- RLS Policies for anti_fraud_logs (admin only)
DROP POLICY IF EXISTS "Only admins can view anti-fraud logs" ON public.anti_fraud_logs;
CREATE POLICY "Only admins can view anti-fraud logs" ON public.anti_fraud_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert anti-fraud logs" ON public.anti_fraud_logs;
CREATE POLICY "System can insert anti-fraud logs" ON public.anti_fraud_logs
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
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
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




