-- ========================================
-- Migration: Update language_terms table
-- ========================================
-- Add topic_id to link terms with topics

-- Add topic_id column
ALTER TABLE public.language_terms
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_language_terms_topic_id ON public.language_terms(topic_id);

-- Add comment for documentation
COMMENT ON COLUMN public.language_terms.topic_id IS 'Optional link to topic for organizing terms by learning path';

