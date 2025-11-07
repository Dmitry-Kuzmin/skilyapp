-- ========================================
-- Migration: Update topics table for learning map
-- ========================================
-- Add fields for learning map functionality:
-- - unlock_condition: JSONB for unlock conditions
-- - description: TEXT for topic description
-- - order_index: INTEGER (alias for number, for consistency)

-- Add description field
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add unlock_condition field (JSONB)
-- Structure: { "required_topics": [1, 2], "min_score": 80, "skip_test_id": "uuid" }
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS unlock_condition JSONB DEFAULT '{"required_topics": [], "min_score": 0}'::jsonb;

-- Add order_index as alias for number (for consistency with subtopics)
-- We'll keep number for backward compatibility, but add order_index
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Populate order_index from number for existing records
UPDATE public.topics
SET order_index = number
WHERE order_index IS NULL;

-- Make order_index NOT NULL after populating
ALTER TABLE public.topics
ALTER COLUMN order_index SET NOT NULL;

-- Create index on order_index for faster sorting
CREATE INDEX IF NOT EXISTS idx_topics_order_index ON public.topics(order_index);

-- Add comment for documentation
COMMENT ON COLUMN public.topics.unlock_condition IS 'JSON object with unlock conditions: required_topics (array of topic numbers), min_score (integer), skip_test_id (UUID)';
COMMENT ON COLUMN public.topics.order_index IS 'Order of topic in learning map (same as number for backward compatibility)';

