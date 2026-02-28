-- Migration: Update Duel Insurance Rate to 60%
-- Current rate in some places was 50%, 60% or 70%. Standardizing to 60% as requested.

CREATE OR REPLACE FUNCTION handle_duel_payout_atomic()
RETURNS TRIGGER AS $$
DECLARE
    player RECORD;
    is_draw_bool BOOLEAN;
    win_bonus INT := 0;
    is_winner BOOLEAN;
    has_insurance BOOLEAN;
    refund_amount INT := 0;
    xp_reward INT := 0;
    v_bet_amount INT := COALESCE(NEW.bet_amount, 0);
BEGIN
    -- Only handle 'finished' status transition
    IF NEW.status != 'finished' OR OLD.status = 'finished' THEN
        RETURN NEW;
    END IF;

    is_draw_bool := COALESCE(NEW.is_draw, false);

    -- Loop through both players to process rewards
    FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
        -- Skip bots for financial/XP transfers
        IF player.is_bot IS TRUE THEN
            CONTINUE;
        END IF;

        -- 🎯 ПРОВЕРКА ПОБЕДИТЕЛЯ
        is_winner := (NEW.winner_id IS NOT NULL AND player.user_id = NEW.winner_id AND NOT is_draw_bool);
        
        -- Проверяем страховку для этого конкретного игрока
        has_insurance := COALESCE(player.insurance_enabled, false) AND COALESCE(player.insurance_premium, 0) > 0;

        IF is_draw_bool THEN
            -- 🤝 НИЧЬЯ
            xp_reward := 15;
            IF v_bet_amount > 0 THEN
                UPDATE profiles SET coins = coins + v_bet_amount WHERE id = player.user_id;
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, v_bet_amount, 'refund') ON CONFLICT DO NOTHING;
            END IF;
            
            UPDATE profiles SET coins = coins + 10 WHERE id = player.user_id;
            INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
            VALUES (NEW.id, player.user_id, 10, 'base_payout') ON CONFLICT DO NOTHING;

        ELSIF is_winner THEN
            -- 🏆 ПОБЕДИТЕЛЬ
            xp_reward := 50;
            win_bonus := CASE WHEN v_bet_amount > 0 THEN v_bet_amount * 2 ELSE 20 END;
            
            UPDATE profiles SET 
                coins = coins + win_bonus,
                win_streak = win_streak + 1
            WHERE id = player.user_id;

            INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
            VALUES (NEW.id, player.user_id, win_bonus, 'win_payout') ON CONFLICT DO NOTHING;

        ELSE
            -- 😔 ПРОИГРАВШИЙ
            IF has_insurance AND v_bet_amount > 0 THEN
                xp_reward := 15;
                -- ОБНОВЛЕНО: Используем константные 60% возврата (0.6)
                refund_amount := ROUND(v_bet_amount * 0.6); 
                
                UPDATE profiles SET coins = coins + refund_amount WHERE id = player.user_id;
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, refund_amount, 'insurance_refund') ON CONFLICT DO NOTHING;
            ELSE
                xp_reward := 5; -- За участие
                UPDATE profiles SET win_streak = 0 WHERE id = player.user_id;
            END IF;
        END IF;

        -- 🚀 НАЧИСЛЕНИЕ XP
        IF xp_reward > 0 THEN
            UPDATE profiles SET xp = xp + xp_reward WHERE id = player.user_id;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
