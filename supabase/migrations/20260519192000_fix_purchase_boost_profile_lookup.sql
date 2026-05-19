-- Fix purchase_boost: profiles.id ≠ auth.uid().
-- The table uses profiles.id (own UUID) + profiles.user_id (= auth.users.id = auth.uid()).
-- Previously the function did WHERE id = auth.uid() → never found the row → P0002.
-- Fix: resolve profiles.id from auth.uid() via user_id column, then use that id
-- for all subsequent profile/inventory/transaction writes.

CREATE OR REPLACE FUNCTION public.purchase_boost(p_boost_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id       uuid := auth.uid();      -- auth.users.id  (= profiles.user_id)
  v_profile_id    uuid;                    -- profiles.id    (used throughout the app)
  v_cost          integer;
  v_boost_premium boolean;
  v_boost_name    text;
  v_user_premium  boolean;
  v_balance       integer;
  v_new_balance   integer;
  v_new_quantity  integer;
  v_tx_id         uuid;
BEGIN
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Resolve boost definition
  SELECT cost_coins, COALESCE(is_premium, false), name_ru
    INTO v_cost, v_boost_premium, v_boost_name
  FROM public.boost_definitions
  WHERE type = p_boost_type;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Boost not found: %', p_boost_type USING ERRCODE = 'P0002';
  END IF;

  IF v_cost < 0 THEN
    RAISE EXCEPTION 'Invalid boost cost' USING ERRCODE = '22023';
  END IF;

  -- Resolve profile by auth.uid() via user_id column (profiles.id ≠ auth.uid())
  SELECT id, coins, COALESCE(is_premium, false)
    INTO v_profile_id, v_balance, v_user_premium
  FROM public.profiles
  WHERE user_id = v_auth_id
  FOR UPDATE;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for auth user %', v_auth_id USING ERRCODE = 'P0002';
  END IF;

  IF v_boost_premium AND NOT v_user_premium THEN
    RAISE EXCEPTION 'Boost requires premium' USING ERRCODE = '42501';
  END IF;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have %, need %)', v_balance, v_cost
      USING ERRCODE = '22023';
  END IF;

  -- Deduct coins from profile
  UPDATE public.profiles
    SET coins = coins - v_cost
  WHERE id = v_profile_id
  RETURNING coins INTO v_new_balance;

  -- Update boost inventory (user_id = profiles.id throughout the app)
  INSERT INTO public.boost_inventory (user_id, boost_type, quantity, updated_at)
  VALUES (v_profile_id, p_boost_type, 1, NOW())
  ON CONFLICT (user_id, boost_type) DO UPDATE
    SET quantity   = public.boost_inventory.quantity + 1,
        updated_at = NOW()
  RETURNING quantity INTO v_new_quantity;

  -- Log transaction
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata, created_at)
  VALUES (
    v_profile_id,
    'coins_spent_boost',
    -v_cost,
    jsonb_build_object('boost_type', p_boost_type, 'boost_name', v_boost_name),
    NOW()
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'new_balance',   v_new_balance,
    'new_quantity',  v_new_quantity,
    'transaction_id', v_tx_id,
    'cost',          v_cost
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_boost(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.purchase_boost(text) TO authenticated;
