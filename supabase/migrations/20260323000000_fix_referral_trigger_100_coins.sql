-- Fix referral trigger to fire when user earns their first 50 coins
-- Since they get 50 as a signup bonus, they must reach 100 coins total

CREATE OR REPLACE FUNCTION check_referral_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_record RECORD;
BEGIN
  -- Check if coins crossed 100 threshold (50 signup + 50 earned)
  IF NEW.coins >= 100 AND OLD.coins < 100 THEN
    -- Find referral record for this user
    SELECT * INTO v_referral_record
    FROM referrals
    WHERE referred_id = NEW.id 
      AND reward_given = false
      AND referred_earned_50 = false;
    
    IF FOUND THEN
      -- Mark that referred user earned 50
      UPDATE referrals 
      SET referred_earned_50 = true,
          reward_given = true,
          reward_given_at = NOW()
      WHERE id = v_referral_record.id;
      
      -- Award bonus to referrer (+100 coins)
      UPDATE profiles 
      SET coins = coins + v_referral_record.referral_bonus,
          total_referrals = total_referrals + 1
      WHERE id = v_referral_record.referrer_id;
      
      -- Add coins_history record for referrer
      INSERT INTO coins_history (user_id, amount, reason)
      VALUES (v_referral_record.referrer_id, v_referral_record.referral_bonus, 'referral_milestone');
      
      RAISE NOTICE 'Referral bonus awarded: referrer_id=%, amount=%', 
        v_referral_record.referrer_id, v_referral_record.referral_bonus;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger with threshold 100
DROP TRIGGER IF EXISTS on_coins_update_check_referral ON public.profiles;
CREATE TRIGGER on_coins_update_check_referral
  AFTER UPDATE OF coins ON public.profiles
  FOR EACH ROW
  WHEN (NEW.coins >= 100 AND OLD.coins < 100)
  EXECUTE FUNCTION check_referral_milestone();
