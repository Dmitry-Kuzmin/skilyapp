-- ================================================
-- RPC: check_user_auth_method
-- ================================================
-- Проверяет существование пользователя и наличие пароля
-- Возвращает: { exists: boolean, has_password: boolean }
-- 
-- Это нужно для "умного входа":
-- - Если has_password = true → показать поле пароля
-- - Если has_password = false → сразу magic link

CREATE OR REPLACE FUNCTION public.check_user_auth_method(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_record RECORD;
  result JSONB;
BEGIN
  -- Ищем пользователя по email в auth.users
  SELECT 
    id,
    encrypted_password,
    email_confirmed_at
  INTO user_record
  FROM auth.users
  WHERE email = LOWER(TRIM(user_email))
  LIMIT 1;
  
  -- Если пользователь не найден
  IF user_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'exists', false,
      'has_password', false,
      'email_confirmed', false
    );
  END IF;
  
  -- Пользователь найден - проверяем есть ли пароль
  -- encrypted_password пустой или NULL означает что юзер использует только Magic Link / OAuth
  -- Supabase ставит encrypted_password при signUp с паролем
  RETURN jsonb_build_object(
    'exists', true,
    'has_password', (user_record.encrypted_password IS NOT NULL AND user_record.encrypted_password != ''),
    'email_confirmed', (user_record.email_confirmed_at IS NOT NULL)
  );
END;
$$;

-- Даём доступ анонимным пользователям (для формы входа)
GRANT EXECUTE ON FUNCTION public.check_user_auth_method(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_auth_method(TEXT) TO authenticated;

-- Комментарий для документации
COMMENT ON FUNCTION public.check_user_auth_method(TEXT) IS 
'Проверяет существование пользователя по email и наличие пароля. 
Используется для "умного входа" - если пароля нет, сразу показываем Magic Link.';
