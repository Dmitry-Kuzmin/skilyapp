-- Fix RLS policy for duel_players UPDATE to work with profile.id instead of auth.uid()
-- The user_id in duel_players is profile.id, not auth.uid()

-- Drop existing incorrect policy
DROP POLICY IF EXISTS "Users can update their player records" ON public.duel_players;

-- Create correct policy that checks profile.id
CREATE POLICY "Users can update their player records"
ON public.duel_players FOR UPDATE
USING (
  -- User can update if user_id matches their profile.id
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
  OR is_bot = true
);

-- Ensure Realtime is enabled for duel_players (ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_players;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for complete data on updates (if not already set)
ALTER TABLE duel_players REPLICA IDENTITY FULL;

