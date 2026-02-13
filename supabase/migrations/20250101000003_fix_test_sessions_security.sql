-- ============================================
-- ИСПРАВЛЕНИЕ: Критическая ошибка безопасности в test_sessions
-- Применять если миграция 20250101000000 уже была применена
-- ============================================

-- 1. Удаляем опасные политики, которые позволяют клиентам создавать/обновлять записи
DROP POLICY IF EXISTS "System can insert test sessions" ON test_sessions;
DROP POLICY IF EXISTS "System can update test sessions" ON test_sessions;

-- 2. Добавляем поле finished_at (если еще нет)
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- 3. Обновляем политику SELECT (оптимизированная версия)
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

-- 4. Обновляем индексы для оптимизации
-- Удаляем старые индексы (если они есть)
DROP INDEX IF EXISTS idx_test_sessions_session_id;
DROP INDEX IF EXISTS idx_test_sessions_user_id;
DROP INDEX IF EXISTS idx_test_sessions_status;
DROP INDEX IF EXISTS idx_test_sessions_started_at;

-- Создаем оптимизированные индексы
CREATE INDEX IF NOT EXISTS idx_test_sessions_lookup ON test_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_cleanup ON test_sessions(status, started_at);

-- 5. Обновляем комментарии
COMMENT ON TABLE test_sessions IS 'Сессии для валидации анти-чита. Запись только через Edge Functions.';
COMMENT ON COLUMN test_sessions.finished_at IS 'Время завершения теста (для аналитики)';

-- 6. Делаем mode NOT NULL (если еще не так)
-- Сначала обновляем существующие NULL значения
UPDATE test_sessions SET mode = 'practice' WHERE mode IS NULL;
ALTER TABLE test_sessions ALTER COLUMN mode SET NOT NULL;

