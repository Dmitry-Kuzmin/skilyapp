-- Оптимизированный RPC для завершения теста (замена 756 строк JS на SQL)
-- Выполняется в одной транзакции, время < 3 секунд

CREATE OR REPLACE FUNCTION process_test_completion(
  p_user_id UUID,
  p_test_id TEXT,
  p_session_id TEXT,
  p_score INTEGER,
  p_questions_count INTEGER,
  p_correct_count INTEGER,
  p_test_duration_seconds INTEGER,
  p_premium_flag BOOLEAN DEFAULT FALSE,
  p_double_sp_active BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_coins_reward INTEGER;
  v_sp_reward INTEGER;
  v_is_premium BOOLEAN;
  v_test_result_id BIGINT;
  v_subscription_status TEXT;
  v_subscription_expires_at TIMESTAMPTZ;
  v_premium_forever_purchased_at TIMESTAMPTZ;
  v_questions_multiplier NUMERIC;
  v_abuse_penalty NUMERIC := 1.0;
  v_diminishing_factor NUMERIC := 1.0;
  v_tests_today INTEGER;
  v_base_coins INTEGER;
  v_base_sp INTEGER;
BEGIN
  -- 1. Проверка Premium статуса
  SELECT subscription_status, subscription_expires_at, premium_forever_purchased_at
  INTO v_subscription_status, v_subscription_expires_at, v_premium_forever_purchased_at
  FROM profiles
  WHERE id = p_user_id;

  v_is_premium := (
    v_subscription_status = 'lifetime' OR
    v_premium_forever_purchased_at IS NOT NULL OR
    (v_subscription_status = 'pro' AND (v_subscription_expires_at IS NULL OR v_subscription_expires_at > NOW())) OR
    (v_subscription_status = 'active' AND v_subscription_expires_at > NOW()) OR
    (v_subscription_status = 'trial' AND v_subscription_expires_at > NOW()) OR
    p_premium_flag
  );

  -- 2. Расчет мультипликатора длины теста
  v_questions_multiplier := CASE
    WHEN p_questions_count <= 10 THEN p_questions_count::NUMERIC / 10
    ELSE 1.0 + (1 - EXP(-(p_questions_count - 10)::NUMERIC / 15)) * 0.5
  END;
  v_questions_multiplier := LEAST(v_questions_multiplier, 1.5);

  -- 3. Базовые награды
  v_base_coins := GREATEST(
    ROUND(20 * (p_score::NUMERIC / 100) * v_questions_multiplier),
    CEIL(1.5 * v_questions_multiplier)
  )::INTEGER;

  v_base_sp := ROUND(
    15 * (0.35 + p_score::NUMERIC / 180) + 
    FLOOR(p_questions_count / 10) +
    CASE WHEN p_score = 100 THEN 10 ELSE 0 END
  )::INTEGER;

  -- 4. Premium множители
  IF v_is_premium THEN
    v_base_coins := ROUND(v_base_coins * 1.5)::INTEGER;
    v_base_sp := ROUND(v_base_sp * 1.3)::INTEGER;
  END IF;

  -- 5. Double SP
  IF p_double_sp_active THEN
    v_base_sp := v_base_sp * 2;
  END IF;

  -- 6. Diminishing returns
  SELECT COUNT(*) INTO v_tests_today
  FROM test_results
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

  IF v_tests_today > 10 THEN
    v_diminishing_factor := GREATEST(0.8, 1 - (v_tests_today - 10)::NUMERIC * 0.05);
  END IF;

  -- 7. Применяем множители
  v_coins_reward := LEAST(
    ROUND(v_base_coins * v_abuse_penalty * v_diminishing_factor),
    100
  )::INTEGER;

  v_sp_reward := LEAST(
    ROUND(v_base_sp * v_abuse_penalty * v_diminishing_factor),
    100
  )::INTEGER;

  -- 8. Обновляем баланс монет (атомарно)
  UPDATE profiles
  SET coins = coins + v_coins_reward
  WHERE id = p_user_id;

  -- 9. Начисляем SP (через функцию или напрямую)
  UPDATE profiles
  SET xp = xp + v_sp_reward
  WHERE id = p_user_id;

  -- 10. Записываем результат теста
  -- Приводим test_id к UUID (если невозможно -> NULL для practice)
  INSERT INTO test_results (
    user_id,
    test_id,
    session_id,
    score,
    questions_count,
    correct_count,
    test_duration_seconds,
    coins_awarded,
    sp_awarded,
    premium_used,
    double_sp_used,
    abuse_penalty,
    diminishing_factor,
    questions_multiplier,
    base_coins_calculated,
    base_sp_calculated
  )
  VALUES (
    p_user_id,
    CASE 
      WHEN p_test_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN p_test_id::UUID 
      ELSE NULL 
    END,
    p_session_id,
    p_score,
    p_questions_count,
    p_correct_count,
    p_test_duration_seconds,
    v_coins_reward,
    v_sp_reward,
    v_is_premium,
    p_double_sp_active,
    v_abuse_penalty,
    v_diminishing_factor,
    v_questions_multiplier,
    v_base_coins,
    v_base_sp
  )
  RETURNING id INTO v_test_result_id;

  -- 11. Обновляем статус сессии
  UPDATE test_sessions
  SET status = 'completed',
      finished_at = NOW(),
      updated_at = NOW()
  WHERE session_id = p_session_id;

  -- 12. Логируем транзакцию
  INSERT INTO transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    p_user_id,
    'coins_earned_test',
    v_coins_reward,
    json_build_object(
      'test_id', p_test_id,
      'session_id', p_session_id,
      'score', p_score,
      'test_result_id', v_test_result_id
    )::JSONB
  );

  -- 13. Возвращаем результат
  RETURN json_build_object(
    'coins_awarded', v_coins_reward,
    'sp_awarded', v_sp_reward,
    'base_coins', v_base_coins,
    'base_sp', v_base_sp,
    'test_result_id', v_test_result_id,
    'abuse_penalty', v_abuse_penalty,
    'diminishing_factor', v_diminishing_factor,
    'tests_today', v_tests_today,
    'is_premium', v_is_premium
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Права доступа
GRANT EXECUTE ON FUNCTION process_test_completion(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION process_test_completion(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
