-- =====================================================
-- Self-registration for bloggers (auto-approved)
-- Used from the public /partners page — minimal form
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_register_blogger(
  p_name       TEXT,
  p_platforms  TEXT[]   -- e.g. ARRAY['telegram','instagram','youtube']
)
RETURNS TABLE(
  success      BOOLEAN,
  partner_code TEXT,
  message      TEXT
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_code       TEXT;
  v_partner_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Необходимо войти в систему'::TEXT;
    RETURN;
  END IF;

  -- Already a partner? Return existing code.
  SELECT partner_code INTO v_code
  FROM public.partners
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    RETURN QUERY SELECT true, v_code, 'already_partner'::TEXT;
    RETURN;
  END IF;

  -- If partner row exists but no code yet (pending), just approve it
  IF EXISTS (SELECT 1 FROM public.partners WHERE user_id = v_user_id) THEN
    v_code := UPPER(REGEXP_REPLACE(SUBSTRING(p_name FROM 1 FOR 6), '[^A-Z0-9]', '', 'gi'));
    IF LENGTH(v_code) < 3 THEN
      v_code := UPPER(SUBSTRING(v_user_id::TEXT FROM 1 FOR 6));
    END IF;
    WHILE EXISTS (SELECT 1 FROM public.partners pr WHERE pr.partner_code = v_code) LOOP
      v_code := v_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 2));
    END LOOP;

    UPDATE public.partners
    SET
      registration_status = 'approved',
      status              = 'active',
      partner_code        = v_code,
      partner_type        = 'revenue_share',
      commission_rate     = 0.30,
      promo_code          = v_code,
      promo_code_discount = 15,
      promo_code_commission = 0.20,
      social_links        = to_jsonb(p_platforms),
      updated_at          = now()
    WHERE user_id = v_user_id
    RETURNING id INTO v_partner_id;

    RETURN QUERY SELECT true, v_code, 'approved'::TEXT;
    RETURN;
  END IF;

  -- Generate unique partner code from name
  v_code := UPPER(REGEXP_REPLACE(SUBSTRING(p_name FROM 1 FOR 6), '[^A-Z0-9]', '', 'gi'));
  IF LENGTH(v_code) < 3 THEN
    v_code := UPPER(SUBSTRING(v_user_id::TEXT FROM 1 FOR 6));
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.partners WHERE partner_code = v_code) LOOP
    v_code := v_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 2));
  END LOOP;

  -- Create partner record — immediately approved
  INSERT INTO public.partners (
    user_id,
    name,
    partner_code,
    partner_type,
    status,
    registration_status,
    commission_rate,
    promo_code,
    promo_code_discount,
    promo_code_commission,
    social_links,
    is_partner_premium
  ) VALUES (
    v_user_id,
    p_name,
    v_code,
    'revenue_share',
    'active',
    'approved',
    0.30,
    v_code,
    15,
    0.20,
    to_jsonb(p_platforms),
    true
  )
  RETURNING id INTO v_partner_id;

  RETURN QUERY SELECT true, v_code, 'registered'::TEXT;
END;
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION public.self_register_blogger(TEXT, TEXT[]) TO authenticated;
