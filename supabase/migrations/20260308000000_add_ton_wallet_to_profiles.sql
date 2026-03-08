-- Add TON wallet address to profiles for TON Foundation integration (2026 stack)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ton_wallet_address TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_ton_wallet ON public.profiles(ton_wallet_address);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.ton_wallet_address IS 'User TON wallet address connected via TON Connect';
