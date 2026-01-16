-- ============================================
-- Применить миграции монетизации вручную
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- 1. Добавить поля монетизации в profiles
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

-- Индексы для profiles
CREATE INDEX IF NOT EXISTS idx_profiles_premium_until ON public.profiles(premium_until);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_until ON public.profiles(trial_until);
CREATE INDEX IF NOT EXISTS idx_profiles_duel_pass_level ON public.profiles(duel_pass_level);

-- 2. Создать таблицу transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = transactions.user_id));

-- 3. Создать таблицу purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('premium', 'duel_pass', 'coins_pack')),
  item_id TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session_id ON public.purchases(stripe_session_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
ON public.purchases FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = purchases.user_id));

-- 4. Создать таблицу stripe_events
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON public.stripe_events(stripe_event_id);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can view stripe events"
ON public.stripe_events FOR SELECT
USING (false);

CREATE POLICY "Only service role can insert stripe events"
ON public.stripe_events FOR INSERT
WITH CHECK (false);

-- 5. Создать таблицу duel_pass_rewards с данными
CREATE TABLE IF NOT EXISTS public.duel_pass_rewards (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 10),
  xp_required INTEGER NOT NULL,
  free_reward JSONB NOT NULL,
  premium_reward JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.duel_pass_rewards (level, xp_required, free_reward, premium_reward) VALUES
  (1, 200,  '{"type":"coins","amount":50}',   '{"type":"coins","amount":150}'),
  (2, 250,  '{"type":"skin","id":"avatar_basic"}', '{"type":"skin","id":"avatar_epic"}'),
  (3, 250,  '{"type":"coins","amount":75}',   '{"type":"coins","amount":200}'),
  (4, 300,  '{"type":"skin","id":"frame_1"}', '{"type":"skin","id":"frame_epic"}'),
  (5, 300,  '{"type":"coins","amount":100}',  '{"type":"coins","amount":300}'),
  (6, 350,  '{"type":"coins","amount":150}',  '{"type":"coins","amount":400}'),
  (7, 400,  '{"type":"skin","id":"badge_rare"}', '{"type":"skin","id":"badge_epic"}'),
  (8, 400,  '{"type":"coins","amount":200}',  '{"type":"coins","amount":500}'),
  (9, 450,  '{"type":"skin","id":"effect_basic"}', '{"type":"skin","id":"effect_legendary"}'),
  (10, 500, '{"type":"coins","amount":500}',  '{"type":"coins","amount":2000,"skin":"final_reward"}')
ON CONFLICT (level) DO UPDATE
SET xp_required = EXCLUDED.xp_required,
    free_reward = EXCLUDED.free_reward,
    premium_reward = EXCLUDED.premium_reward;

-- 6. Создать таблицу user_claimed_rewards
CREATE TABLE IF NOT EXISTS public.user_claimed_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season, level, is_premium)
);

CREATE INDEX IF NOT EXISTS idx_user_claimed_rewards_user_id ON public.user_claimed_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_claimed_rewards_season ON public.user_claimed_rewards(season);

ALTER TABLE public.user_claimed_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claimed rewards"
ON public.user_claimed_rewards FOR SELECT
USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = user_claimed_rewards.user_id));

CREATE POLICY "Users can insert their own claimed rewards"
ON public.user_claimed_rewards FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = user_claimed_rewards.user_id));

-- Пометить миграции как применённые (опционально, если нужно)
-- INSERT INTO supabase_migrations.schema_migrations(version, name) VALUES
--   ('20251115000000', 'add_monetization_fields'),
--   ('20251115000001', 'create_transactions'),
--   ('20251115000002', 'create_purchases'),
--   ('20251115000003', 'create_stripe_events'),
--   ('20251115000004', 'create_duel_pass_rewards'),
--   ('20251115000005', 'create_user_claimed_rewards')
-- ON CONFLICT (version) DO NOTHING;



