-- Расширение функции claim_ad_reward для поддержки новых типов наград:
-- - double_winnings: удвоение выигрыша в дуэли
-- - slot_unlock: ВРЕМЕННАЯ разблокировка слота за рекламу (только на одну дуэль, НЕ навсегда!)

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

  -- Получаем запись для обновления (блокируем для атомарности)
  SELECT * INTO v_record
  FROM ad_rewards
  WHERE user_id = p_user_id
    AND reward_type = p_reward_type
    AND date = CURRENT_DATE
  FOR UPDATE;

  -- ⚠️ ВАЖНО: Если записи нет - создаем (первый просмотр за день)
  -- Это необходимо, так как check_ad_reward_status больше не создает запись
  IF NOT FOUND THEN
    INSERT INTO ad_rewards (user_id, reward_type, date, daily_count, last_watched_at)
    VALUES (p_user_id, p_reward_type, CURRENT_DATE, 0, NULL)
    RETURNING * INTO v_record;
  END IF;

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
    -- ⚠️ ВАЖНО: Мы НЕ обновляем profiles.ram_slots_unlocked навсегда.
    -- Мы просто фиксируем факт просмотра. Фронтенд сам активирует слот на 1 раз.
    
    -- Создаем транзакцию (без изменения монет)
    INSERT INTO transactions (user_id, transaction_type, amount, metadata)
    VALUES (
      p_user_id,
      'ad_watched', -- Используем нейтральный тип, так как монет нет
      0,
      jsonb_build_object(
        'reward_type', p_reward_type,
        'source', 'overclocking',
        'reward', 'temp_slot_unlock',
        'slot_number', 2,
        'daily_count', (v_status->>'daily_count')::INTEGER + 1
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward_type', p_reward_type,
    'reward_amount', CASE WHEN p_reward_type = 'slot_unlock' THEN 0 ELSE p_reward_amount END,
    'daily_count', (v_status->>'daily_count')::INTEGER + 1,
    'daily_limit', p_daily_limit, -- Возвращаем актуальный лимит
    'client_action', CASE WHEN p_reward_type = 'slot_unlock' THEN 'unlock_temp_slot' ELSE 'none' END
  );
END;
$$;

COMMENT ON FUNCTION claim_ad_reward IS 'Claims ad reward after successful ad watch. Supports: coins (CRYPTO MINER), double_winnings (DATA LAUNDERING), slot_unlock (OVERCLOCKING - TEMPORARY, one duel only). Validates limits (p_daily_limit, p_cooldown_minutes). Returns client_action for frontend handling';

