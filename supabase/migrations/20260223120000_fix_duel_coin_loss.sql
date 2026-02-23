-- Migration: Add transaction log for lost bets in duels

CREATE OR REPLACE FUNCTION handle_duel_amount_loss()
RETURNS TRIGGER AS $$
DECLARE
    player RECORD;
BEGIN
    -- Only trigger on transition to 'finished'
    IF NEW.status = 'finished' AND (OLD.status != 'finished' OR OLD.status IS NULL) THEN
        
        -- Loop through the players in this duel
        FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
            
            -- If this player lost, wasn't a bot, bet money, and it wasn't a draw
            IF NEW.winner_id != player.user_id 
               AND player.is_bot IS FALSE 
               AND NEW.bet_amount > 0 
               AND COALESCE(NEW.is_draw, false) IS FALSE THEN
               
                -- Record the loss transaction so it appears in history
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, -(NEW.bet_amount), 'bet')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
                
            END IF;
            
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a new trigger specifically for this, since handle_duel_payout_atomic doesn't handle losses correctly
DROP TRIGGER IF EXISTS on_duel_finished_loss_log ON duels;

CREATE TRIGGER on_duel_finished_loss_log
AFTER UPDATE ON duels
FOR EACH ROW
EXECUTE FUNCTION handle_duel_amount_loss();

