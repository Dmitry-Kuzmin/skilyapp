-- Auto-add host to duel_players trigger
-- This trigger automatically adds the duel creator to duel_players table
-- Fixes "Player not found" errors when creating duels

-- Function: Automatically add host_user to duel_players
CREATE OR REPLACE FUNCTION auto_add_host_to_duel_players()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Автоматически добавляем host_user в duel_players при создании дуэли
  INSERT INTO duel_players (
    duel_id,
    user_id,
    is_host
  ) VALUES (
    NEW.id,
    NEW.host_user,
    true
  )
  ON CONFLICT (duel_id, user_id) DO NOTHING; -- Если уже есть, не дублируем
  
  RAISE NOTICE '[auto_add_host] Added host % to duel %', NEW.host_user, NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger: Execute after duel creation
DROP TRIGGER IF EXISTS trigger_auto_add_host_player ON duels;
CREATE TRIGGER trigger_auto_add_host_player
  AFTER INSERT ON duels
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_host_to_duel_players();
