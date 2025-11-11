-- Add referral system
-- Allows users to invite friends and earn rewards

-- Add referral columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_reward_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0 CHECK (total_referrals >= 0);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_given BOOLEAN DEFAULT false,
  referred_earned_50 BOOLEAN DEFAULT false,
  referral_bonus INTEGER DEFAULT 100,
  referred_bonus INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_given_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id),
  CHECK(referrer_id != referred_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending_rewards ON public.referrals(reward_given) WHERE reward_given = false;

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view referrals they're involved in
CREATE POLICY "Users can view their referrals"
ON public.referrals
FOR SELECT
USING (
  referrer_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
       OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
  OR
  referred_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
       OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policy: Service can insert referrals
CREATE POLICY "Service can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Service can update referrals
CREATE POLICY "Service can update referrals"
ON public.referrals
FOR UPDATE
USING (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character code (A-Z0-9)
    v_code := UPPER(
      substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)
    );
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to check referral milestone and award bonus
CREATE OR REPLACE FUNCTION check_referral_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_record RECORD;
BEGIN
  -- Check if coins crossed 50 threshold (old < 50, new >= 50)
  IF NEW.coins >= 50 AND OLD.coins < 50 THEN
    -- Find referral record for this user
    SELECT * INTO v_referral_record
    FROM referrals
    WHERE referred_id = NEW.id 
      AND reward_given = false
      AND referred_earned_50 = false;
    
    IF FOUND THEN
      -- Mark that referred user earned 50
      UPDATE referrals 
      SET referred_earned_50 = true,
          reward_given = true,
          reward_given_at = NOW()
      WHERE id = v_referral_record.id;
      
      -- Award bonus to referrer (+100 coins)
      UPDATE profiles 
      SET coins = coins + v_referral_record.referral_bonus,
          total_referrals = total_referrals + 1
      WHERE id = v_referral_record.referrer_id;
      
      RAISE NOTICE 'Referral bonus awarded: referrer_id=%, amount=%', 
        v_referral_record.referrer_id, v_referral_record.referral_bonus;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles coins update
DROP TRIGGER IF EXISTS on_coins_update_check_referral ON public.profiles;
CREATE TRIGGER on_coins_update_check_referral
  AFTER UPDATE OF coins ON public.profiles
  FOR EACH ROW
  WHEN (NEW.coins >= 50 AND OLD.coins < 50)
  EXECUTE FUNCTION check_referral_milestone();

-- Function to create referral relationship
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
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = UPPER(p_referrer_code);
  
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
  IF EXISTS(SELECT 1 FROM profiles WHERE id = p_referred_id AND referred_by IS NOT NULL) THEN
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

-- Function to generate referral code for existing users without one
CREATE OR REPLACE FUNCTION ensure_referral_codes()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET referral_code = generate_referral_code()
  WHERE referral_code IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Generate codes for existing users
SELECT ensure_referral_codes();

-- Comment on functions
COMMENT ON FUNCTION generate_referral_code IS 'Generates a unique 6-character referral code';
COMMENT ON FUNCTION check_referral_milestone IS 'Checks if referred user earned 50 coins and awards bonus to referrer';
COMMENT ON FUNCTION create_referral IS 'Creates referral relationship and awards welcome bonus to referred user';

