-- Add metadata column to duel_notifications
ALTER TABLE public.duel_notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS if needed (already broad enough from previous migration)
-- GRANT ALL ON public.duel_notifications TO service_role; -- Not needed if already handled
