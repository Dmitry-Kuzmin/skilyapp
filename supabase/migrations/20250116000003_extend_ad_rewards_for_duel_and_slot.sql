-- Расширение функции claim_ad_reward для поддержки новых типов наград:
-- - double_winnings: удвоение выигрыша в дуэли
-- - slot_unlock: разблокировка слота за рекламу

CREATE OR REPLACE FUNCTION claim_ad_reward(
  p_user_id UUID,
  p_reward_type TEXT,
  p_reward_amount INTEGER DEFAULT 50,
  p_daily_limit INTEGER DEFAULT 5,    -- Лимит: 5 раз в день (по умолчанию)
  p_cooldown_minutes INTEGER DEFAULT 60 -- Кулдаун: 1 час между просмотрами (по умолчанию)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status JSONB;
  v_record RECORD;
  v_metadata JSONB;
BEGIN
  -- Проверяем статус с теми же лимитами
  v_status := check_ad_reward_status(p_user_id, p_reward_type, p_daily_limit, p_cooldown_minutes);
  
  IF NOT (v_status->>'can_watch')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ad reward not available',
      'reason', 'cooldown_or_limit',
      'next_available_at', v_status->>'next_available_at'
    );
  END IF;

  -- Получаем запись для обновления
  SELECT * INTO v_record
  FROM ad_rewards
  WHERE user_id = p_user_id
    AND reward_type = p_reward_type
    AND date = CURRENT_DATE
  FOR UPDATE;

  -- Обновляем счетчик и время последнего просмотра
  UPDATE ad_rewards
  SET daily_count = daily_count + 1,
      last_watched_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND reward_type = p_reward_type
    AND date = CURRENT_DATE;

  -- Обрабатываем разные типы наград
  IF p_reward_type = 'coins' AND p_reward_amount > 0 THEN
    -- Начисляем монеты (CRYPTO MINER)
    PERFORM increment_profile_value(p_user_id, 'coins', p_reward_amount);
    
    -- Создаем транзакцию
    INSERT INTO transactions (user_id, transaction_type, amount, metadata)
    VALUES (
      p_user_id,
      'coins_earned_ad',
      p_reward_amount,
      jsonb_build_object(
        'reward_type', p_reward_type,
        'source', 'crypto_miner',
        'daily_count', (v_status->>'daily_count')::INTEGER + 1
      )
    );
    
  ELSIF p_reward_type = 'double_winnings' AND p_reward_amount > 0 THEN
    -- Удваиваем выигрыш (DATA LAUNDERING)
    PERFORM increment_profile_value(p_user_id, 'coins', p_reward_amount);
    
    -- Создаем транзакцию
    INSERT INTO transactions (user_id, transaction_type, amount, metadata)
    VALUES (
      p_user_id,
      'coins_earned_ad',
      p_reward_amount,
      jsonb_build_object(
        'reward_type', p_reward_type,
        'source', 'data_laundering',
        'daily_count', (v_status->>'daily_count')::INTEGER + 1
      )
    );
    
  ELSIF p_reward_type = 'slot_unlock' THEN
    -- Разблокируем слот (OVERCLOCKING)
    -- Получаем metadata из параметров (если передано)
    v_metadata := jsonb_build_object('slot_number', 2); -- По умолчанию слот 2
    
    -- Обновляем ram_slots_unlocked (только если текущее значение меньше 2)
    UPDATE profiles
    SET ram_slots_unlocked = GREATEST(ram_slots_unlocked, 2),
        updated_at = NOW()
    WHERE id = p_user_id
      AND ram_slots_unlocked < 2;
    
    -- Создаем транзакцию (без изменения монет)
    INSERT INTO transactions (user_id, transaction_type, amount, metadata)
    VALUES (
      p_user_id,
      'slot_unlocked_ad',
      0,
      jsonb_build_object(
        'reward_type', p_reward_type,
        'source', 'overclocking',
        'slot_number', 2,
        'daily_count', (v_status->>'daily_count')::INTEGER + 1
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', CASE WHEN p_reward_type = 'slot_unlock' THEN 0 ELSE p_reward_amount END,
    'daily_count', (v_status->>'daily_count')::INTEGER + 1,
    'daily_limit', (v_status->>'daily_limit')::INTEGER
  );
END;
$$;

COMMENT ON FUNCTION claim_ad_reward IS 'Claims ad reward after successful ad watch. Supports: coins (CRYPTO MINER), double_winnings (DATA LAUNDERING), slot_unlock (OVERCLOCKING). Validates limits (p_daily_limit, p_cooldown_minutes)';

