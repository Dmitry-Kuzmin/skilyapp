-- Add partner links system (instead of keys)
-- Partners get unique codes and links, users get Premium for 1 month automatically

-- 1. Add partner_code to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS partner_code TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_partners_partner_code ON public.partners(partner_code) WHERE partner_code IS NOT NULL;

-- Generate partner codes for existing partners (if they don't have one)
DO $$
DECLARE
  partner_record RECORD;
  new_code TEXT;
BEGIN
  FOR partner_record IN SELECT id, name FROM public.partners WHERE partner_code IS NULL
  LOOP
    -- Generate code from name (first 6 uppercase letters, remove spaces/special chars)
    new_code := UPPER(REGEXP_REPLACE(SUBSTRING(partner_record.name FROM 1 FOR 6), '[^A-Z0-9]', '', 'g'));
    
    -- If code is too short or empty, use ID prefix
    IF LENGTH(new_code) < 3 THEN
      new_code := UPPER(SUBSTRING(partner_record.id::TEXT FROM 1 FOR 6));
    END IF;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.partners WHERE partner_code = new_code) LOOP
      new_code := new_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 2));
    END LOOP;
    
    UPDATE public.partners 
    SET partner_code = new_code 
    WHERE id = partner_record.id;
  END LOOP;
END $$;

-- 2. Create table for tracking partner link activations
CREATE TABLE IF NOT EXISTS public.partner_link_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL, -- For quick lookups
  utm_source TEXT, -- UTM tracking
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address INET, -- For fraud detection
  user_agent TEXT, -- For fraud detection
  premium_until TIMESTAMPTZ NOT NULL, -- Premium until this date
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, user_id) -- One user = one activation per partner
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_link_activations_partner_id ON public.partner_link_activations(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_link_activations_user_id ON public.partner_link_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_link_activations_partner_code ON public.partner_link_activations(partner_code);
CREATE INDEX IF NOT EXISTS idx_partner_link_activations_activated_at ON public.partner_link_activations(activated_at);

-- Enable RLS
ALTER TABLE public.partner_link_activations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Partners can view their own activations
CREATE POLICY "Partners can view their activations"
ON public.partner_link_activations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_link_activations.partner_id
    AND partners.user_id = auth.uid()
  )
);

-- Admins can view all activations
CREATE POLICY "Admins can view all activations"
ON public.partner_link_activations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3. Add fields to partners for tracking
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS total_link_activations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_activation_limit INTEGER DEFAULT 50, -- Limit activations per month
ADD COLUMN IF NOT EXISTS daily_activation_limit INTEGER DEFAULT 10, -- Limit activations per day
ADD COLUMN IF NOT EXISTS webhook_url TEXT; -- Webhook URL for notifications

-- 4. Function to activate Premium via partner link
CREATE OR REPLACE FUNCTION activate_partner_premium(
  p_partner_code TEXT,
  p_user_id UUID,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  premium_until TIMESTAMPTZ
) AS $$
DECLARE
  v_partner_id UUID;
  v_partner_record RECORD;
  v_existing_activation RECORD;
  v_premium_until TIMESTAMPTZ;
  v_monthly_count INTEGER;
  v_daily_count INTEGER;
  v_user_profile RECORD;
BEGIN
  -- Find partner by code
  SELECT id, monthly_activation_limit, daily_activation_limit, status, registration_status
  INTO v_partner_record
  FROM public.partners
  WHERE partner_code = UPPER(p_partner_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partner not found'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_partner_id := v_partner_record.id;

  -- Check if partner is approved and active
  IF v_partner_record.registration_status != 'approved' OR v_partner_record.status != 'active' THEN
    RETURN QUERY SELECT false, 'Partner is not active'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Check if user already activated this partner's link
  SELECT * INTO v_existing_activation
  FROM public.partner_link_activations
  WHERE partner_id = v_partner_id AND user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'You have already activated Premium from this partner'::TEXT, v_existing_activation.premium_until;
    RETURN;
  END IF;

  -- Check monthly limit
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.partner_link_activations
  WHERE partner_id = v_partner_id
  AND activated_at >= DATE_TRUNC('month', NOW());

  IF v_monthly_count >= COALESCE(v_partner_record.monthly_activation_limit, 50) THEN
    RETURN QUERY SELECT false, 'Monthly activation limit reached for this partner'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Check daily limit
  SELECT COUNT(*) INTO v_daily_count
  FROM public.partner_link_activations
  WHERE partner_id = v_partner_id
  AND activated_at >= DATE_TRUNC('day', NOW());

  IF v_daily_count >= COALESCE(v_partner_record.daily_activation_limit, 10) THEN
    RETURN QUERY SELECT false, 'Daily activation limit reached for this partner'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Get user profile to check existing premium
  SELECT id, premium_until INTO v_user_profile
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User not found'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Calculate premium_until (30 days from now, or extend if already has premium)
  IF v_user_profile.premium_until IS NOT NULL AND v_user_profile.premium_until > NOW() THEN
    -- Extend existing premium
    v_premium_until := v_user_profile.premium_until + INTERVAL '30 days';
  ELSE
    -- Start new premium
    v_premium_until := NOW() + INTERVAL '30 days';
  END IF;

  -- Create activation record
  INSERT INTO public.partner_link_activations (
    partner_id,
    user_id,
    partner_code,
    utm_source,
    utm_medium,
    utm_campaign,
    ip_address,
    user_agent,
    premium_until
  ) VALUES (
    v_partner_id,
    p_user_id,
    UPPER(p_partner_code),
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_ip_address,
    p_user_agent,
    v_premium_until
  );

  -- Update user's premium_until
  UPDATE public.profiles
  SET premium_until = v_premium_until,
      subscription_status = 'pro',
      subscription_type = 'premium',
      duel_pass_premium = true
  WHERE id = p_user_id;

  -- Update partner statistics
  UPDATE public.partners
  SET total_link_activations = COALESCE(total_link_activations, 0) + 1,
      total_referrals = COALESCE(total_referrals, 0) + 1
  WHERE id = v_partner_id;

  RETURN QUERY SELECT true, 'Premium activated successfully for 30 days'::TEXT, v_premium_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_partner_premium IS 'Activates Premium for 30 days when user registers via partner link. Includes fraud protection with daily/monthly limits.';

-- 5. Function to get partner link stats
CREATE OR REPLACE FUNCTION get_partner_link_stats(p_partner_id UUID)
RETURNS TABLE(
  total_activations BIGINT,
  monthly_activations BIGINT,
  daily_activations BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_activations,
    COUNT(*) FILTER (WHERE activated_at >= DATE_TRUNC('month', NOW()))::BIGINT as monthly_activations,
    COUNT(*) FILTER (WHERE activated_at >= DATE_TRUNC('day', NOW()))::BIGINT as daily_activations,
    COUNT(DISTINCT user_id)::BIGINT as unique_users
  FROM public.partner_link_activations
  WHERE partner_id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

