-- Add server-side flag to prevent abuse of the +100 coins demo signup bonus.
-- Without this column anyone could Nuclear-Reset localStorage and re-claim
-- the bonus on the same profile by going through the demo CTA again.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS demo_bonus_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.demo_bonus_claimed_at IS
  'When the user claimed the +100 coins demo signup bonus. NULL = not claimed yet.';

-- Add coins_earned_signup_bonus to the allowed transaction types.
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
  IF p_transaction_type NOT IN (
    'coins_purchase_stripe',
    'coins_earned_test',
    'coins_earned_duel',
    'coins_earned_daily',
    'coins_earned_premium_bonus',
    'coins_earned_signup_bonus',
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

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  INSERT INTO transactions (user_id, transaction_type, amount, metadata, created_at)
  VALUES (p_user_id, p_transaction_type, p_amount, p_metadata, NOW())
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, INTEGER, JSONB) TO anon;
