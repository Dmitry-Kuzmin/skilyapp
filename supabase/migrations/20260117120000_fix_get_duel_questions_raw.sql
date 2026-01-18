CREATE OR REPLACE FUNCTION get_duel_questions_raw(p_duel_id UUID)
RETURNS SETOF duel_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_participant BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is a participant (bypass RLS)
  SELECT EXISTS (
    SELECT 1 FROM duel_players
    WHERE duel_id = p_duel_id 
    AND user_id = v_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    -- Fallback: Check if user is associated with the duel in the main table
    SELECT EXISTS (
      SELECT 1 FROM duels
      WHERE id = p_duel_id 
      AND (host_user = v_user_id OR opponent_user = v_user_id)
    ) INTO v_is_participant;
  END IF;

  -- Allow admins to view questions (optional, but good for debugging)
  -- IF NOT v_is_participant AND is_admin(v_user_id) THEN
  --   v_is_participant := true;
  -- END IF;

  IF NOT v_is_participant THEN
     RAISE EXCEPTION 'Access denied: User is not a participant of this duel';
  END IF;

  RETURN QUERY
  SELECT *
  FROM duel_questions
  WHERE duel_id = p_duel_id
  ORDER BY position;
END;
$$;
