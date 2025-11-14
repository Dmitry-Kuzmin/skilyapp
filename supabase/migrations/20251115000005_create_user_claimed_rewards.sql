-- Create user_claimed_rewards table
CREATE TABLE IF NOT EXISTS public.user_claimed_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, season, level, is_premium)
);

CREATE INDEX IF NOT EXISTS idx_user_claimed_rewards_user_season
  ON public.user_claimed_rewards(user_id, season);

ALTER TABLE public.user_claimed_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claimed rewards"
  ON public.user_claimed_rewards
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ));

CREATE POLICY "Service role can insert claimed rewards"
  ON public.user_claimed_rewards
  FOR INSERT
  WITH CHECK (true);


