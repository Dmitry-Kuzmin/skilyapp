-- Final fix: rename return column to avoid ambiguity
-- The issue is that RETURNS TABLE has a column named "referrer_id"
-- which conflicts with the "referrer_id" column in the referrals table

DROP FUNCTION IF EXISTS create_referral(TEXT, UUID);

CREATE OR REPLACE FUNCTION create_referral(
  p_referrer_code TEXT,
  p_referred_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  result_referrer_id UUID,  -- Renamed to avoid ambiguity
  referred_bonus INTEGER,
  message TEXT
) AS $$
DECLARE
  v_referrer_profile_id UUID;
  v_referred_bonus INTEGER := 50;
  v_new_referral_id UUID;
  v_existing_referrer UUID;
BEGIN
  -- Step 1: Find referrer's profile ID by their referral code
  SELECT profiles.id 
  INTO v_referrer_profile_id
  FROM profiles
  WHERE profiles.referral_code = UPPER(p_referrer_code)
  LIMIT 1;
  
  IF v_referrer_profile_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Referral code not found'::TEXT;
    RETURN;
  END IF;
  
  -- Step 2: Check if trying to refer self
  IF v_referrer_profile_id = p_referred_id THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Cannot refer yourself'::TEXT;
    RETURN;
  END IF;
  
  -- Step 3: Check if already referred by someone
  SELECT profiles.referred_by 
  INTO v_existing_referrer
  FROM profiles
  WHERE profiles.id = p_referred_id;
  
  IF v_existing_referrer IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Already referred by someone'::TEXT;
    RETURN;
  END IF;
  
  -- Step 4: Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referred_bonus)
  VALUES (v_referrer_profile_id, p_referred_id, v_referred_bonus)
  ON CONFLICT (referrer_id, referred_id) DO NOTHING
  RETURNING referrals.id INTO v_new_referral_id;
  
  IF v_new_referral_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Referral already exists'::TEXT;
    RETURN;
  END IF;
  
  -- Step 5: Update referred user's profile
  UPDATE profiles
  SET 
    referred_by = v_referrer_profile_id,
    coins = profiles.coins + v_referred_bonus
  WHERE profiles.id = p_referred_id;
  
  -- Step 6: Return success
  RETURN QUERY SELECT true, v_referrer_profile_id, v_referred_bonus, 'Referral created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_referral IS 'Creates referral relationship and awards welcome bonus to referred user';

