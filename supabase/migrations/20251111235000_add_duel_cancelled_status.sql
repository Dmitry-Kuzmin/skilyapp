-- Add 'cancelled' status to duels
-- This allows duels to be cancelled before opponent joins

-- Update the status check constraint
ALTER TABLE public.duels DROP CONSTRAINT IF EXISTS duels_status_check;
ALTER TABLE public.duels ADD CONSTRAINT duels_status_check 
  CHECK (status IN ('waiting', 'active', 'finished', 'cancelled', 'timeout'));

-- Add index for cancelled duels (for cleanup queries if needed)
CREATE INDEX IF NOT EXISTS idx_duels_cancelled 
  ON public.duels (status, created_at) 
  WHERE status = 'cancelled';

-- Comment
COMMENT ON CONSTRAINT duels_status_check ON public.duels IS 
  'Duel can be waiting, active, finished, cancelled, or timeout';

