-- ============================================
-- Таблица для хранения начала тестовых сессий
-- Используется для валидации времени прохождения теста
-- ============================================

CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL, -- Связь с test_results.session_id
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  
  -- Параметры теста
  questions_count INTEGER NOT NULL CHECK (questions_count > 0),
  mode TEXT, -- 'practice', 'exam', 'blitz', 'mastery', 'sequential', 'module', 'challenge-bank', 'dgt'
  
  -- Время (КРИТИЧНО: серверное время UTC)
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  
  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_test_sessions_session_id ON test_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_started_at ON test_sessions(started_at);

-- RLS
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Политики: пользователи видят только свои сессии
CREATE POLICY "Users can view own test sessions"
  ON test_sessions FOR SELECT
  USING (auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = test_sessions.user_id LIMIT 1));

-- Политики: только система может создавать/обновлять (через Edge Function)
CREATE POLICY "System can insert test sessions"
  ON test_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update test sessions"
  ON test_sessions FOR UPDATE
  USING (true);

-- Комментарии
COMMENT ON TABLE test_sessions IS 'Начало тестовых сессий для валидации времени прохождения';
COMMENT ON COLUMN test_sessions.started_at IS 'Серверное время UTC начала теста (не клиентское!)';
COMMENT ON COLUMN test_sessions.session_id IS 'Связь с test_results.session_id для валидации';

