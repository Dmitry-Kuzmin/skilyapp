-- Migration to heal inconsistent coin balances
-- This script checks for users whose coin balance is 0 but who have positive transaction history.

DO $$
DECLARE
    r RECORD;
    v_total_earned INTEGER;
    v_total_spent INTEGER;
    v_calculated_balance INTEGER;
    v_current_balance INTEGER;
BEGIN
    FOR r IN SELECT id, first_name, coins FROM profiles LOOP
        -- Calculate total earned from transactions table
        SELECT COALESCE(SUM(amount), 0) INTO v_total_earned 
        FROM public.transactions 
        WHERE user_id = r.id AND transaction_type LIKE 'coins_earned%';
        
        -- Add purchases
        SELECT v_total_earned + COALESCE(SUM(amount), 0) INTO v_total_earned
        FROM public.transactions
        WHERE user_id = r.id AND transaction_type LIKE 'coins_purchase%';

        -- Calculate total spent from transactions table
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_spent 
        FROM public.transactions 
        WHERE user_id = r.id AND transaction_type LIKE 'coins_spent%';

        -- Calculate total from duel transactions
        -- (Assuming amount is positive for wins and negative for bets)
        SELECT v_total_earned + COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) INTO v_total_earned
        FROM public.duel_transactions
        WHERE user_id = r.id;

        SELECT v_total_spent + COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0), 0) INTO v_total_spent
        FROM public.duel_transactions
        WHERE user_id = r.id;

        v_calculated_balance := v_total_earned - v_total_spent;
        
        -- Safety check - coins should not be negative
        IF v_calculated_balance < 0 THEN
            v_calculated_balance := 0;
        END IF;

        -- If current balance is 0 but calculated is positive, heal it
        IF r.coins = 0 AND v_calculated_balance > 0 THEN
            UPDATE public.profiles SET coins = v_calculated_balance WHERE id = r.id;
            RAISE NOTICE 'Healed profile % (%), restored % coins (calculated from transactions)', r.id, r.first_name, v_calculated_balance;
            
            -- Also insert a correction transaction for audit trail
            INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
            VALUES (r.id, 'admin_adjust', v_calculated_balance, jsonb_build_object('reason', 'healing_migration_inconsistent_balance', 'previous_balance', 0));
        END IF;
    END LOOP;
END $$;
