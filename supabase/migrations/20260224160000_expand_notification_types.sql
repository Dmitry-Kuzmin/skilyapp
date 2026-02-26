-- Migration: Expand Duel Notification Types
-- 1. Update the CHECK constraint on duel_notifications to include new types like 'answer', 'test_results', etc.

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
    'answer',        -- Added for real-time answer notifications
    'test_result',   -- Added for test results
    'streak_lost',   -- Added for streak notifications
    'daily_reward',  -- Added for daily bonus notifications
    'achievement',   -- Added for achievement notifications
    'system'         -- Added for general system notifications
  ));

COMMENT ON CONSTRAINT duel_notifications_type_check ON duel_notifications IS 'Constraint checking that notification type is within the allowed list, expanded to support new game events.';
