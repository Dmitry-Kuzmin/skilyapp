-- Add win_streak field to profiles table for anti-farming protection
-- This field tracks consecutive wins against bots to adjust bot difficulty dynamically

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS win_streak INTEGER NOT NULL DEFAULT 0 CHECK (win_streak >= 0);

-- Create index for faster lookups when matching players
CREATE INDEX IF NOT EXISTS idx_profiles_win_streak ON public.profiles(win_streak) WHERE win_streak > 0;

COMMENT ON COLUMN public.profiles.win_streak IS 'Tracks consecutive wins against bots. Used to adjust bot difficulty dynamically to prevent farming. Resets to 0 on loss.';

