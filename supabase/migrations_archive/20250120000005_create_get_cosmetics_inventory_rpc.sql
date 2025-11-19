-- Create RPC functions to get user cosmetics inventory (bypasses RLS)
-- These functions use SECURITY DEFINER to allow users to view their own inventory
-- Works for both Telegram and Web users

-- Function to get user skins
CREATE OR REPLACE FUNCTION public.get_user_skins(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  skin_id TEXT,
  is_active BOOLEAN,
  obtained_at TIMESTAMPTZ,
  skin_definitions JSONB
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

  -- Return skins for the user with definitions
  RETURN QUERY
  SELECT 
    user_skins.id,
    user_skins.skin_id,
    user_skins.is_active,
    user_skins.obtained_at,
    row_to_json(skin_definitions.*)::jsonb as skin_definitions
  FROM public.user_skins
  JOIN public.skin_definitions ON user_skins.skin_id = skin_definitions.id
  WHERE user_skins.user_id = get_user_skins.p_user_id
  ORDER BY user_skins.obtained_at DESC;
END;
$$;

-- Function to get user badges
CREATE OR REPLACE FUNCTION public.get_user_badges(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  badge_id TEXT,
  is_displayed BOOLEAN,
  display_order INTEGER,
  obtained_at TIMESTAMPTZ,
  badge_definitions JSONB
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

  -- Return badges for the user with definitions
  RETURN QUERY
  SELECT 
    user_badges.id,
    user_badges.badge_id,
    user_badges.is_displayed,
    user_badges.display_order,
    user_badges.obtained_at,
    row_to_json(badge_definitions.*)::jsonb as badge_definitions
  FROM public.user_badges
  JOIN public.badge_definitions ON user_badges.badge_id = badge_definitions.id
  WHERE user_badges.user_id = get_user_badges.p_user_id
  ORDER BY user_badges.obtained_at DESC;
END;
$$;

-- Function to get user stickers
CREATE OR REPLACE FUNCTION public.get_user_stickers(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  sticker_id TEXT,
  quantity INTEGER,
  obtained_at TIMESTAMPTZ,
  sticker_definitions JSONB
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

  -- Return stickers for the user with definitions
  RETURN QUERY
  SELECT 
    user_stickers.id,
    user_stickers.sticker_id,
    user_stickers.quantity,
    user_stickers.obtained_at,
    row_to_json(sticker_definitions.*)::jsonb as sticker_definitions
  FROM public.user_stickers
  JOIN public.sticker_definitions ON user_stickers.sticker_id = sticker_definitions.id
  WHERE user_stickers.user_id = get_user_stickers.p_user_id
  ORDER BY user_stickers.obtained_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_skins(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_skins(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_badges(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_stickers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stickers(UUID) TO anon;

