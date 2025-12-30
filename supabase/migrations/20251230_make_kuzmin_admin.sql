-- Make Kuzmin.public@gmail.com an admin
-- Migration: Add admin role to Kuzmin.public@gmail.com

-- Функция для безопасного добавления админа
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Получаем user_id из таблицы profiles по email
  SELECT user_id INTO v_user_id
  FROM auth.users
  WHERE email = 'Kuzmin.public@gmail.com'
  LIMIT 1;

  -- Если пользователь найден
  IF v_user_id IS NOT NULL THEN
    -- Удаляем существующую роль (если есть)
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;

    -- Добавляем роль admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin role granted to user: %', v_user_id;
  ELSE
    RAISE WARNING 'User with email Kuzmin.public@gmail.com not found';
  END IF;
END $$;
