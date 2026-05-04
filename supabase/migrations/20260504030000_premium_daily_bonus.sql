-- Daily +50 coins bonus для premium/trial пользователей
-- Выдаётся один раз в сутки при явном запросе (claim)

CREATE TABLE IF NOT EXISTS premium_daily_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  coins_awarded INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, claimed_date)
);

CREATE INDEX IF NOT EXISTS idx_premium_daily_bonus_user ON premium_daily_bonus(user_id);

ALTER TABLE premium_daily_bonus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bonus" ON premium_daily_bonus
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON premium_daily_bonus
  FOR ALL USING (auth.role() = 'service_role');

-- RPC: claim_premium_daily_bonus — выдаёт 50 coins, только 1 раз в день, только premium/trial
CREATE OR REPLACE FUNCTION claim_premium_daily_bonus(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, coins_awarded INTEGER, message TEXT) AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_already_claimed BOOLEAN;
  v_coins INTEGER := 50;
BEGIN
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;

  IF NOT v_is_premium THEN
    RETURN QUERY SELECT FALSE, 0, 'not_premium'::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM premium_daily_bonus
    WHERE user_id = p_user_id AND claimed_date = CURRENT_DATE
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN QUERY SELECT FALSE, 0, 'already_claimed'::TEXT;
    RETURN;
  END IF;

  INSERT INTO premium_daily_bonus (user_id, claimed_date, coins_awarded)
  VALUES (p_user_id, CURRENT_DATE, v_coins);

  UPDATE profiles
  SET coins = COALESCE(coins, 0) + v_coins
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_coins, 'ok'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: check_premium_daily_bonus — проверить статус без claim
CREATE OR REPLACE FUNCTION check_premium_daily_bonus(p_user_id UUID)
RETURNS TABLE(can_claim BOOLEAN, already_claimed BOOLEAN, is_premium BOOLEAN) AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_already_claimed BOOLEAN;
BEGIN
  SELECT COALESCE(is_premium, FALSE) INTO v_is_premium
  FROM profiles WHERE id = p_user_id;

  SELECT EXISTS(
    SELECT 1 FROM premium_daily_bonus
    WHERE user_id = p_user_id AND claimed_date = CURRENT_DATE
  ) INTO v_already_claimed;

  RETURN QUERY SELECT (v_is_premium AND NOT v_already_claimed), v_already_claimed, v_is_premium;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE premium_daily_bonus IS 'Учёт ежедневного premium-бонуса +50 coins';
COMMENT ON FUNCTION claim_premium_daily_bonus IS 'Выдаёт 50 coins premium/trial юзеру, 1 раз в сутки';
COMMENT ON FUNCTION check_premium_daily_bonus IS 'Проверяет статус ежедневного бонуса без его выдачи';
