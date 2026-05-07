-- Fix: is_user_premium_for_limits referenced non-existent column `subscription_end_date`
-- The actual column in profiles is `subscription_expires_at`

CREATE OR REPLACE FUNCTION is_user_premium_for_limits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_status TEXT;
  v_end_date TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(is_premium, FALSE),
    subscription_status,
    subscription_expires_at
  INTO v_is_premium, v_status, v_end_date
  FROM profiles WHERE id = p_user_id;

  IF v_is_premium THEN
    RETURN TRUE;
  END IF;

  IF v_status IN ('trial', 'pro', 'lifetime') THEN
    IF v_status = 'lifetime' THEN
      RETURN TRUE;
    END IF;
    IF v_end_date IS NULL OR v_end_date > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
