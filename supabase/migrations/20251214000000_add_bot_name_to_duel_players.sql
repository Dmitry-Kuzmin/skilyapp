-- Add bot_name and name columns to duel_players table
-- These columns are used by the duel-manager Edge Function to store bot names

-- Add bot_name column (nullable, only for bots)
ALTER TABLE public.duel_players 
ADD COLUMN IF NOT EXISTS bot_name TEXT;

-- Add name column (nullable, for compatibility)
ALTER TABLE public.duel_players 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.duel_players.bot_name IS 'Name of the bot player (only set when is_bot = true)';
COMMENT ON COLUMN public.duel_players.name IS 'Display name of the player (for compatibility, can be used for both bots and users)';

