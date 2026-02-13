-- ============================================
-- Таблица валидации тестовых сессий (Secure Version)
-- Используется для валидации времени прохождения теста
-- ============================================

CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL, -- UUID от клиента для идемпотентности
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL, -- Можно оставить NULL, если это динамический тест (например, Blitz)
  
  -- Параметры защиты
  questions_count INTEGER NOT NULL CHECK (questions_count > 0),
  mode TEXT NOT NULL, -- 'practice', 'exam', 'blitz', 'mastery', 'sequential', 'module', 'challenge-bank', 'dgt'
  
  -- Время (Серверное время - гарант безопасности)
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ, -- Полезно для аналитики времени прохождения
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  
  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_test_sessions_lookup ON test_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_cleanup ON test_sessions(status, started_at); -- Для Cron-очистки

-- RLS (Безопасность)
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- 1. ЧТЕНИЕ: Пользователь видит только свои сессии (для истории/дебага)
-- Оптимизированная версия: сравниваем напрямую через profiles.user_id
DROP POLICY IF EXISTS "Users can view own test sessions" ON test_sessions;
CREATE POLICY "Users can view own test sessions"
  ON test_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = test_sessions.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- 2. ЗАПИСЬ: ПОЛНОСТЬЮ ЗАПРЕЩЕНА для клиентов!
-- Мы НЕ создаем политики FOR INSERT / UPDATE / DELETE.
-- Это означает, что Supabase API вернет 401/403 при попытке записи с клиента.
-- Edge Functions (Service Role) по умолчанию обходят это ограничение.

-- Комментарии
COMMENT ON TABLE test_sessions IS 'Сессии для валидации анти-чита. Запись только через Edge Functions.';
COMMENT ON COLUMN test_sessions.started_at IS 'Серверное время UTC начала теста (не клиентское!)';
COMMENT ON COLUMN test_sessions.session_id IS 'Связь с test_results.session_id для валидации';
COMMENT ON COLUMN test_sessions.finished_at IS 'Время завершения теста (для аналитики)';

