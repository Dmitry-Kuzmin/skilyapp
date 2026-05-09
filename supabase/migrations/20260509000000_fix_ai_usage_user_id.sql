-- Fix: обе RPC функции теперь ищут профиль по profiles.user_id = auth.users.id
-- Ранее использовалось profiles WHERE id = p_user_id, что было неверно:
--   - Edge Function передаёт auth.users.id (правильно)
--   - Клиент передавал profiles.id (неверно) → счётчик всегда возвращал 0
-- Теперь везде используется auth.users.id как единый идентификатор.

CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 5;
BEGIN
  -- FIX: было WHERE id = p_user_id (profiles PK), теперь WHERE user_id (auth.users.id)
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE user_id = p_user_id;

  IF v_is_premium THEN
    INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET request_count = daily_ai_usage.request_count + 1, updated_at = NOW()
    RETURNING request_count INTO v_count;
    RETURN QUERY SELECT v_count, FALSE;
    RETURN;
  END IF;

  -- Читаем текущий счётчик ДО инкремента
  SELECT COALESCE(request_count, 0) INTO v_count
  FROM daily_ai_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  v_count := COALESCE(v_count, 0);

  -- Уже на лимите: не инкрементируем, счётчик не раздувается выше 5
  IF v_count >= v_daily_limit THEN
    RETURN QUERY SELECT v_count, TRUE;
    RETURN;
  END IF;

  -- Ниже лимита: инкрементируем атомарно
  INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET request_count = daily_ai_usage.request_count + 1, updated_at = NOW()
  RETURNING request_count INTO v_count;

  -- v_count > v_daily_limit: при гонке двух запросов один может проскочить до 6
  RETURN QUERY SELECT v_count, (v_count > v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_ai_usage_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, remaining INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 5;
BEGIN
  -- FIX: было WHERE id = p_user_id (profiles PK), теперь WHERE user_id (auth.users.id)
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE user_id = p_user_id;

  IF v_is_premium THEN
    SELECT COALESCE(request_count, 0) INTO v_count
    FROM daily_ai_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    RETURN QUERY SELECT COALESCE(v_count, 0), 999, FALSE;
    RETURN;
  END IF;

  SELECT COALESCE(request_count, 0) INTO v_count
  FROM daily_ai_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  v_count := COALESCE(v_count, 0);

  -- remaining = max(5 - count, 0); limit_reached = count >= 5
  RETURN QUERY SELECT v_count, GREATEST(v_daily_limit - v_count, 0), (v_count >= v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_ai_usage IS 'Атомарно увеличивает счётчик AI (лимит free: 5/день). p_user_id = auth.users.id';
COMMENT ON FUNCTION check_ai_usage_limit IS 'Проверяет лимит AI без инкремента (лимит free: 5/день). p_user_id = auth.users.id';
