-- =============================================================================
-- Migration: Fix Bot Duel Rewards + Trigger Recreation
-- 2026-02-25: Исправляем начисление XP/монет в бот-дуэлях и пересоздаём триггер
-- =============================================================================

-- 1. ПЕРЕСОЗДАЁМ ТРИГГЕР (был потерян при последнем CREATE OR REPLACE FUNCTION)
DROP TRIGGER IF EXISTS on_duel_finished_payout ON public.duels;

-- 2. ОБНОВЛЯЕМ ФУНКЦИЮ с правильной логикой для бот-дуэлей
CREATE OR REPLACE FUNCTION public.handle_duel_payout_atomic()
RETURNS TRIGGER AS $$
DECLARE
    player           RECORD;
    is_draw_bool     BOOLEAN;
    win_bonus        INT := 0;
    is_winner        BOOLEAN;
    insurance_premium INT := 0;
    refund_amount    INT := 0;
    xp_reward        INT := 0;
    v_bet_amount     INT := COALESCE(NEW.bet_amount, 0);
    human_lost       BOOLEAN;
BEGIN
    -- Только при переходе в статус 'finished'
    IF NEW.status != 'finished' OR OLD.status = 'finished' THEN
        RETURN NEW;
    END IF;

    is_draw_bool := COALESCE(NEW.is_draw, false);

    -- Для бот-дуэлей: winner_id = NULL и is_draw = FALSE означает победу бота
    -- Определяем это заранее
    human_lost := NOT is_draw_bool AND NEW.winner_id IS NULL;

    FOR player IN SELECT * FROM duel_players WHERE duel_id = NEW.id LOOP
        -- Пропускаем ботов
        IF player.is_bot IS TRUE THEN
            CONTINUE;
        END IF;

        -- Победитель: player.user_id совпадает с winner_id
        is_winner := NEW.winner_id IS NOT NULL AND player.user_id = NEW.winner_id AND NOT is_draw_bool;

        -- Страховка
        IF player.user_id = NEW.host_user THEN
            insurance_premium := COALESCE(NEW.host_insurance_premium, 0);
        ELSE
            insurance_premium := COALESCE(NEW.opponent_insurance_premium, 0);
        END IF;

        -- Сброс переменных
        xp_reward := 0;
        win_bonus := 0;
        refund_amount := 0;

        IF is_draw_bool THEN
            -- 🤝 НИЧЬЯ
            xp_reward := 15;
            -- Возврат ставки
            IF v_bet_amount > 0 THEN
                UPDATE profiles SET coins = coins + v_bet_amount WHERE id = player.user_id;
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, v_bet_amount, 'refund') ON CONFLICT DO NOTHING;
            END IF;
            -- Базовая монета за участие
            UPDATE profiles SET coins = coins + 10 WHERE id = player.user_id;
            INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
            VALUES (NEW.id, player.user_id, 10, 'base_payout') ON CONFLICT DO NOTHING;

        ELSIF is_winner THEN
            -- 🏆 ПОБЕДИТЕЛЬ (реальный игрок выиграл)
            xp_reward := 50;
            win_bonus := CASE WHEN v_bet_amount > 0 THEN v_bet_amount * 2 ELSE 20 END;

            UPDATE profiles SET
                coins = coins + win_bonus,
                win_streak = win_streak + 1
            WHERE id = player.user_id;

            INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
            VALUES (NEW.id, player.user_id, win_bonus, 'win_payout') ON CONFLICT DO NOTHING;

        ELSIF human_lost THEN
            -- 😔 БОТ ПОБЕДИЛ: реальный игрок проиграл боту
            IF insurance_premium > 0 AND v_bet_amount > 0 THEN
                xp_reward := 15; -- За страховку
                refund_amount := ROUND(v_bet_amount * 0.7);
                UPDATE profiles SET coins = coins + refund_amount WHERE id = player.user_id;
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, refund_amount, 'insurance_payout') ON CONFLICT DO NOTHING;
            ELSE
                xp_reward := 5; -- За участие
                UPDATE profiles SET win_streak = 0 WHERE id = player.user_id;
            END IF;

        ELSE
            -- 😔 ОБЫЧНОЕ ПОРАЖЕНИЕ (реальный игрок против реального)
            IF insurance_premium > 0 AND v_bet_amount > 0 THEN
                xp_reward := 15;
                refund_amount := ROUND(v_bet_amount * 0.7);
                UPDATE profiles SET coins = coins + refund_amount WHERE id = player.user_id;
                INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
                VALUES (NEW.id, player.user_id, refund_amount, 'insurance_payout') ON CONFLICT DO NOTHING;
            ELSE
                xp_reward := 5;
                UPDATE profiles SET win_streak = 0 WHERE id = player.user_id;
            END IF;
        END IF;

        -- 🚀 НАЧИСЛЯЕМ XP
        IF xp_reward > 0 THEN
            UPDATE profiles SET xp = xp + xp_reward WHERE id = player.user_id;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. ВЕШАЕМ ТРИГГЕР ЗАНОВО
CREATE TRIGGER on_duel_finished_payout
    AFTER UPDATE ON public.duels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_duel_payout_atomic();

-- 4. ПРАВА
GRANT EXECUTE ON FUNCTION public.handle_duel_payout_atomic() TO authenticated, anon, service_role;
