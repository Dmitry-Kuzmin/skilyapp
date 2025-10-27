-- Add user_id column to profiles table for Supabase Auth integration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on user_id to ensure one profile per auth user
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);

-- Update RLS policies to support both Telegram and Supabase Auth
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (
  (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json->>'telegram_id')::bigint)
  OR (user_id = auth.uid())
  OR (clerk_id = (auth.uid())::text)
);

-- Policy for selecting profiles (anyone can view)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Policy for inserting profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  (user_id = auth.uid())
  OR (telegram_id IS NOT NULL)
);

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    settings,
    platform
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'last_name',
    '{"theme": "light", "language": "ru", "notifications": true}'::jsonb,
    'web'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to link Telegram account to existing Supabase auth user
CREATE OR REPLACE FUNCTION public.link_telegram_to_user(
  _user_id UUID,
  _telegram_id BIGINT,
  _first_name TEXT,
  _last_name TEXT DEFAULT NULL,
  _username TEXT DEFAULT NULL,
  _photo_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    telegram_id = _telegram_id,
    first_name = COALESCE(_first_name, first_name),
    last_name = COALESCE(_last_name, last_name),
    username = COALESCE(_username, username),
    photo_url = COALESCE(_photo_url, photo_url),
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;