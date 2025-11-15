ALTER TABLE public.duel_transactions
  DROP CONSTRAINT IF EXISTS duel_transactions_transaction_type_check;

ALTER TABLE public.duel_transactions
  ADD CONSTRAINT duel_transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'bet',
      'win',
      'refund',
      'commission',
      'rematch_carry',
      'insurance_premium',
      'insurance_refund'
    )
  );

