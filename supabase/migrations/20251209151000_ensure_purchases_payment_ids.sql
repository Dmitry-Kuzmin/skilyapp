-- Ensure purchases table has external payment identifiers (idempotent)
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS cryptomus_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cryptomus_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_purchases_cryptomus_order_id
  ON public.purchases(cryptomus_order_id);

CREATE INDEX IF NOT EXISTS idx_purchases_paddle_transaction_id
  ON public.purchases(paddle_transaction_id);

CREATE INDEX IF NOT EXISTS idx_purchases_paddle_subscription_id
  ON public.purchases(paddle_subscription_id);

COMMENT ON COLUMN public.purchases.cryptomus_order_id IS 'Order ID из Cryptomus';
COMMENT ON COLUMN public.purchases.cryptomus_payment_id IS 'Payment ID из Cryptomus';
COMMENT ON COLUMN public.purchases.paddle_transaction_id IS 'Transaction ID из Paddle';
COMMENT ON COLUMN public.purchases.paddle_subscription_id IS 'Subscription ID из Paddle (для подписок)';

