-- Add 'insane' difficulty level to bot_difficulty CHECK constraint
-- This is needed for anti-farming protection (bots become harder after 5+ wins)

ALTER TABLE public.duel_players
  DROP CONSTRAINT IF EXISTS duel_players_bot_difficulty_check;

ALTER TABLE public.duel_players
  ADD CONSTRAINT duel_players_bot_difficulty_check 
  CHECK (bot_difficulty IS NULL OR bot_difficulty IN ('easy', 'medium', 'hard', 'insane'));

COMMENT ON COLUMN public.duel_players.bot_difficulty IS 'Bot difficulty level: easy (60-70%), medium (70-80%), hard (85-90%), insane (95-99%). Used for anti-farming protection.';

