-- Create transactions table for monetization events
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'coins_purchase_stripe',
    'coins_earned_test',
    'coins_earned_duel',
    'coins_earned_daily',
    'coins_earned_premium_bonus',
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
  )),
  amount INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);


