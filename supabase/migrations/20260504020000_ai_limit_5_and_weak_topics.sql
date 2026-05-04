-- AI chat: снижаем лимит с 10 до 5 для free пользователей
-- + добавляем RPC get_weak_topics для premium memory

-- Дропаем и пересоздаём (изменился тип возврата в комментарии, но структура одна — safer через replace)
DROP FUNCTION IF EXISTS increment_ai_usage(UUID);
DROP FUNCTION IF EXISTS check_ai_usage_limit(UUID);

-- Обновляем increment_ai_usage: лимит 10 → 5
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 5; -- снижено с 10 до 5
BEGIN
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;

  IF v_is_premium THEN
    INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET request_count = daily_ai_usage.request_count + 1, updated_at = NOW()
    RETURNING request_count INTO v_count;
    RETURN QUERY SELECT v_count, FALSE;
    RETURN;
  END IF;

  INSERT INTO daily_ai_usage (user_id, usage_date, request_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET request_count = daily_ai_usage.request_count + 1, updated_at = NOW()
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT v_count, (v_count > v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем check_ai_usage_limit: лимит 10 → 5
CREATE OR REPLACE FUNCTION check_ai_usage_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, remaining INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_is_premium BOOLEAN;
  v_daily_limit INTEGER := 5; -- снижено с 10 до 5
BEGIN
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;

  IF v_is_premium THEN
    SELECT COALESCE(request_count, 0) INTO v_count
    FROM daily_ai_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    RETURN QUERY SELECT COALESCE(v_count, 0), 999, FALSE;
    RETURN;
  END IF;

  SELECT COALESCE(request_count, 0) INTO v_count
  FROM daily_ai_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  v_count := COALESCE(v_count, 0);

  RETURN QUERY SELECT v_count, GREATEST(v_daily_limit - v_count, 0), (v_count >= v_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_weak_topics — топ-5 тем с наименьшей точностью для premium memory
-- Основано на question_attempts или game_sessions questions
CREATE OR REPLACE FUNCTION get_weak_topics(p_profile_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(topic_title TEXT, accuracy NUMERIC, attempt_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(t.title_es, t.title_ru, 'Unknown')::TEXT AS topic_title,
    CASE WHEN COUNT(*) > 0
      THEN ROUND((SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 1)
      ELSE 0
    END AS accuracy,
    COUNT(*)::INTEGER AS attempt_count
  FROM question_attempts qa
  JOIN questions q ON q.id = qa.question_id
  LEFT JOIN topics t ON t.id = q.topic_id
  WHERE qa.user_id = p_profile_id
    AND qa.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY t.title_es, t.title_ru
  HAVING COUNT(*) >= 3
  ORDER BY accuracy ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_ai_usage IS 'Атомарно увеличивает счётчик AI (лимит free: 5/день)';
COMMENT ON FUNCTION check_ai_usage_limit IS 'Проверяет лимит AI без инкремента (лимит free: 5/день)';
COMMENT ON FUNCTION get_weak_topics IS 'Топ-N слабых тем пользователя за 30 дней для premium AI memory';
