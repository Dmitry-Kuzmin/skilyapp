-- Add source_id and updated_at columns to road_signs table for Google Sheets synchronization

-- Drop the existing unique index (if it exists)
DROP INDEX IF EXISTS idx_road_signs_source_id;

-- Add source_id column if it doesn't exist
ALTER TABLE public.road_signs
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.road_signs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows to have updated_at = created_at
UPDATE public.road_signs
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after populating
ALTER TABLE public.road_signs
ALTER COLUMN updated_at SET NOT NULL;

-- Create a unique constraint on source_id (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.road_signs'::regclass
    AND conname = 'road_signs_source_id_key'
  ) THEN
    ALTER TABLE public.road_signs
    ADD CONSTRAINT road_signs_source_id_key UNIQUE (source_id);
  END IF;
END $$;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_road_signs_updated_at ON public.road_signs;
CREATE TRIGGER update_road_signs_updated_at
  BEFORE UPDATE ON public.road_signs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON COLUMN public.road_signs.source_id IS 'Unique identifier from Google Sheets for synchronization';
COMMENT ON COLUMN public.road_signs.updated_at IS 'Timestamp of last update, automatically maintained by trigger';

