-- Create purchases table for Stripe checkout sessions
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('premium', 'duel_pass', 'coins_pack')),
  item_id TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.purchases
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can insert purchases"
  ON public.purchases
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update purchases"
  ON public.purchases
  FOR UPDATE
  USING (true);


