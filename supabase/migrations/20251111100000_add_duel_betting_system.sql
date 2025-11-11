-- Add betting system to duels
-- Adds support for coin bets, commissions, and rematch pots

-- Add betting columns to duels table
ALTER TABLE public.duels 
ADD COLUMN IF NOT EXISTS bet_amount INTEGER DEFAULT 0 CHECK (bet_amount >= 0),
ADD COLUMN IF NOT EXISTS bet_type TEXT DEFAULT 'none' CHECK (bet_type IN ('none', 'fixed', 'custom')),
ADD COLUMN IF NOT EXISTS commission_taken INTEGER DEFAULT 0 CHECK (commission_taken >= 0),
ADD COLUMN IF NOT EXISTS rematch_pot INTEGER DEFAULT 0 CHECK (rematch_pot >= 0),
ADD COLUMN IF NOT EXISTS is_rematch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_duel_id UUID REFERENCES duels(id) ON DELETE SET NULL;

-- Create duel_transactions table for tracking all coin movements
CREATE TABLE IF NOT EXISTS public.duel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bet', 'win', 'refund', 'commission', 'rematch_carry')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_duel_transactions_duel_id ON public.duel_transactions(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_transactions_user_id ON public.duel_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_duels_bet_type ON public.duels(bet_type) WHERE bet_type != 'none';
CREATE INDEX IF NOT EXISTS idx_duels_is_rematch ON public.duels(is_rematch) WHERE is_rematch = true;

-- Enable RLS on duel_transactions
ALTER TABLE public.duel_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own transactions
CREATE POLICY "Users can view their own duel transactions"
ON public.duel_transactions
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
       OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
  )
);

-- RLS Policy: Service role can insert transactions
CREATE POLICY "Service can insert duel transactions"
ON public.duel_transactions
FOR INSERT
WITH CHECK (true);

-- Function to calculate commission (10%)
CREATE OR REPLACE FUNCTION calculate_duel_commission(total_pot INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(total_pot * 0.1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to process duel payout
CREATE OR REPLACE FUNCTION process_duel_payout(
  p_duel_id UUID,
  p_winner_id UUID,
  p_loser_id UUID,
  p_is_draw BOOLEAN DEFAULT false
)
RETURNS TABLE(
  winner_payout INTEGER,
  commission INTEGER,
  rematch_pot INTEGER
) AS $$
DECLARE
  v_bet_amount INTEGER;
  v_total_pot INTEGER;
  v_commission INTEGER;
  v_winner_payout INTEGER;
  v_rematch_pot INTEGER := 0;
BEGIN
  -- Get bet amount
  SELECT duels.bet_amount INTO v_bet_amount
  FROM duels
  WHERE id = p_duel_id;

  -- Calculate total pot
  v_total_pot := v_bet_amount * 2;

  IF p_is_draw THEN
    -- On draw, save pot for rematch
    v_rematch_pot := v_total_pot;
    v_commission := 0;
    v_winner_payout := 0;
    
    -- Update duel with rematch pot
    UPDATE duels
    SET rematch_pot = v_rematch_pot
    WHERE id = p_duel_id;
  ELSE
    -- Calculate commission (10% of total pot)
    v_commission := calculate_duel_commission(v_total_pot);
    v_winner_payout := v_total_pot - v_commission;

    -- Update winner's coins
    UPDATE profiles
    SET coins = coins + v_winner_payout
    WHERE id = p_winner_id;

    -- Record win transaction
    INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
    VALUES (p_duel_id, p_winner_id, v_winner_payout, 'win');

    -- Record commission
    INSERT INTO duel_transactions (duel_id, user_id, amount, transaction_type)
    VALUES (p_duel_id, p_winner_id, -v_commission, 'commission');

    -- Update duel with commission
    UPDATE duels
    SET commission_taken = v_commission
    WHERE id = p_duel_id;
  END IF;

  RETURN QUERY SELECT v_winner_payout, v_commission, v_rematch_pot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on function
COMMENT ON FUNCTION process_duel_payout IS 'Processes coin payout for completed duels with 10% commission. On draw, saves pot for rematch.';

