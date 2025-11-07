-- Add updated_at column to language_terms table
-- This column is needed for tracking when terms were last updated

-- Add updated_at column if it doesn't exist
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows to have updated_at = created_at
UPDATE public.language_terms
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after populating
ALTER TABLE public.language_terms
ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_language_terms_updated_at ON public.language_terms;
CREATE TRIGGER update_language_terms_updated_at
  BEFORE UPDATE ON public.language_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON COLUMN public.language_terms.updated_at IS 'Timestamp of last update, automatically maintained by trigger';

