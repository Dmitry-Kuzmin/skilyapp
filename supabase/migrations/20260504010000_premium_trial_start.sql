-- 3-day premium trial: tools unlocked but question pool stays at 300

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_started_at ON profiles(trial_started_at)
  WHERE trial_started_at IS NOT NULL;

-- Запуск trial: один раз на профиль, если ещё не использовался
CREATE OR REPLACE FUNCTION start_premium_trial(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, trial_until TIMESTAMPTZ, reason TEXT) AS $$
DECLARE
  v_existing_trial_started TIMESTAMPTZ;
  v_premium_until TIMESTAMPTZ;
  v_lifetime TIMESTAMPTZ;
  v_subscription_status TEXT;
  v_new_trial_until TIMESTAMPTZ;
  v_trial_days INTEGER := 3;
BEGIN
  SELECT
    profiles.trial_started_at,
    profiles.premium_until,
    profiles.premium_forever_purchased_at,
    profiles.subscription_status
  INTO
    v_existing_trial_started,
    v_premium_until,
    v_lifetime,
    v_subscription_status
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 'profile_not_found'::TEXT;
    RETURN;
  END IF;

  IF v_lifetime IS NOT NULL OR v_subscription_status = 'lifetime' THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 'already_lifetime'::TEXT;
    RETURN;
  END IF;

  IF v_premium_until IS NOT NULL AND v_premium_until > NOW() THEN
    RETURN QUERY SELECT FALSE, v_premium_until, 'already_premium'::TEXT;
    RETURN;
  END IF;

  IF v_existing_trial_started IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 'trial_already_used'::TEXT;
    RETURN;
  END IF;

  v_new_trial_until := NOW() + (v_trial_days || ' days')::INTERVAL;

  UPDATE profiles
  SET
    trial_started_at = NOW(),
    trial_until = v_new_trial_until,
    subscription_status = 'trial',
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_new_trial_until, 'ok'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_premium_trial(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION start_premium_trial IS 'Starts a 3-day premium trial. Idempotent: returns existing state if already used.';
