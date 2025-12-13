-- Добавляем тип транзакции 'ad_watched' для фиксации просмотра рекламы без начисления монет
-- Используется для slot_unlock (OVERCLOCKING) - временная разблокировка слота

-- Безопасное обновление constraint с проверкой существующих записей
DO $$
DECLARE
  invalid_type TEXT;
BEGIN
  -- Находим невалидные типы транзакций (если есть)
  FOR invalid_type IN 
    SELECT DISTINCT transaction_type 
    FROM public.transactions 
    WHERE transaction_type NOT IN (
      'coins_purchase_paddle',
      'coins_purchase_cryptomus',
      'coins_purchase_telegram_stars',
      'coins_earned_test',
      'coins_earned_duel',
      'coins_earned_daily',
      'coins_earned_premium_bonus',
      'coins_earned_ad',
      'ad_watched', -- НОВЫЙ: фиксация просмотра рекламы без монет (для slot_unlock)
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

-- Обновляем constraint
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'coins_purchase_paddle',
      'coins_purchase_cryptomus',
      'coins_purchase_telegram_stars',
      'coins_earned_test',
      'coins_earned_duel',
      'coins_earned_daily',
      'coins_earned_premium_bonus',
      'coins_earned_ad',
      'ad_watched', -- Фиксация просмотра рекламы без монет (для slot_unlock)
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

