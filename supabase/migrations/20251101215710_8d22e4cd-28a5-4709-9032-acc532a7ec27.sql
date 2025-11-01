-- Drop old restrictive policy
DROP POLICY IF EXISTS "Anyone authenticated can view waiting duels" ON duels;

-- Create new policy allowing players to view their duels
CREATE POLICY "Players can view their duels"
ON duels
FOR SELECT
USING (
  -- Host always sees their duel
  host_user = auth.uid()
  OR
  -- Player sees duel if they're participating
  EXISTS (
    SELECT 1 FROM duel_players
    WHERE duel_players.duel_id = duels.id
    AND duel_players.user_id IN (
      SELECT id FROM profiles
      WHERE profiles.user_id = auth.uid()
      OR profiles.telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
  OR
  -- Or duel is still waiting (for joining)
  status = 'waiting'
);

-- Set REPLICA IDENTITY FULL for complete data on updates
ALTER TABLE duels REPLICA IDENTITY FULL;
ALTER TABLE duel_players REPLICA IDENTITY FULL;
ALTER TABLE duel_questions REPLICA IDENTITY FULL;
ALTER TABLE duel_answers REPLICA IDENTITY FULL;