-- Migration: Add help_request types to duel_notifications
-- 1. Expand the CHECK constraint to include help_requested and help_received

ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN (
    'start', 
    'progress', 
    'boost', 
    'finish', 
    'timeout', 
    'opponent_ahead', 
    'opponent_behind', 
    'reminder',
    'referral_joined', 
    'referral_earned',
    'answer',
    'test_result',
    'streak_lost',
    'daily_reward',
    'achievement',
    'system',
    'help_requested', -- Added for duel help system
    'help_received'   -- Added for duel help system
  ));

COMMENT ON CONSTRAINT duel_notifications_type_check ON duel_notifications IS 'Expanded to support duel help system requests.';
