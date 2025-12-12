-- Удаление типа транзакции coins_purchase_stripe
-- Stripe больше не используется, заменен на Paddle

-- Сначала конвертируем существующие Stripe транзакции в Paddle
UPDATE public.transactions
SET transaction_type = 'coins_purchase_paddle',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'original_type', 'coins_purchase_stripe',
      'migrated_at', NOW(),
      'migration_note', 'Migrated from Stripe to Paddle'
    )
WHERE transaction_type = 'coins_purchase_stripe';

-- Теперь обновляем constraint (уже сделано в предыдущей миграции, но на всякий случай)
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'coins_purchase_paddle', -- Paddle платежи (единственный метод покупки монет)
      'coins_earned_test',
      'coins_earned_duel',
      'coins_earned_daily',
      'coins_earned_premium_bonus',
      'coins_earned_ad',
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

