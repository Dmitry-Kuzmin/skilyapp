-- Fix: Add unique constraint on source_id for ON CONFLICT to work
-- The previous migration created a unique index with WHERE clause, but ON CONFLICT requires a unique constraint

-- Drop the existing unique index (if it exists)
DROP INDEX IF EXISTS idx_questions_new_source_id;

-- Create a unique constraint on source_id (only if it doesn't exist)
-- Note: This will only work for non-NULL values
-- For NULL values, we'll need to handle them separately in the application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.questions_new'::regclass
    AND conname = 'questions_new_source_id_key'
  ) THEN
    ALTER TABLE public.questions_new
    ADD CONSTRAINT questions_new_source_id_key UNIQUE (source_id);
  END IF;
END $$;

-- Add comment to explain the constraint (only if constraint exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.questions_new'::regclass
    AND conname = 'questions_new_source_id_key'
  ) THEN
    COMMENT ON CONSTRAINT questions_new_source_id_key ON public.questions_new IS 'Unique constraint on source_id for Google Sheets synchronization. Allows ON CONFLICT (source_id) to work.';
  END IF;
END $$;

