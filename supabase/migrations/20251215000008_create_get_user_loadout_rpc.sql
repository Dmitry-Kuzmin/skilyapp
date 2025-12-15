-- Create RPC function to get user loadout (bypasses RLS)
-- This function uses SECURITY DEFINER to allow users to view their own loadout
-- Works for both Telegram and Web users

CREATE OR REPLACE FUNCTION public.get_user_loadout(
  p_user_id UUID
)
RETURNS TABLE (
  slot_1_boost_type TEXT,
  slot_2_boost_type TEXT,
  slot_3_boost_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return loadout for the user (or null if doesn't exist)
  RETURN QUERY
  SELECT 
    user_loadouts.slot_1_boost_type,
    user_loadouts.slot_2_boost_type,
    user_loadouts.slot_3_boost_type
  FROM public.user_loadouts
  WHERE user_loadouts.user_id = get_user_loadout.p_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_user_loadout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_loadout(UUID) TO anon;

-- Comment for documentation
COMMENT ON FUNCTION public.get_user_loadout(UUID) IS 
  'Returns user loadout (3 boost slots) bypassing RLS. Works for both Telegram and Web users.';

