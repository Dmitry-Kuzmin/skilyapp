-- Fix SECURITY DEFINER functions with proper input validation and safeguards

-- 1. Add whitelist validation to increment_profile_value
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id uuid,
  p_column text,
  p_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Whitelist allowed columns to prevent privilege escalation
  IF p_column NOT IN ('xp', 'coins', 'boosts', 'streak_days') THEN
    RAISE EXCEPTION 'Invalid column: %. Only xp, coins, boosts, and streak_days can be incremented', p_column;
  END IF;
  
  -- Bounds checking to prevent abuse
  IF p_amount < 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'Invalid amount: %. Must be between 0 and 10000', p_amount;
  END IF;
  
  -- Execute the update with validated parameters
  EXECUTE format(
    'UPDATE profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  )
  USING p_amount, p_profile_id;
END;
$function$;

-- 2. Add validation to modify_boost_inventory
CREATE OR REPLACE FUNCTION public.modify_boost_inventory(
  p_user_id uuid,
  p_boost_type text,
  p_change integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify boost_type exists in boost_definitions
  IF NOT EXISTS (
    SELECT 1 FROM boost_definitions WHERE type = p_boost_type
  ) THEN
    RAISE EXCEPTION 'Invalid boost type: %', p_boost_type;
  END IF;
  
  -- Limit change amount to prevent abuse
  IF ABS(p_change) > 50 THEN
    RAISE EXCEPTION 'Change amount too large: %. Maximum allowed is 50', p_change;
  END IF;
  
  INSERT INTO boost_inventory (user_id, boost_type, quantity, updated_at)
  VALUES (p_user_id, p_boost_type, GREATEST(0, p_change), NOW())
  ON CONFLICT (user_id, boost_type) 
  DO UPDATE SET 
    quantity = GREATEST(0, boost_inventory.quantity + p_change),
    updated_at = NOW();
END;
$function$;

-- 3. Add validation to has_boost
CREATE OR REPLACE FUNCTION public.has_boost(p_user_id uuid, p_boost_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quantity INTEGER;
BEGIN
  -- Verify boost_type is valid
  IF NOT EXISTS (
    SELECT 1 FROM boost_definitions WHERE type = p_boost_type
  ) THEN
    RETURN false;
  END IF;
  
  SELECT quantity INTO v_quantity
  FROM boost_inventory
  WHERE user_id = p_user_id 
    AND boost_type = p_boost_type;
  
  RETURN COALESCE(v_quantity, 0) > 0;
END;
$function$;

-- 4. Add proper search_path to link_telegram_to_user
CREATE OR REPLACE FUNCTION public.link_telegram_to_user(
  _user_id uuid,
  _telegram_id bigint,
  _first_name text,
  _last_name text DEFAULT NULL,
  _username text DEFAULT NULL,
  _photo_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify telegram_id is not already linked to another user
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE telegram_id = _telegram_id 
    AND user_id != _user_id
  ) THEN
    RAISE EXCEPTION 'Telegram ID already linked to another account';
  END IF;
  
  UPDATE public.profiles
  SET
    telegram_id = _telegram_id,
    first_name = COALESCE(_first_name, first_name),
    last_name = COALESCE(_last_name, last_name),
    username = COALESCE(_username, username),
    photo_url = COALESCE(_photo_url, photo_url),
    updated_at = now()
  WHERE user_id = _user_id;
END;
$function$;