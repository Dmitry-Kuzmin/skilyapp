-- Исправляем триггер handle_new_user для копирования аватара из Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    photo_url,  -- Добавляем поле photo_url
    settings,
    platform,
    telegram_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url',  -- Копируем аватар из Google/OAuth
    '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
    'web',
    NULL  -- Allow NULL for email/password users
  );
  RETURN NEW;
END;
$function$;
