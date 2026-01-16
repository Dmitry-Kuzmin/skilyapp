-- Fix ambiguous column reference in create_referral function
-- This fixes the "column reference 'referrer_id' is ambiguous" error

DROP FUNCTION IF EXISTS create_referral(TEXT, UUID);

CREATE OR REPLACE FUNCTION create_referral(
  p_referrer_code TEXT,
  p_referred_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  referrer_id UUID,
  referred_bonus INTEGER,
  message TEXT
) AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_bonus INTEGER := 50;
  v_referral_id UUID;
BEGIN
  -- Find referrer by code
  SELECT p.id INTO v_referrer_id
  FROM profiles p
  WHERE p.referral_code = UPPER(p_referrer_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Referral code not found';
    RETURN;
  END IF;
  
  -- Check if trying to refer self
  IF v_referrer_id = p_referred_id THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Cannot refer yourself';
    RETURN;
  END IF;
  
  -- Check if already referred by someone
  IF EXISTS(SELECT 1 FROM profiles p WHERE p.id = p_referred_id AND p.referred_by IS NOT NULL) THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Already referred by someone';
    RETURN;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referred_bonus)
  VALUES (v_referrer_id, p_referred_id, v_referred_bonus)
  ON CONFLICT (referrer_id, referred_id) DO NOTHING
  RETURNING id INTO v_referral_id;
  
  IF v_referral_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Referral already exists';
    RETURN;
  END IF;
  
  -- Update referred user
  UPDATE profiles
  SET referred_by = v_referrer_id,
      coins = coins + v_referred_bonus
  WHERE id = p_referred_id;
  
  RETURN QUERY SELECT true, v_referrer_id, v_referred_bonus, 'Referral created successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_referral IS 'Creates referral relationship and awards welcome bonus to referred user';

