-- Create RPC function to get user boost inventory (bypasses RLS)
-- This function uses SECURITY DEFINER to allow users to view their own inventory
-- Works for both Telegram and Web users

CREATE OR REPLACE FUNCTION public.get_user_boost_inventory(
  p_user_id UUID
)
RETURNS TABLE (
  boost_type TEXT,
  quantity INTEGER
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

  -- Return inventory for the user
  RETURN QUERY
  SELECT 
    boost_inventory.boost_type,
    boost_inventory.quantity
  FROM public.boost_inventory
  WHERE boost_inventory.user_id = get_user_boost_inventory.p_user_id
  ORDER BY boost_inventory.boost_type ASC;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_user_boost_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_boost_inventory(UUID) TO anon;

