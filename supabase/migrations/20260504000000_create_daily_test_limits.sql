-- Лимит полных тестов в день для free пользователей: 5 тестов
-- Premium и trial - безлимит. Ad reward даёт +1 тест.

CREATE TABLE IF NOT EXISTS daily_test_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  full_test_count INTEGER NOT NULL DEFAULT 0,
  ad_grants INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_test_limits_date ON daily_test_limits(usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_test_limits_user ON daily_test_limits(user_id);

ALTER TABLE daily_test_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test limits" ON daily_test_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on test limits" ON daily_test_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Helper: считается ли пользователь premium для целей лимитов
CREATE OR REPLACE FUNCTION is_user_premium_for_limits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_status TEXT;
  v_end_date TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(is_premium, FALSE),
    subscription_status,
    subscription_expires_at
  INTO v_is_premium, v_status, v_end_date
  FROM profiles WHERE id = p_user_id;

  IF v_is_premium THEN
    RETURN TRUE;
  END IF;

  IF v_status IN ('trial', 'pro', 'lifetime') THEN
    IF v_status = 'lifetime' THEN
      RETURN TRUE;
    END IF;
    IF v_end_date IS NULL OR v_end_date > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Атомарная проверка и инкремент: вызывается перед стартом полного теста
CREATE OR REPLACE FUNCTION increment_test_usage(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, daily_cap INTEGER, limit_reached BOOLEAN, is_premium BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_ad_grants INTEGER;
  v_is_premium BOOLEAN;
  v_base_limit INTEGER := 5;
  v_effective_limit INTEGER;
BEGIN
  v_is_premium := is_user_premium_for_limits(p_user_id);

  IF v_is_premium THEN
    INSERT INTO daily_test_limits (user_id, usage_date, full_test_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
      full_test_count = daily_test_limits.full_test_count + 1,
      updated_at = NOW()
    RETURNING full_test_count INTO v_count;

    RETURN QUERY SELECT v_count, 999, FALSE, TRUE;
    RETURN;
  END IF;

  -- Free user: проверяем лимит ДО инкремента
  SELECT
    COALESCE(daily_test_limits.full_test_count, 0),
    COALESCE(daily_test_limits.ad_grants, 0)
  INTO v_count, v_ad_grants
  FROM daily_test_limits
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  v_count := COALESCE(v_count, 0);
  v_ad_grants := COALESCE(v_ad_grants, 0);
  v_effective_limit := v_base_limit + v_ad_grants;

  IF v_count >= v_effective_limit THEN
    RETURN QUERY SELECT v_count, v_effective_limit, TRUE, FALSE;
    RETURN;
  END IF;

  -- Не достигнут — инкрементим
  INSERT INTO daily_test_limits (user_id, usage_date, full_test_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    full_test_count = daily_test_limits.full_test_count + 1,
    updated_at = NOW()
  RETURNING full_test_count INTO v_count;

  RETURN QUERY SELECT v_count, v_effective_limit, (v_count >= v_effective_limit), FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверка без инкремента (для отображения в UI)
CREATE OR REPLACE FUNCTION check_test_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, daily_cap INTEGER, remaining INTEGER, limit_reached BOOLEAN, is_premium BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_ad_grants INTEGER;
  v_is_premium BOOLEAN;
  v_base_limit INTEGER := 5;
  v_effective_limit INTEGER;
BEGIN
  v_is_premium := is_user_premium_for_limits(p_user_id);

  SELECT
    COALESCE(daily_test_limits.full_test_count, 0),
    COALESCE(daily_test_limits.ad_grants, 0)
  INTO v_count, v_ad_grants
  FROM daily_test_limits
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  v_count := COALESCE(v_count, 0);
  v_ad_grants := COALESCE(v_ad_grants, 0);

  IF v_is_premium THEN
    RETURN QUERY SELECT v_count, 999, 999, FALSE, TRUE;
    RETURN;
  END IF;

  v_effective_limit := v_base_limit + v_ad_grants;

  RETURN QUERY SELECT
    v_count,
    v_effective_limit,
    GREATEST(v_effective_limit - v_count, 0),
    (v_count >= v_effective_limit),
    FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Грант +1 тест после просмотра рекламы
CREATE OR REPLACE FUNCTION grant_test_from_ad(p_user_id UUID)
RETURNS TABLE(new_ad_grants INTEGER, new_cap INTEGER) AS $$
DECLARE
  v_ad_grants INTEGER;
  v_count INTEGER;
  v_max_ad_grants INTEGER := 3; -- максимум +3 теста за рекламу в день
BEGIN
  INSERT INTO daily_test_limits (user_id, usage_date, ad_grants, full_test_count)
  VALUES (p_user_id, CURRENT_DATE, 1, 0)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    ad_grants = LEAST(daily_test_limits.ad_grants + 1, v_max_ad_grants),
    updated_at = NOW()
  RETURNING ad_grants, full_test_count INTO v_ad_grants, v_count;

  RETURN QUERY SELECT v_ad_grants, (5 + v_ad_grants);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_test_usage(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_test_limit(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION grant_test_from_ad(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_user_premium_for_limits(UUID) TO authenticated, service_role;

COMMENT ON TABLE daily_test_limits IS 'Учёт полных тестов в день для free-юзеров (5/день базовый лимит + до 3 от рекламы)';
COMMENT ON FUNCTION increment_test_usage IS 'Атомарная проверка и инкремент перед началом полного теста';
COMMENT ON FUNCTION check_test_limit IS 'Просмотр текущего использования без инкремента';
COMMENT ON FUNCTION grant_test_from_ad IS 'Добавляет +1 разрешение после просмотра рекламы (до 3 в день)';
