-- Обновляем функцию для получения данных профиля по email
-- Добавляем возврат id профиля, чтобы работал компонент UserAvatar со скинами
CREATE OR REPLACE FUNCTION public.get_user_profile_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  avatar_url TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.photo_url, p.equipped_avatar) as avatar_url,
    p.first_name,
    p.last_name,
    p.username
  FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  WHERE LOWER(u.email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- Права доступа
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_email(TEXT) TO authenticated, anon;
