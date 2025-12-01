-- Create partner program system
-- Supports both barter (free keys) and revenue share (for future)

-- 1. Partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('barter', 'revenue_share')),
  commission_rate DECIMAL(5,2) DEFAULT 0.30, -- 30% commission (for future revenue share)
  promo_code TEXT UNIQUE, -- For future promo code system (e.g., 'MIGUEL20')
  discount_percent INTEGER, -- Discount for users (e.g., 20%)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  total_keys_issued INTEGER DEFAULT 0,
  total_keys_activated INTEGER DEFAULT 0,
  accumulated_commission DECIMAL(10,2) DEFAULT 0.00, -- For future payouts
  total_referrals INTEGER DEFAULT 0,
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Premium keys table (for barter program)
CREATE TABLE IF NOT EXISTS public.premium_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- Format: 'PREMIUM-XXXX-XXXX-XXXX'
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'activated', 'expired', 'revoked')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ, -- Optional expiration (e.g., 6 months)
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Partner referrals table (for future revenue share tracking)
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_id UUID, -- Link to purchases table (for future)
  promo_code TEXT, -- Promo code used (for future)
  purchase_amount DECIMAL(10,2), -- Amount of purchase
  discount_amount DECIMAL(10,2), -- Discount given to user
  commission_amount DECIMAL(10,2), -- Commission for partner
  commission_rate DECIMAL(5,2), -- Commission rate used
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_promo_code ON public.partners(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_premium_keys_partner_id ON public.premium_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_premium_keys_status ON public.premium_keys(status);
CREATE INDEX IF NOT EXISTS idx_premium_keys_key ON public.premium_keys(key);
CREATE INDEX IF NOT EXISTS idx_premium_keys_activated_by ON public.premium_keys(activated_by) WHERE activated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner_id ON public.partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_user_id ON public.partner_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_status ON public.partner_referrals(status);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partners (admin only)
CREATE POLICY "Admins can manage partners"
ON public.partners
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- RLS Policies for premium_keys
-- Users can view keys they activated
CREATE POLICY "Users can view their activated keys"
ON public.premium_keys
FOR SELECT
USING (
  activated_by = auth.uid()
);

-- Admins can manage all keys
CREATE POLICY "Admins can manage premium keys"
ON public.premium_keys
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- RLS Policies for partner_referrals
-- Users can view their own referrals
CREATE POLICY "Users can view their referrals"
ON public.partner_referrals
FOR SELECT
USING (
  user_id = auth.uid()
);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage partner referrals"
ON public.partner_referrals
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Function to generate premium key
CREATE OR REPLACE FUNCTION generate_premium_key()
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate key in format: PREMIUM-XXXX-XXXX-XXXX
    v_key := 'PREMIUM-' || 
             UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4)) || '-' ||
             UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 5 FOR 4)) || '-' ||
             UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 9 FOR 4));
    
    -- Check if key exists
    SELECT EXISTS(SELECT 1 FROM public.premium_keys WHERE key = v_key) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_key;
END;
$$ LANGUAGE plpgsql;

-- Function to activate premium key
CREATE OR REPLACE FUNCTION activate_premium_key(
  p_key TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_key_record RECORD;
  v_has_premium BOOLEAN;
BEGIN
  -- Find key
  SELECT * INTO v_key_record
  FROM public.premium_keys
  WHERE key = UPPER(p_key)
    AND status = 'issued';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Key not found or already used'::TEXT;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_key_record.expires_at IS NOT NULL AND v_key_record.expires_at < NOW() THEN
    UPDATE public.premium_keys
    SET status = 'expired'
    WHERE id = v_key_record.id;
    
    RETURN QUERY SELECT false, 'Key has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user already has Premium Forever
  SELECT 
    premium_forever_purchased_at IS NOT NULL
    AND subscription_type = 'lifetime'
    AND subscription_status = 'pro'
  INTO v_has_premium
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_has_premium THEN
    RETURN QUERY SELECT false, 'You already have Premium Forever'::TEXT;
    RETURN;
  END IF;
  
  -- Activate Premium Forever for user
  UPDATE public.profiles
  SET 
    subscription_type = 'lifetime',
    subscription_status = 'pro',
    premium_forever_purchased_at = NOW()
  WHERE id = p_user_id;
  
  -- Update key status
  UPDATE public.premium_keys
  SET 
    status = 'activated',
    activated_at = NOW(),
    activated_by = p_user_id
  WHERE id = v_key_record.id;
  
  -- Update partner stats if key was issued by partner
  IF v_key_record.partner_id IS NOT NULL THEN
    UPDATE public.partners
    SET 
      total_keys_activated = total_keys_activated + 1,
      updated_at = NOW()
    WHERE id = v_key_record.partner_id;
  END IF;
  
  RETURN QUERY SELECT true, 'Premium Forever activated successfully!'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to issue keys to partner
CREATE OR REPLACE FUNCTION issue_premium_keys_to_partner(
  p_partner_id UUID,
  p_quantity INTEGER,
  p_expires_months INTEGER DEFAULT 6
)
RETURNS TABLE(
  keys_issued TEXT[]
) AS $$
DECLARE
  v_key TEXT;
  v_keys TEXT[] := ARRAY[]::TEXT[];
  i INTEGER;
BEGIN
  FOR i IN 1..p_quantity LOOP
    -- Generate key
    v_key := generate_premium_key();
    
    -- Insert key
    INSERT INTO public.premium_keys (
      key,
      partner_id,
      expires_at
    ) VALUES (
      v_key,
      p_partner_id,
      CASE 
        WHEN p_expires_months > 0 THEN NOW() + (p_expires_months || ' months')::INTERVAL
        ELSE NULL
      END
    );
    
    -- Add to array
    v_keys := array_append(v_keys, v_key);
  END LOOP;
  
  -- Update partner stats
  UPDATE public.partners
  SET 
    total_keys_issued = total_keys_issued + p_quantity,
    updated_at = NOW()
  WHERE id = p_partner_id;
  
  RETURN QUERY SELECT v_keys;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.partners IS 'Partners for barter and revenue share programs';
COMMENT ON TABLE public.premium_keys IS 'Premium Forever activation keys for barter program';
COMMENT ON TABLE public.partner_referrals IS 'Tracks partner referrals and commissions (for future revenue share)';
COMMENT ON FUNCTION generate_premium_key IS 'Generates unique premium activation key';
COMMENT ON FUNCTION activate_premium_key IS 'Activates premium key for user';
COMMENT ON FUNCTION issue_premium_keys_to_partner IS 'Issues multiple premium keys to partner';
