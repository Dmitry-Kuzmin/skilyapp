-- ============================================
-- Система наград за тесты - Production Ready
-- ============================================

-- 1. Таблица результатов тестов
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  session_id TEXT UNIQUE NOT NULL, -- для idempotency
  
  -- Результаты теста
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  questions_count INTEGER NOT NULL CHECK (questions_count > 0),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  test_duration_seconds INTEGER NOT NULL CHECK (test_duration_seconds >= 0),
  
  -- Награды
  coins_awarded INTEGER NOT NULL DEFAULT 0 CHECK (coins_awarded >= 0),
  sp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (sp_awarded >= 0),
  
  -- Метаданные
  premium_used BOOLEAN DEFAULT FALSE,
  double_sp_used BOOLEAN DEFAULT FALSE,
  abuse_penalty FLOAT DEFAULT 1.0 CHECK (abuse_penalty >= 0 AND abuse_penalty <= 1.0),
  diminishing_factor FLOAT DEFAULT 1.0 CHECK (diminishing_factor >= 0 AND diminishing_factor <= 1.0),
  
  -- Для аналитики
  questions_multiplier FLOAT,
  base_coins_calculated INTEGER,
  base_sp_calculated INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Таблица конфигурации наград (с поддержкой сезонов)
CREATE TABLE IF NOT EXISTS public.reward_config (
  id SERIAL PRIMARY KEY,
  season_id INTEGER, -- NULL = глобальная конфигурация
  
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  revision INTEGER DEFAULT 1,
  
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(key, season_id, revision)
);

-- 3. История изменений конфигурации (для аудита)
CREATE TABLE IF NOT EXISTS public.reward_config_history (
  id SERIAL PRIMARY KEY,
  config_id INTEGER REFERENCES reward_config(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================
-- Индексы для производительности и аналитики
-- ============================================

-- Индексы для test_results
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_user_date ON test_results(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_abuse ON test_results(abuse_penalty) WHERE abuse_penalty < 1.0;
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id) WHERE test_id IS NOT NULL;

-- Индексы для reward_config
CREATE INDEX IF NOT EXISTS idx_reward_config_key_active ON reward_config(key, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_reward_config_season ON reward_config(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reward_config_effective ON reward_config(effective_from) WHERE is_active = TRUE;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_config_history ENABLE ROW LEVEL SECURITY;

-- test_results: пользователи видят только свои результаты
CREATE POLICY "Users can view their own test results"
ON test_results FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- test_results: только система может создавать записи (через Edge Function)
CREATE POLICY "System can insert test results"
ON test_results FOR INSERT
WITH CHECK (true); -- Edge Function использует service_role

-- reward_config: все могут читать активные конфигурации
CREATE POLICY "Anyone can view active reward configs"
ON reward_config FOR SELECT
USING (is_active = TRUE);

-- reward_config: только админы могут изменять (через Edge Function с проверкой роли)
CREATE POLICY "Admins can manage reward configs"
ON reward_config FOR ALL
USING (true); -- Проверка роли в Edge Function

-- reward_config_history: все могут читать
CREATE POLICY "Anyone can view reward config history"
ON reward_config_history FOR SELECT
USING (true);

-- ============================================
-- Функция для получения активной конфигурации
-- ============================================

CREATE OR REPLACE FUNCTION get_active_reward_config(
  p_key TEXT,
  p_season_id INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Сначала пытаемся найти конфигурацию для сезона
  IF p_season_id IS NOT NULL THEN
    SELECT value INTO v_config
    FROM reward_config
    WHERE key = p_key
      AND season_id = p_season_id
      AND is_active = TRUE
      AND effective_from <= NOW()
    ORDER BY effective_from DESC, revision DESC
    LIMIT 1;
  END IF;
  
  -- Если не найдено для сезона, берем глобальную конфигурацию
  IF v_config IS NULL THEN
    SELECT value INTO v_config
    FROM reward_config
    WHERE key = p_key
      AND season_id IS NULL
      AND is_active = TRUE
      AND effective_from <= NOW()
    ORDER BY effective_from DESC, revision DESC
    LIMIT 1;
  END IF;
  
  RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Инициализация дефолтной конфигурации
-- ============================================

INSERT INTO reward_config (key, value, revision, is_active) VALUES
('test_rewards', '{
  "baseCoins": 10,
  "baseSP": 20,
  "questionsReference": 20,
  "maxQuestionsMultiplierCap": 1.5,
  "premiumCoinsMultiplier": 1.5,
  "premiumSPMultiplier": 1.2,
  "maxCoinsPerTest": 500,
  "maxSPPerTest": 200,
  "minCoinsPerTest": 2,
  "minTestDurationBase": 10,
  "minTestDurationPerQuestion": 0.5,
  "abuseDetection": {
    "enabled": true,
    "minAnswerSpeedSeconds": 2,
    "suspiciousPatternThreshold": 5,
    "minPenalty": 0.55
  },
  "diminishingReturns": {
    "enabled": true,
    "threshold": 25,
    "reductionPerTest": 0.01,
    "maxReduction": 0.20
  }
}'::jsonb, 1, TRUE)
ON CONFLICT (key, season_id, revision) DO NOTHING;

-- ============================================
-- Комментарии для документации
-- ============================================

COMMENT ON TABLE test_results IS 'Результаты прохождения тестов с наградами и метаданными для аналитики';
COMMENT ON TABLE reward_config IS 'Конфигурация системы наград с поддержкой сезонов и A/B тестирования';
COMMENT ON TABLE reward_config_history IS 'История изменений конфигурации наград для аудита';
COMMENT ON COLUMN test_results.abuse_penalty IS 'Коэффициент штрафа за подозрительное поведение (0.0-1.0)';
COMMENT ON COLUMN test_results.diminishing_factor IS 'Коэффициент diminishing returns (0.0-1.0)';
COMMENT ON FUNCTION get_active_reward_config IS 'Получить активную конфигурацию наград (с приоритетом сезона)';

