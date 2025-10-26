-- Add missing fields to profiles table for user settings and tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS clerk_id text,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boosts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{"theme": "light", "language": "en", "notifications": true}'::jsonb,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone DEFAULT now();

-- Create index for clerk_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON public.profiles(clerk_id);

-- Update RLS policy to allow users to update their own last_login
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint 
       OR clerk_id = auth.uid()::text);