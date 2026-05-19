-- Atomic boost purchase RPC.
--
-- Background: BoostShopModal previously chained three RPCs from the client:
--   1) increment_profile_value(profile_id, 'coins', -cost)
--   2) modify_boost_inventory(user_id, type, +1)
--   3) create_transaction(user_id, 'coins_spent_boost', -cost, metadata)
--
-- All three were revoked from `authenticated` in 20260518610000 because they
-- accepted user_id and (in #1) a free-form column name — meaning any signed-in
-- user could credit themselves arbitrary coins / xp / sp / mutate any int
-- column on any profile.
--
-- Fix: a single SECURITY DEFINER RPC that:
--   - derives the user from auth.uid() (no spoofable parameter)
--   - reads cost from boost_definitions (source of truth)
--   - locks the profile row, validates balance + premium gating
--   - performs all three writes inside one statement (atomic, no partial state)
--   - returns new balance and quantity for the client to display
--
-- Only `purchase_boost(text)` is exposed to authenticated. The underlying
-- privileged functions stay revoked.

CREATE OR REPLACE FUNCTION public.purchase_boost(p_boost_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid := auth.uid();
  v_cost          integer;
  v_boost_premium boolean;
  v_boost_name    text;
  v_user_premium  boolean;
  v_balance       integer;
  v_new_balance   integer;
  v_new_quantity  integer;
  v_tx_id         uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

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

  SELECT coins, COALESCE(is_premium, false)
    INTO v_balance, v_user_premium
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_boost_premium AND NOT v_user_premium THEN
    RAISE EXCEPTION 'Boost requires premium' USING ERRCODE = '42501';
  END IF;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have %, need %)', v_balance, v_cost
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
    SET coins = coins - v_cost
  WHERE id = v_user_id
  RETURNING coins INTO v_new_balance;

  INSERT INTO public.boost_inventory (user_id, boost_type, quantity, updated_at)
  VALUES (v_user_id, p_boost_type, 1, NOW())
  ON CONFLICT (user_id, boost_type) DO UPDATE
    SET quantity   = public.boost_inventory.quantity + 1,
        updated_at = NOW()
  RETURNING quantity INTO v_new_quantity;

  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata, created_at)
  VALUES (
    v_user_id,
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

COMMENT ON FUNCTION public.purchase_boost(text) IS
  'Atomic boost purchase: deducts coins, increments inventory, logs transaction. Uses auth.uid() — caller cannot purchase on behalf of another user.';
