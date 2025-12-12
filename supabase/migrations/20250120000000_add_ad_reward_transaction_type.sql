-- Добавляем новый тип транзакции для наград за просмотр рекламы
-- Это позволяет отслеживать просмотры рекламы и начислять награды

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'coins_purchase_stripe',
      'coins_earned_test',
      'coins_earned_duel',
      'coins_earned_daily',
      'coins_earned_premium_bonus',
      'coins_earned_ad', -- НОВЫЙ: награда за просмотр рекламы
      'coins_spent_boost',
      'coins_spent_skin',
      'coins_spent_duel_entry',
      'premium_purchase_monthly',
      'premium_purchase_yearly',
      'premium_trial_started',
      'premium_trial_expired',
      'duel_pass_purchase',
      'admin_adjust',
      'refund'
    )
  );

-- Обновляем RPC функцию create_transaction для поддержки нового типа
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount INTEGER,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Validate transaction type
  IF p_transaction_type NOT IN (
    'coins_purchase_stripe',
    'coins_earned_test',
    'coins_earned_duel',
    'coins_earned_daily',
    'coins_earned_premium_bonus',
    'coins_earned_ad', -- НОВЫЙ тип
    'coins_spent_boost',
    'coins_spent_skin',
    'coins_spent_duel_entry',
    'premium_purchase_monthly',
    'premium_purchase_yearly',
    'premium_trial_started',
    'premium_trial_expired',
    'duel_pass_purchase',
    'admin_adjust',
    'refund'
  ) THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert transaction
  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    metadata,
    created_at
  )
  VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

