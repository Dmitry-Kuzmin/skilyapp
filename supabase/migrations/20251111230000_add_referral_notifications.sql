-- Add referral notification types to duel_notifications
-- This allows sending notifications when someone joins via referral link

-- Update CHECK constraint to include referral types
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN (
    'start', 'progress', 'boost', 'finish', 'timeout', 
    'opponent_ahead', 'opponent_behind', 'reminder',
    'referral_joined', 'referral_earned'
  ));

-- Create function to send referral notification
CREATE OR REPLACE FUNCTION send_referral_notification(
  p_referrer_id UUID,
  p_referred_name TEXT,
  p_bonus_amount INTEGER,
  p_notification_type TEXT DEFAULT 'referral_joined'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Set notification content based on type
  IF p_notification_type = 'referral_joined' THEN
    v_title := 'Новый реферал!';
    v_message := p_referred_name || ' зарегистрировался по вашей ссылке и получил +' || p_bonus_amount || ' монет в подарок! 🎁';
  ELSIF p_notification_type = 'referral_earned' THEN
    v_title := 'Реферальная награда!';
    v_message := p_referred_name || ' заработал 50 монет! Вы получили +' || p_bonus_amount || ' монет! 💰';
  ELSE
    v_title := 'Реферальное уведомление';
    v_message := 'У вас новое реферальное событие';
  END IF;

  -- Insert notification
  INSERT INTO duel_notifications (
    user_id,
    type,
    title,
    message,
    icon,
    metadata,
    is_read
  ) VALUES (
    p_referrer_id,
    p_notification_type,
    v_title,
    v_message,
    '🎁',
    jsonb_build_object(
      'referred_name', p_referred_name,
      'bonus_amount', p_bonus_amount,
      'timestamp', NOW()
    ),
    false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_referral_notification IS 'Sends notification to referrer when someone joins or earns milestone';

