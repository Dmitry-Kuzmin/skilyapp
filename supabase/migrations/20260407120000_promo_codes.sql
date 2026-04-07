-- =====================================================
-- Promo codes for partner attribution
-- =====================================================

-- Add promo_code_used to profiles (which partner promo code the user entered)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
  ADD COLUMN IF NOT EXISTS promo_code_used_at TIMESTAMPTZ;

-- Function: validate a promo code and return partner info
-- Used client-side (anon) to show discount preview without storing anything
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code TEXT)
RETURNS TABLE(
  valid           BOOLEAN,
  partner_name    TEXT,
  discount_pct    INTEGER,
  partner_code    TEXT
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true,
    pr.name,
    COALESCE(pr.promo_code_discount, 0)::INTEGER,
    pr.promo_code
  FROM public.partners pr
  WHERE pr.promo_code = UPPER(TRIM(p_code))
    AND pr.status = 'active'
    AND pr.registration_status = 'approved'
  LIMIT 1;

  -- If nothing found, return invalid row
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT) TO anon, authenticated;

-- Function: apply promo code to a user profile (called after registration or manually)
CREATE OR REPLACE FUNCTION public.apply_promo_code(p_code TEXT)
RETURNS TABLE(
  success         BOOLEAN,
  message         TEXT,
  discount_pct    INTEGER
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_partner_code  TEXT;
  v_discount      INTEGER;
  v_partner_id    UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Необходимо войти в систему'::TEXT, 0;
    RETURN;
  END IF;

  -- Check if user already used a promo code
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND promo_code_used IS NOT NULL) THEN
    RETURN QUERY SELECT false, 'Промокод уже был применён'::TEXT, 0;
    RETURN;
  END IF;

  -- Validate the code
  SELECT pr.id, pr.promo_code, COALESCE(pr.promo_code_discount, 0)::INTEGER
  INTO v_partner_id, v_partner_code, v_discount
  FROM public.partners pr
  WHERE pr.promo_code = UPPER(TRIM(p_code))
    AND pr.status = 'active'
    AND pr.registration_status = 'approved'
  LIMIT 1;

  IF v_partner_code IS NULL THEN
    RETURN QUERY SELECT false, 'Промокод не найден'::TEXT, 0;
    RETURN;
  END IF;

  -- Store promo code on the profile
  UPDATE public.profiles
  SET
    promo_code_used    = v_partner_code,
    promo_code_used_at = now()
  WHERE id = v_user_id;

  -- Track as conversion (registration with promo code)
  PERFORM public.track_partner_conversion(
    v_partner_code,
    'registration',
    v_user_id::TEXT,
    NULL, NULL, NULL
  );

  RETURN QUERY SELECT true, 'Промокод применён! Скидка ' || v_discount || '%'::TEXT, v_discount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_promo_code(TEXT) TO authenticated;
