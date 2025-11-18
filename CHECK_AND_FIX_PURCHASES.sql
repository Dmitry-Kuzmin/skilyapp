-- Проверка покупок монет, которые не были обработаны
-- Используйте этот скрипт для диагностики и ручной обработки покупок

-- 1. Проверка покупок со статусом pending для coins_pack
SELECT 
  p.id,
  p.user_id,
  p.stripe_session_id,
  p.item_type,
  p.item_id,
  p.metadata,
  p.status,
  p.created_at,
  pr.coins as current_coins,
  CASE 
    WHEN p.metadata->>'coins' IS NOT NULL 
    THEN (p.metadata->>'coins')::integer 
    ELSE 0 
  END as coins_to_add
FROM purchases p
LEFT JOIN profiles pr ON pr.id = p.user_id
WHERE p.item_type = 'coins_pack'
  AND p.status = 'pending'
ORDER BY p.created_at DESC;

-- 2. Проверка покупок со статусом completed для coins_pack (должны быть обработаны)
SELECT 
  p.id,
  p.user_id,
  p.stripe_session_id,
  p.item_type,
  p.item_id,
  p.metadata,
  p.status,
  p.completed_at,
  pr.coins as current_coins,
  CASE 
    WHEN p.metadata->>'coins' IS NOT NULL 
    THEN (p.metadata->>'coins')::integer 
    ELSE 0 
  END as coins_should_be_added
FROM purchases p
LEFT JOIN profiles pr ON pr.id = p.user_id
WHERE p.item_type = 'coins_pack'
  AND p.status = 'completed'
ORDER BY p.completed_at DESC
LIMIT 10;

-- 3. Проверка транзакций для покупок монет
SELECT 
  t.id,
  t.user_id,
  t.transaction_type,
  t.amount,
  t.metadata->>'session_id' as session_id,
  t.created_at
FROM transactions t
WHERE t.transaction_type = 'coins_purchase_stripe'
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Ручная обработка конкретной покупки (замените SESSION_ID на реальный)
-- ВНИМАНИЕ: Используйте только если покупка точно оплачена в Stripe!
/*
DO $$
DECLARE
  v_user_id UUID;
  v_coins INTEGER;
  v_session_id TEXT := 'SESSION_ID_HERE'; -- Замените на реальный session_id
BEGIN
  -- Получаем данные покупки
  SELECT user_id, (metadata->>'coins')::integer
  INTO v_user_id, v_coins
  FROM purchases
  WHERE stripe_session_id = v_session_id
    AND item_type = 'coins_pack'
    AND status = 'pending';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Покупка не найдена или уже обработана';
  END IF;
  
  IF v_coins IS NULL OR v_coins <= 0 THEN
    RAISE EXCEPTION 'Неверное количество монет: %', v_coins;
  END IF;
  
  -- Начисляем монеты
  PERFORM increment_profile_value(v_user_id, 'coins', v_coins);
  
  -- Обновляем статус покупки
  UPDATE purchases
  SET status = 'completed',
      completed_at = NOW()
  WHERE stripe_session_id = v_session_id;
  
  -- Создаем транзакцию
  INSERT INTO transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    v_user_id,
    'coins_purchase_stripe',
    v_coins,
    jsonb_build_object('session_id', v_session_id, 'coins', v_coins, 'manual_fix', true)
  );
  
  RAISE NOTICE '✅ Начислено % монет пользователю %', v_coins, v_user_id;
END $$;
*/


