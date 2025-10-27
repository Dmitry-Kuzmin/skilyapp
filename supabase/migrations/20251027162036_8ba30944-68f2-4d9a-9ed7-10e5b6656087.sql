-- Make telegram_id nullable to allow email/password registration
ALTER TABLE public.profiles 
ALTER COLUMN telegram_id DROP NOT NULL;

-- Update the handle_new_user function to not require telegram_id
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
    settings,
    platform,
    telegram_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'last_name',
    '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
    'web',
    NULL  -- Allow NULL for email/password users
  );
  RETURN NEW;
END;
$function$;