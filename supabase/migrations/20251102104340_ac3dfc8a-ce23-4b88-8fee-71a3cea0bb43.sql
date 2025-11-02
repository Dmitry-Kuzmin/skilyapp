-- Fix RLS policy for duels table to support Telegram users properly
DROP POLICY IF EXISTS "Players can view their duels" ON duels;

CREATE POLICY "Players can view their duels" 
ON duels 
FOR SELECT 
USING (
  -- Host can always view (check both auth.uid and profile matching)
  (host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  ))
  OR
  -- Players in the duel can view
  (EXISTS (
    SELECT 1 FROM duel_players 
    WHERE duel_players.duel_id = duels.id 
    AND duel_players.user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  ))
  OR
  -- Anyone can view waiting duels (for join)
  (status = 'waiting')
);

-- Also fix the Host can update duels policy
DROP POLICY IF EXISTS "Host can update duels" ON duels;

CREATE POLICY "Host can update duels" 
ON duels 
FOR UPDATE 
USING (
  host_user IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);