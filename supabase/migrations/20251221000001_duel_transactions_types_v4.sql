-- Migration: Extend duel_transactions types for v3 payout system
ALTER TABLE public.duel_transactions
  DROP CONSTRAINT IF EXISTS duel_transactions_transaction_type_check;

ALTER TABLE public.duel_transactions
  ADD CONSTRAINT duel_transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'bet',
      'win',
      'refund',
      'commission',
      'rematch_carry',
      'insurance_premium',
      'insurance_refund',
      'win_payout',
      'base_payout'
    )
  );

-- Also ensure the handle_duel_payout_atomic function can handle insurance
CREATE OR REPLACE FUNCTION handle_duel_payout_atomic()
RETURNS TRIGGER AS $$
DECLARE
    player RECORD;
    is_draw_bool BOOLEAN;
    win_bonus INT := 0;
    bet_row RECORD;
    v_insurance_refund INT := 0;
BEGIN
    -- Only handle 'finished' status
    IF NEW.status != 'finished' OR (OLD.status = 'finished' AND OLD.status IS NOT NULL) THEN
        RETURN NEW;
    END IF;

    is_draw_bool := COALESCE(NEW.is_draw, false);

    -- Get bet details for insurance
    SELECT * INTO bet_row FROM duel_bets WHERE duel_id = NEW.id;

    -- Draw processing
    IF is_draw_bool THEN
        FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
            -- Refund bet if any
            IF NEW.bet_amount > 0 AND player.is_bot IS FALSE THEN
                UPDATE profiles SET coins = coins + NEW.bet_amount WHERE id = player.user_id;
                
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, NEW.bet_amount, 'refund')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
            END IF;

            -- Base reward for draw (10 coins)
            IF player.is_bot IS FALSE THEN
                UPDATE profiles SET coins = coins + 10 WHERE id = player.user_id;
                
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, 10, 'base_payout')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
            END IF;
        END LOOP;
    -- Win processing
    ELSIF NEW.winner_id IS NOT NULL THEN
        FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
            -- Winner logic
            IF player.user_id = NEW.winner_id AND player.is_bot IS FALSE THEN
                -- Payout (2x bet or 20 base)
                win_bonus := CASE WHEN NEW.bet_amount > 0 THEN NEW.bet_amount * 2 ELSE 20 END;
                
                UPDATE profiles SET 
                    coins = coins + win_bonus,
                    xp = xp + 50,
                    win_streak = win_streak + 1
                WHERE id = player.user_id;

                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, win_bonus, 'win_payout')
                ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
            
            -- Loser logic (check insurance)
            ELSIF player.is_bot IS FALSE AND player.user_id IS NOT NULL THEN
                -- Reset win streak for the loser
                UPDATE profiles SET win_streak = 0 WHERE id = player.user_id;

                -- Handle insurance if loser is the host and had insurance
                IF bet_row IS NOT NULL THEN
                    IF (bet_row.host_user = player.user_id AND bet_row.host_insurance_enabled) THEN
                        v_insurance_refund := ROUND(NEW.bet_amount * bet_row.host_coverage_rate);
                    ELSIF (bet_row.opponent_user = player.user_id AND bet_row.opponent_insurance_enabled) THEN
                        v_insurance_refund := ROUND(NEW.bet_amount * bet_row.opponent_coverage_rate);
                    END IF;

                    IF v_insurance_refund > 0 THEN
                        UPDATE profiles SET coins = coins + v_insurance_refund WHERE id = player.user_id;
                        
                        INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                        VALUES (NEW.id, player.user_id, v_insurance_refund, 'insurance_refund')
                        ON CONFLICT (duel_id, user_id, transaction_type) DO NOTHING;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
