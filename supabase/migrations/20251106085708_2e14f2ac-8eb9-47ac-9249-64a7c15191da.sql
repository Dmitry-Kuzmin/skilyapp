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