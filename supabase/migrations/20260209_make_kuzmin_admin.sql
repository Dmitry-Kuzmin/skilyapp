-- Make kuzmin.public@gmail.com an admin
-- Migration: Add admin role to kuzmin.public@gmail.com

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Получаем user_id из таблицы auth.users по email (case-insensitive search)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email ILIKE 'kuzmin.public@gmail.com'
  LIMIT 1;

  -- Если пользователь найден
  IF v_user_id IS NOT NULL THEN
    -- Удаляем существующую роль (если есть), чтобы избежать конфликтов или лишних записей
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;

    -- Добавляем роль admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Также обновляем в profiles metadata если нужно (опционально, зависит от логики приложения)
    -- UPDATE public.profiles SET is_admin = true WHERE id = v_user_id; -- Если есть такое поле

    RAISE NOTICE 'Admin role granted to user: %', v_user_id;
  ELSE
    RAISE WARNING 'User with email kuzmin.public@gmail.com not found';
  END IF;
END $$;
