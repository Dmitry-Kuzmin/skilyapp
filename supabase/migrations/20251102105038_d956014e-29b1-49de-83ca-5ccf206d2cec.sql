-- Fix RLS policy for duel_questions to support Telegram users
DROP POLICY IF EXISTS "Players can view their duel questions" ON duel_questions;

CREATE POLICY "Players can view their duel questions" 
ON duel_questions 
FOR SELECT 
USING (
  -- Player is in the duel (works for both Telegram and email users)
  EXISTS (
    SELECT 1 FROM duel_players 
    WHERE duel_players.duel_id = duel_questions.duel_id 
    AND duel_players.user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);