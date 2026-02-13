-- Добавляем новый тип транзакции для наград за просмотр рекламы
-- Это позволяет отслеживать просмотры рекламы и начислять награды
-- Также добавляем поддержку Paddle покупок

-- КРИТИЧНО: Сначала проверяем и исправляем существующие записи с невалидными типами
-- Это защищает от ошибки "check constraint is violated by some row"
DO $$
DECLARE
  invalid_type TEXT;
BEGIN
  -- Находим невалидные типы транзакций (если есть)
  FOR invalid_type IN 
    SELECT DISTINCT transaction_type 
    FROM public.transactions 
    WHERE transaction_type NOT IN (
      'coins_purchase_paddle', -- Paddle платежи
      'coins_purchase_cryptomus', -- Cryptomus платежи (криптовалюты)
      'coins_purchase_telegram_stars', -- Telegram Stars платежи
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
  LOOP
    RAISE WARNING 'Found invalid transaction type: %. Converting to admin_adjust.', invalid_type;
    -- Конвертируем невалидные типы в admin_adjust для сохранения данных
    UPDATE public.transactions 
    SET transaction_type = 'admin_adjust',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('original_type', invalid_type, 'migrated_at', NOW())
    WHERE transaction_type = invalid_type;
  END LOOP;
END $$;

-- Теперь безопасно обновляем constraint
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'coins_purchase_paddle', -- Paddle платежи
      'coins_purchase_cryptomus', -- Cryptomus платежи (криптовалюты)
      'coins_purchase_telegram_stars', -- Telegram Stars платежи
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

-- УПРОЩЕННАЯ функция create_transaction (без дублирования проверки)
-- Проверка типа теперь выполняется только на уровне CHECK constraint
-- Это устраняет дублирование и делает код проще
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
  -- Проверяем существование пользователя
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Валидация типа транзакции выполняется автоматически через CHECK constraint
  -- Если тип невалидный, INSERT упадет с понятной ошибкой
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

-- Grant permissions (если еще не выданы)
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, INTEGER, JSONB) TO anon;

