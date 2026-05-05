-- Fix: ad_rewards reward_type check constraint was missing 'double_winnings' and 'slot_unlock'
-- This caused 500 errors on claim-ad-reward Edge Function when DataLaundering (X2 winnings) button was used

ALTER TABLE ad_rewards
  DROP CONSTRAINT IF EXISTS ad_rewards_reward_type_check;

ALTER TABLE ad_rewards
  ADD CONSTRAINT ad_rewards_reward_type_check
  CHECK (reward_type = ANY (ARRAY[
    'coins'::text,
    'restore_streak'::text,
    'test_attempt'::text,
    'extra_slot'::text,
    'slot_unlock'::text,
    'double_winnings'::text
  ]));
