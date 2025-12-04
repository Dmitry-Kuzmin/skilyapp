-- Функция для получения данных профиля по email (для preview в auth форме)
-- SECURITY: Возвращает только публичные данные (аватар, имя)
CREATE OR REPLACE FUNCTION public.get_user_profile_by_email(p_email TEXT)
RETURNS TABLE (
  avatar_url TEXT,
  display_name TEXT,
  first_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ищем профиль по user_id из auth.users где email совпадает
  RETURN QUERY
  SELECT 
    COALESCE(p.photo_url, p.equipped_avatar) as avatar_url,
    p.display_name,
    p.first_name
  FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  WHERE LOWER(u.email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- Разрешаем вызов функции всем (данные публичные)
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_email(TEXT) TO authenticated, anon;

-- Комментарий
COMMENT ON FUNCTION public.get_user_profile_by_email IS 'Возвращает публичные данные профиля (аватар, имя) по email для preview в форме авторизации';

