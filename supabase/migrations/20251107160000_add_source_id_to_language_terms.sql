-- Add source_id column to language_terms table for Google Sheets synchronization
-- This allows upsert operations based on source_id from Google Sheets

-- Drop the existing unique index (if it exists)
DROP INDEX IF EXISTS idx_language_terms_source_id;

-- Add source_id column if it doesn't exist
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Create a unique constraint on source_id (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.language_terms'::regclass
    AND conname = 'language_terms_source_id_key'
  ) THEN
    ALTER TABLE public.language_terms
    ADD CONSTRAINT language_terms_source_id_key UNIQUE (source_id);
  END IF;
END $$;

-- Add comment to explain the constraint (only if constraint exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.language_terms'::regclass
    AND conname = 'language_terms_source_id_key'
  ) THEN
    COMMENT ON CONSTRAINT language_terms_source_id_key ON public.language_terms IS 'Unique constraint on source_id for Google Sheets synchronization. Allows ON CONFLICT (source_id) to work.';
  END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN public.language_terms.source_id IS 'Unique identifier from Google Sheets (e.g., LT-1, LT-2) for synchronization';

