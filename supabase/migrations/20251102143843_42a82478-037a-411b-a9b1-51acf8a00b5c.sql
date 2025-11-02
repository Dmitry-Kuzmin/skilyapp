-- Add fields to duels table for async completion tracking
ALTER TABLE duels ADD COLUMN IF NOT EXISTS finished_by_players uuid[] DEFAULT '{}';
ALTER TABLE duels ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
ALTER TABLE duels ADD COLUMN IF NOT EXISTS user_a_finished_at timestamptz;
ALTER TABLE duels ADD COLUMN IF NOT EXISTS user_b_finished_at timestamptz;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_duels_winner ON duels(winner_id);
CREATE INDEX IF NOT EXISTS idx_duels_finished_by_players ON duels USING GIN(finished_by_players);