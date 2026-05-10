-- Creates grant_premium_access and add_coins RPCs called by paddle-webhook.
-- Both functions were referenced but never defined in migrations.

-- Sets ALL premium fields consistently so every part of the system agrees:
--   subscription_status + subscription_expires_at  → dashboard RPC, test limits
--   premium_until                                  → premium-status Edge Function
--   is_premium                                     → is_user_premium_for_limits
CREATE OR REPLACE FUNCTION public.grant_premium_access(p_user_id UUID, p_days INTEGER)
RETURNS VOID AS $$
DECLARE
  v_base TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
BEGIN
  -- Extend from current expiry if user is already premium, otherwise from now
  SELECT GREATEST(
    COALESCE(premium_until, NOW()),
    COALESCE(subscription_expires_at, NOW()),
    NOW()
  ) INTO v_base
  FROM profiles WHERE id = p_user_id;

  v_new_until := v_base + (p_days || ' days')::INTERVAL;

  UPDATE profiles SET
    subscription_status    = 'active',
    subscription_expires_at = v_new_until,
    is_premium             = true,
    premium_until          = v_new_until,
    trial_until            = NULL   -- clear any pending trial when paid
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomically adds coins to a user's wallet
CREATE OR REPLACE FUNCTION public.add_coins(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET coins = COALESCE(coins, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
