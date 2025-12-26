-- Таблица для учёта ежедневного использования AI
-- Free пользователи: 10 запросов в день
-- Premium пользователи: безлимит

CREATE TABLE IF NOT EXISTS daily_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Уникальный индекс: один пользователь = одна запись в день
  UNIQUE(user_id, usage_date)
);

-- Индекс для быстрого поиска по дате
CREATE INDEX IF NOT EXISTS idx_daily_ai_usage_date ON daily_ai_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_ai_usage_user ON daily_ai_usage(user_id);

-- RLS политики
ALTER TABLE daily_ai_usage ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть только свои записи
CREATE POLICY "Users can view own usage" ON daily_ai_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Service role может всё (для Edge Functions)
CREATE POLICY "Service role full access" ON daily_ai_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Функция для инкремента счётчика (атомарная операция)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 10; -- Лимит для Free пользователей
BEGIN
  -- Проверяем Premium статус
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;
  
  -- Если Premium - безлимит
  IF v_is_premium THEN
    -- Всё равно записываем для статистики
    INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date) 
    DO UPDATE SET 
      request_count = daily_ai_usage.request_count + 1,
      updated_at = NOW()
    RETURNING request_count INTO v_count;
    
    RETURN QUERY SELECT v_count, FALSE;
    RETURN;
  END IF;
  
  -- Для Free пользователей - проверяем и инкрементим
  INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date) 
  DO UPDATE SET 
    request_count = daily_ai_usage.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO v_count;
  
  -- Возвращаем текущий счётчик и флаг лимита
  RETURN QUERY SELECT v_count, (v_count > v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для проверки лимита БЕЗ инкремента
CREATE OR REPLACE FUNCTION check_ai_usage_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, remaining INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 10;
BEGIN
  -- Проверяем Premium статус
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;
  
  -- Если Premium - безлимит
  IF v_is_premium THEN
    SELECT COALESCE(request_count, 0) INTO v_count
    FROM daily_ai_usage 
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    
    RETURN QUERY SELECT COALESCE(v_count, 0), 999, FALSE;
    RETURN;
  END IF;
  
  -- Для Free пользователей
  SELECT COALESCE(request_count, 0) INTO v_count
  FROM daily_ai_usage 
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  
  v_count := COALESCE(v_count, 0);
  
  RETURN QUERY SELECT v_count, GREATEST(v_daily_limit - v_count, 0), (v_count >= v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии
COMMENT ON TABLE daily_ai_usage IS 'Учёт ежедневного использования AI чата для лимитов';
COMMENT ON FUNCTION increment_ai_usage IS 'Атомарно увеличивает счётчик и возвращает статус лимита';
COMMENT ON FUNCTION check_ai_usage_limit IS 'Проверяет лимит без инкремента';
