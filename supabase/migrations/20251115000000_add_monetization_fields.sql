-- Add monetization fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS duel_pass_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duel_pass_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_pass_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duel_pass_season INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS equipped_avatar TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS assistant_mood TEXT NOT NULL DEFAULT 'happy',
  ADD COLUMN IF NOT EXISTS assistant_last_interaction TIMESTAMPTZ NOT NULL DEFAULT now();

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_premium_until ON public.profiles(premium_until);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_until ON public.profiles(trial_until);
CREATE INDEX IF NOT EXISTS idx_profiles_duel_pass_level ON public.profiles(duel_pass_level);


