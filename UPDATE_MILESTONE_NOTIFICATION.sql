-- Update check_referral_milestone to send notification when friend earns 50 coins

DROP TRIGGER IF EXISTS on_coins_update_check_referral ON public.profiles;
DROP FUNCTION IF EXISTS check_referral_milestone();

CREATE OR REPLACE FUNCTION check_referral_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_record RECORD;
  v_referred_name TEXT;
BEGIN
  -- Check if coins crossed 50 threshold (old < 50, new >= 50)
  IF NEW.coins >= 50 AND OLD.coins < 50 THEN
    -- Find referral record for this user
    SELECT 
      r.id,
      r.referrer_id,
      r.referral_bonus,
      r.reward_given,
      r.referred_earned_50
    INTO v_referral_record
    FROM referrals r
    WHERE r.referred_id = NEW.id 
      AND r.reward_given = false
      AND r.referred_earned_50 = false;
    
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
      
      -- Get referred user's name
      v_referred_name := NEW.first_name;
      IF v_referred_name IS NULL OR v_referred_name = '' THEN
        v_referred_name := NEW.username;
      END IF;
      IF v_referred_name IS NULL OR v_referred_name = '' THEN
        v_referred_name := 'Ваш друг';
      END IF;
      
      -- Send notification to referrer
      PERFORM send_referral_notification(
        v_referral_record.referrer_id,
        v_referred_name,
        v_referral_record.referral_bonus,
        'referral_earned'
      );
      
      RAISE NOTICE 'Referral bonus awarded and notification sent: referrer_id=%, amount=%', 
        v_referral_record.referrer_id, v_referral_record.referral_bonus;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_coins_update_check_referral
  AFTER UPDATE OF coins ON public.profiles
  FOR EACH ROW
  WHEN (NEW.coins >= 50 AND OLD.coins < 50)
  EXECUTE FUNCTION check_referral_milestone();

COMMENT ON FUNCTION check_referral_milestone IS 'Checks if referred user earned 50 coins, awards bonus to referrer, and sends notification';

