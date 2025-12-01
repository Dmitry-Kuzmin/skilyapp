-- Add last_seen column to profiles table for tracking user activity
-- This column tracks when a user was last seen/active in the system

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Create index for faster queries on last_seen
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen) WHERE last_seen IS NOT NULL;

-- Update last_seen when user logs in or performs actions
-- This will be updated by application logic, not by trigger to avoid performance issues

COMMENT ON COLUMN public.profiles.last_seen IS 'Timestamp of when the user was last seen/active in the system';

