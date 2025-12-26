-- Исправление: использовать часовой пояс пользователя (Europe/Madrid) вместо UTC
-- Это гарантирует сброс лимита в полночь по местному времени

-- Пересоздаём функцию инкремента с учётом часового пояса
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 10;
  v_today DATE;
BEGIN
  -- ВАЖНО: Используем часовой пояс Europe/Madrid для определения "сегодня"
  -- Это гарантирует сброс лимита в 00:00 по местному времени
  v_today := (NOW() AT TIME ZONE 'Europe/Madrid')::DATE;
  
  -- Проверяем Premium статус
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;
  
  -- Если Premium - безлимит
  IF v_is_premium THEN
    INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
    VALUES (p_user_id, v_today, 1)
    ON CONFLICT (user_id, usage_date) 
    DO UPDATE SET 
      request_count = daily_ai_usage.request_count + 1,
      updated_at = NOW()
    RETURNING request_count INTO v_count;
    
    RETURN QUERY SELECT v_count, FALSE;
    RETURN;
  END IF;
  
  -- Для Free пользователей
  INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
  VALUES (p_user_id, v_today, 1)
  ON CONFLICT (user_id, usage_date) 
  DO UPDATE SET 
    request_count = daily_ai_usage.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO v_count;
  
  RETURN QUERY SELECT v_count, (v_count > v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пересоздаём функцию проверки лимита с учётом часового пояса
CREATE OR REPLACE FUNCTION check_ai_usage_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, remaining INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 10;
  v_today DATE;
BEGIN
  -- ВАЖНО: Используем часовой пояс Europe/Madrid
  v_today := (NOW() AT TIME ZONE 'Europe/Madrid')::DATE;
  
  -- Проверяем Premium статус
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;
  
  -- Если Premium - безлимит
  IF v_is_premium THEN
    SELECT COALESCE(request_count, 0) INTO v_count
    FROM daily_ai_usage 
    WHERE user_id = p_user_id AND usage_date = v_today;
    
    RETURN QUERY SELECT COALESCE(v_count, 0), 999, FALSE;
    RETURN;
  END IF;
  
  -- Для Free пользователей
  SELECT COALESCE(request_count, 0) INTO v_count
  FROM daily_ai_usage 
  WHERE user_id = p_user_id AND usage_date = v_today;
  
  v_count := COALESCE(v_count, 0);
  
  RETURN QUERY SELECT v_count, GREATEST(v_daily_limit - v_count, 0), (v_count >= v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии обновлены
COMMENT ON FUNCTION increment_ai_usage IS 'Атомарно увеличивает счётчик (timezone: Europe/Madrid)';
COMMENT ON FUNCTION check_ai_usage_limit IS 'Проверяет лимит без инкремента (timezone: Europe/Madrid)';
