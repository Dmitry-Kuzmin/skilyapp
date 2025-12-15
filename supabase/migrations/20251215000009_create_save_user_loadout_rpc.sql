-- Create RPC function to save user loadout (bypasses RLS)
-- This function uses SECURITY DEFINER to allow users to save their own loadout
-- Works for both Telegram and Web users

CREATE OR REPLACE FUNCTION public.save_user_loadout(
  p_user_id UUID,
  p_slot_1_boost_type TEXT DEFAULT NULL,
  p_slot_2_boost_type TEXT DEFAULT NULL,
  p_slot_3_boost_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Upsert loadout for the user
  INSERT INTO public.user_loadouts (
    user_id,
    slot_1_boost_type,
    slot_2_boost_type,
    slot_3_boost_type
  )
  VALUES (
    p_user_id,
    p_slot_1_boost_type,
    p_slot_2_boost_type,
    p_slot_3_boost_type
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    slot_1_boost_type = EXCLUDED.slot_1_boost_type,
    slot_2_boost_type = EXCLUDED.slot_2_boost_type,
    slot_3_boost_type = EXCLUDED.slot_3_boost_type,
    updated_at = NOW();
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.save_user_loadout(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_loadout(UUID, TEXT, TEXT, TEXT) TO anon;

-- Comment for documentation
COMMENT ON FUNCTION public.save_user_loadout(UUID, TEXT, TEXT, TEXT) IS 
  'Saves user loadout (3 boost slots) bypassing RLS. Works for both Telegram and Web users.';

