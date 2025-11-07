-- Add source_id column to questions_new table for Google Sheets synchronization
-- This allows upsert operations based on source_id from Google Sheets

ALTER TABLE public.questions_new
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Create unique index on source_id to enable upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_new_source_id 
ON public.questions_new(source_id) 
WHERE source_id IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.questions_new.source_id IS 'Unique identifier from Google Sheets (e.g., GS-1, GS-2) for synchronization';

