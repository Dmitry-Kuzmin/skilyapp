-- ========================================
-- MIGRATION: Unified Schema for Multi-Country Support
-- Date: 2025-12-25
-- Author: Claude AI
-- Purpose: Add support for Russia and future countries
-- ========================================

-- ========================================
-- STEP 1: Add 'country' column to questions_new
-- Default 'es' for existing Spanish (DGT) questions
-- ========================================
ALTER TABLE public.questions_new 
ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'es';

-- Add comment for documentation
COMMENT ON COLUMN public.questions_new.country IS 'Country code: es=Spain, ru=Russia, de=Germany, etc.';

-- ========================================
-- STEP 2: Add 'metadata' JSONB column for country-specific data
-- This avoids creating new columns for each country
-- Examples:
--   Russia: {"ticket_number": 1, "ticket_question": 5, "pdd_article": "1.2"}
--   Germany: {"traffic_rule_ref": "StVO §5", "category": "B"}
-- ========================================
ALTER TABLE public.questions_new 
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.questions_new.metadata IS 'Country-specific metadata (ticket_number for Russia, traffic_rule_ref for Germany, etc.)';

-- ========================================
-- STEP 3: Relax Spain-specific constraints
-- Make topic_id NULLABLE (Russia questions don't have Spanish topics)
-- ========================================
ALTER TABLE public.questions_new 
ALTER COLUMN topic_id DROP NOT NULL;

-- Note: topic_id is already nullable in the original schema (line 42)
-- This is just for safety/documentation

-- ========================================
-- STEP 4: Make text columns NULLABLE for languages that may not be present
-- Russia questions may only have Russian text initially
-- ========================================
ALTER TABLE public.questions_new 
ALTER COLUMN question_es DROP NOT NULL;

ALTER TABLE public.questions_new 
ALTER COLUMN question_en DROP NOT NULL;

-- Keep question_ru as NOT NULL since all questions should have at least one language
-- (can be changed if needed)

-- Same for answer_options
ALTER TABLE public.answer_options 
ALTER COLUMN text_es DROP NOT NULL;

ALTER TABLE public.answer_options 
ALTER COLUMN text_en DROP NOT NULL;

-- ========================================
-- STEP 5: Create index on 'country' for fast filtering
-- ========================================
CREATE INDEX IF NOT EXISTS idx_questions_country 
ON public.questions_new(country);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_questions_country_topic 
ON public.questions_new(country, topic_id);

-- Index for metadata JSONB queries (GIN for flexibility)
CREATE INDEX IF NOT EXISTS idx_questions_metadata 
ON public.questions_new USING GIN (metadata);

-- ========================================
-- STEP 6: Create helper function to get questions by country
-- ========================================
CREATE OR REPLACE FUNCTION get_questions_by_country(
  p_country TEXT,
  p_limit INTEGER DEFAULT 30,
  p_topic_id UUID DEFAULT NULL
)
RETURNS SETOF public.questions_new
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.questions_new
  WHERE country = p_country
    AND (p_topic_id IS NULL OR topic_id = p_topic_id)
  ORDER BY RANDOM()
  LIMIT p_limit;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_questions_by_country TO authenticated, anon;

-- ========================================
-- STEP 7: Update existing questions to have country = 'es'
-- (Safety: in case any rows have NULL)
-- ========================================
UPDATE public.questions_new 
SET country = 'es' 
WHERE country IS NULL OR country = '';

-- ========================================
-- STEP 8: Create enum for countries (optional, for type safety)
-- Commented out to keep flexibility for now
-- ========================================
-- CREATE TYPE public.country_code AS ENUM ('es', 'ru', 'de', 'uk', 'us');
-- ALTER TABLE public.questions_new ALTER COLUMN country TYPE public.country_code USING country::public.country_code;

-- ========================================
-- VERIFICATION: Check migration success
-- ========================================
DO $$
DECLARE
  v_country_exists BOOLEAN;
  v_metadata_exists BOOLEAN;
BEGIN
  -- Check country column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions_new' 
    AND column_name = 'country'
  ) INTO v_country_exists;
  
  -- Check metadata column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions_new' 
    AND column_name = 'metadata'
  ) INTO v_metadata_exists;
  
  IF v_country_exists AND v_metadata_exists THEN
    RAISE NOTICE '✅ Migration successful! Both country and metadata columns exist.';
  ELSE
    RAISE EXCEPTION '❌ Migration failed! country=% metadata=%', v_country_exists, v_metadata_exists;
  END IF;
END $$;

-- ========================================
-- OUTPUT: Summary of changes
-- ========================================
-- 1. Added: questions_new.country (TEXT, default 'es')
-- 2. Added: questions_new.metadata (JSONB, default '{}')
-- 3. Relaxed: questions_new.question_es (now NULLABLE)
-- 4. Relaxed: questions_new.question_en (now NULLABLE)
-- 5. Relaxed: answer_options.text_es (now NULLABLE)
-- 6. Relaxed: answer_options.text_en (now NULLABLE)
-- 7. Added: idx_questions_country index
-- 8. Added: idx_questions_country_topic composite index
-- 9. Added: idx_questions_metadata GIN index
-- 10. Added: get_questions_by_country() function
-- ========================================
